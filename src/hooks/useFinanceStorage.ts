import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { EstadoFinanceiro, ItemLancamento, MetasRegra, CategoriaOrcamentaria } from '../types/finance';
import { ESTADO_INICIAL } from '../data/mockData';
import { calcularOrcamento } from '../utils/calculations';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  carregarDadosNuvem,
  migrarDadosLocaisParaNuvem,
  sincronizarPerfilNuvem,
  sincronizarItemNuvem,
  removerItemNuvem,
  inscreverTempoRealNuvem,
} from '../services/financeSyncService';

const STORAGE_KEY = 'gestor_financeiro_pwa_v1';

export type StatusSyncNuvem = 'conectado' | 'sincronizando' | 'offline' | 'local_only' | 'erro';

export function useFinanceStorage() {
  // 1. Estado financeiro com carregamento atômico local do localStorage (0ms latência)
  const [estado, setEstado] = useState<EstadoFinanceiro>(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (parsed.rendaFamiliar && Array.isArray(parsed.itens)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar dados do localStorage, utilizando padrão:', e);
    }
    return ESTADO_INICIAL;
  });

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [statusSync, setStatusSync] = useState<StatusSyncNuvem>(() => {
    if (!navigator.onLine) return 'offline';
    return isSupabaseConfigured() ? 'conectado' : 'local_only';
  });

  const estadoRef = useRef<EstadoFinanceiro>(estado);
  estadoRef.current = estado;

  // 2. Persistência atômica local em todo render (latência zero)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
    } catch (e) {
      console.error('Falha ao persistir no localStorage:', e);
    }
  }, [estado]);

  // 3. Sincronização automática com a Nuvem Supabase
  const sincronizarComNuvem = useCallback(async () => {
    if (!navigator.onLine || !isSupabaseConfigured()) {
      setStatusSync(navigator.onLine ? 'local_only' : 'offline');
      return;
    }

    try {
      setStatusSync('sincronizando');
      const resultado = await carregarDadosNuvem();

      if (resultado.encontrado && resultado.estado) {
        // Nuvem tem dados atualizados
        setEstado(resultado.estado);
        setStatusSync('conectado');
      } else {
        // Banco na nuvem vazio: migra automaticamente todo o estado local para a nuvem
        await migrarDadosLocaisParaNuvem(estadoRef.current);
        setStatusSync('conectado');
      }
    } catch (err) {
      console.error('Erro na sincronização automática:', err);
      setStatusSync('erro');
    }
  }, []);

  // 4. Inicialização automática ao abrir o app
  useEffect(() => {
    if (isSupabaseConfigured() && navigator.onLine) {
      sincronizarComNuvem();
    }
  }, [sincronizarComNuvem]);

  // 5. Monitoramento de conectividade: Ao voltar a ficar online, SALVA TUDO AUTOMATICAMENTE!
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (isSupabaseConfigured()) {
        setStatusSync('sincronizando');
        // Salva tudo automaticamente na nuvem sem precisar apertar botão
        migrarDadosLocaisParaNuvem(estadoRef.current).then(() => {
          sincronizarComNuvem();
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatusSync('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sincronizarComNuvem]);

  // 6. Escuta de atualizações em tempo real (Realtime Sync multi-dispositivo)
  useEffect(() => {
    if (!isSupabaseConfigured() || !isOnline) return;

    const cancelarInscricao = inscreverTempoRealNuvem(() => {
      carregarDadosNuvem().then((res) => {
        if (res.encontrado && res.estado) {
          setEstado(res.estado);
        }
      });
    });

    return () => {
      cancelarInscricao();
    };
  }, [isOnline]);

  // Cálculos orçamentários memorizados
  const calculos = useMemo(() => calcularOrcamento(estado), [estado]);

  // ==========================================
  // Mutações Locais com Auto-Sync em Nuvem
  // ==========================================

  const adicionarItem = (novoItem: Omit<ItemLancamento, 'id'>) => {
    const itemCompleto: ItemLancamento = {
      ...novoItem,
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };

    setEstado((prev) => ({
      ...prev,
      itens: [itemCompleto, ...prev.itens],
    }));

    if (isOnline && isSupabaseConfigured()) {
      sincronizarItemNuvem(itemCompleto);
    }
  };

  const atualizarItem = (id: string, updates: Partial<ItemLancamento>) => {
    let itemAtualizado: ItemLancamento | null = null;

    setEstado((prev) => {
      const novosItens = prev.itens.map((item) => {
        if (item.id === id) {
          const at = { ...item, ...updates };
          itemAtualizado = at;
          return at;
        }
        return item;
      });
      return { ...prev, itens: novosItens };
    });

    if (isOnline && isSupabaseConfigured() && itemAtualizado) {
      sincronizarItemNuvem(itemAtualizado);
    }
  };

  const removerItem = (id: string) => {
    setEstado((prev) => ({
      ...prev,
      itens: prev.itens.filter((item) => item.id !== id),
    }));

    if (isOnline && isSupabaseConfigured()) {
      removerItemNuvem(id);
    }
  };

  const alternarPago = (id: string) => {
    let itemAtualizado: ItemLancamento | null = null;

    setEstado((prev) => {
      const novosItens = prev.itens.map((item) => {
        if (item.id === id) {
          const at = { ...item, pago: !item.pago };
          itemAtualizado = at;
          return at;
        }
        return item;
      });
      return { ...prev, itens: novosItens };
    });

    if (isOnline && isSupabaseConfigured() && itemAtualizado) {
      sincronizarItemNuvem(itemAtualizado);
    }
  };

  const atualizarRenda = (novaRenda: number) => {
    const valorValido = Math.max(0, novaRenda);

    setEstado((prev) => {
      const novoEstado = { ...prev, rendaFamiliar: valorValido };
      if (isOnline && isSupabaseConfigured()) {
        sincronizarPerfilNuvem(valorValido, prev.metasRegra);
      }
      return novoEstado;
    });
  };

  const atualizarMetas = (novasMetas: Partial<MetasRegra>) => {
    setEstado((prev) => {
      const metasAtualizadas = { ...prev.metasRegra, ...novasMetas };
      const novoEstado = { ...prev, metasRegra: metasAtualizadas };
      if (isOnline && isSupabaseConfigured()) {
        sincronizarPerfilNuvem(prev.rendaFamiliar, metasAtualizadas);
      }
      return novoEstado;
    });
  };

  const ajustarTotalPilar = (categoria: CategoriaOrcamentaria, novoTotalDesejado: number) => {
    setEstado((prev) => {
      const itensDoPilar = prev.itens.filter((it) => it.categoria === categoria);
      const totalAtual = itensDoPilar.reduce((acc, it) => acc + it.valor, 0);
      const diferenca = Math.round((novoTotalDesejado - totalAtual) * 100) / 100;

      if (Math.abs(diferenca) < 0.01) return prev;

      let novoEstado = prev;

      if (diferenca > 0) {
        const itemAjuste = itensDoPilar.find((it) => it.tipoDetalhado === 'Ajuste');
        if (itemAjuste) {
          novoEstado = {
            ...prev,
            itens: prev.itens.map((it) =>
              it.id === itemAjuste.id ? { ...it, valor: it.valor + diferenca } : it
            ),
          };
        } else {
          const novoItem: ItemLancamento = {
            id: `item_ajuste_${Date.now()}`,
            titulo: 'Ajuste Direto',
            categoria,
            tipoDetalhado: 'Ajuste',
            valor: diferenca,
            vencimento: 'Dia 10',
            pago: true,
          };
          novoEstado = {
            ...prev,
            itens: [novoItem, ...prev.itens],
          };
        }
      } else {
        if (novoTotalDesejado <= 0) {
          novoEstado = {
            ...prev,
            itens: prev.itens.filter((it) => it.categoria !== categoria),
          };
        } else {
          const fator = novoTotalDesejado / (totalAtual || 1);
          novoEstado = {
            ...prev,
            itens: prev.itens.map((it) => {
              if (it.categoria === categoria) {
                return { ...it, valor: Math.round(it.valor * fator * 100) / 100 };
              }
              return it;
            }),
          };
        }
      }

      if (isOnline && isSupabaseConfigured()) {
        migrarDadosLocaisParaNuvem(novoEstado);
      }

      return novoEstado;
    });
  };

  const ajustarTetoPilar = (categoria: CategoriaOrcamentaria, novoTetoReais: number) => {
    const renda = estado.rendaFamiliar || 1;
    const novoPercent = Math.max(0.1, Math.min(100, Math.round((novoTetoReais / renda) * 1000) / 10));
    atualizarMetas({ [categoria]: novoPercent });
  };

  const ajustarTotalGeral = (novoTotalGeralDesejado: number) => {
    setEstado((prev) => {
      const totalAtual = prev.itens.reduce((acc, it) => acc + it.valor, 0);
      if (totalAtual === 0 || novoTotalGeralDesejado <= 0) return prev;
      const fator = novoTotalGeralDesejado / totalAtual;
      const novoEstado = {
        ...prev,
        itens: prev.itens.map((it) => ({
          ...it,
          valor: Math.round(it.valor * fator * 100) / 100,
        })),
      };

      if (isOnline && isSupabaseConfigured()) {
        migrarDadosLocaisParaNuvem(novoEstado);
      }

      return novoEstado;
    });
  };

  const redefinirDadosPadrao = () => {
    setEstado(ESTADO_INICIAL);
    if (isOnline && isSupabaseConfigured()) {
      migrarDadosLocaisParaNuvem(ESTADO_INICIAL);
    }
  };

  const forcarSincronizacao = async () => {
    setStatusSync('sincronizando');
    await migrarDadosLocaisParaNuvem(estadoRef.current);
    await sincronizarComNuvem();
  };

  return {
    estado,
    calculos,
    isOnline,
    statusSync,
    forcarSincronizacao,
    adicionarItem,
    atualizarItem,
    removerItem,
    alternarPago,
    atualizarRenda,
    atualizarMetas,
    ajustarTotalPilar,
    ajustarTetoPilar,
    ajustarTotalGeral,
    redefinirDadosPadrao,
  };
}
