import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import type { EstadoFinanceiro, ItemLancamento, MetasRegra, CategoriaOrcamentaria } from '../types/finance';
import { ESTADO_INICIAL } from '../data/mockData';
import { calcularOrcamento } from '../utils/calculations';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
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
  // 1. Estado financeiro com carregamento atômico local do localStorage
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
  const [usuario, setUsuario] = useState<User | null>(null);
  const [statusSync, setStatusSync] = useState<StatusSyncNuvem>(() => {
    if (!navigator.onLine) return 'offline';
    return isSupabaseConfigured() ? 'sincronizando' : 'local_only';
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

  // 3. Monitoramento de conectividade offline/online
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (usuario) {
        setStatusSync('sincronizando');
        sincronizarComNuvem(usuario.id);
      } else {
        setStatusSync(isSupabaseConfigured() ? 'local_only' : 'local_only');
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
  }, [usuario]);

  // 4. Sincronização e carregamento com a Nuvem Supabase
  const sincronizarComNuvem = useCallback(async (userId: string) => {
    if (!navigator.onLine) {
      setStatusSync('offline');
      return;
    }

    try {
      setStatusSync('sincronizando');
      const resultado = await carregarDadosNuvem(userId);

      if (resultado.encontrado && resultado.estado) {
        // Nuvem tem dados atualizados
        setEstado(resultado.estado);
        setStatusSync('conectado');
      } else {
        // Primeira vez do usuário na nuvem: migra os dados locais existentes
        await migrarDadosLocaisParaNuvem(userId, estadoRef.current);
        setStatusSync('conectado');
      }
    } catch (err) {
      console.error('Erro ao sincronizar com nuvem:', err);
      setStatusSync('erro');
    }
  }, []);

  // 5. Inicialização e escuta da sessão do Supabase
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setStatusSync(navigator.onLine ? 'local_only' : 'offline');
      setUsuario(null);
      return;
    }

    // Obter usuário logado atual
    client.auth.getUser().then(({ data: { user } }) => {
      setUsuario(user);
      if (user) {
        sincronizarComNuvem(user.id);
      } else {
        setStatusSync(navigator.onLine ? 'local_only' : 'offline');
      }
    });

    // Escutar alterações de autenticação (login, logout, refresh)
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      const novoUsuario = session?.user ?? null;
      setUsuario(novoUsuario);

      if (novoUsuario) {
        sincronizarComNuvem(novoUsuario.id);
      } else {
        setStatusSync(navigator.onLine ? 'local_only' : 'offline');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [sincronizarComNuvem]);

  // 6. Escuta de atualizações em tempo real (Realtime Sync multi-dispositivo)
  useEffect(() => {
    if (!usuario || !isOnline) return;

    const cancelarInscricao = inscreverTempoRealNuvem(usuario.id, () => {
      // Recarrega silenciosamente os dados atualizados
      carregarDadosNuvem(usuario.id).then((res) => {
        if (res.encontrado && res.estado) {
          setEstado(res.estado);
        }
      });
    });

    return () => {
      cancelarInscricao();
    };
  }, [usuario, isOnline]);

  // Cálculos orçamentários memorizados
  const calculos = useMemo(() => calcularOrcamento(estado), [estado]);

  // ==========================================
  // Mutações Locais com Sincronização em Nuvem
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

    if (usuario && isOnline) {
      sincronizarItemNuvem(usuario.id, itemCompleto);
    }
  };

  const atualizarItem = (id: string, updates: Partial<ItemLancamento>) => {
    let itemAtualizadoParaNuvem: ItemLancamento | null = null;

    setEstado((prev) => {
      const novosItens = prev.itens.map((item) => {
        if (item.id === id) {
          const atualizado = { ...item, ...updates };
          itemAtualizadoParaNuvem = atualizado;
          return atualizado;
        }
        return item;
      });
      return { ...prev, itens: novosItens };
    });

    if (usuario && isOnline && itemAtualizadoParaNuvem) {
      sincronizarItemNuvem(usuario.id, itemAtualizadoParaNuvem);
    }
  };

  const removerItem = (id: string) => {
    setEstado((prev) => ({
      ...prev,
      itens: prev.itens.filter((item) => item.id !== id),
    }));

    if (usuario && isOnline) {
      removerItemNuvem(usuario.id, id);
    }
  };

  const alternarPago = (id: string) => {
    let itemAtualizadoParaNuvem: ItemLancamento | null = null;

    setEstado((prev) => {
      const novosItens = prev.itens.map((item) => {
        if (item.id === id) {
          const atualizado = { ...item, pago: !item.pago };
          itemAtualizadoParaNuvem = atualizado;
          return atualizado;
        }
        return item;
      });
      return { ...prev, itens: novosItens };
    });

    if (usuario && isOnline && itemAtualizadoParaNuvem) {
      sincronizarItemNuvem(usuario.id, itemAtualizadoParaNuvem);
    }
  };

  const atualizarRenda = (novaRenda: number) => {
    const valorValido = Math.max(0, novaRenda);

    setEstado((prev) => {
      const novoEstado = { ...prev, rendaFamiliar: valorValido };
      if (usuario && isOnline) {
        sincronizarPerfilNuvem(usuario.id, valorValido, prev.metasRegra);
      }
      return novoEstado;
    });
  };

  const atualizarMetas = (novasMetas: Partial<MetasRegra>) => {
    setEstado((prev) => {
      const metasAtualizadas = { ...prev.metasRegra, ...novasMetas };
      const novoEstado = { ...prev, metasRegra: metasAtualizadas };
      if (usuario && isOnline) {
        sincronizarPerfilNuvem(usuario.id, prev.rendaFamiliar, metasAtualizadas);
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

      if (usuario && isOnline) {
        migrarDadosLocaisParaNuvem(usuario.id, novoEstado);
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

      if (usuario && isOnline) {
        migrarDadosLocaisParaNuvem(usuario.id, novoEstado);
      }

      return novoEstado;
    });
  };

  const redefinirDadosPadrao = () => {
    setEstado(ESTADO_INICIAL);
    if (usuario && isOnline) {
      migrarDadosLocaisParaNuvem(usuario.id, ESTADO_INICIAL);
    }
  };

  const forcarSincronizacao = () => {
    if (usuario) {
      sincronizarComNuvem(usuario.id);
    }
  };

  return {
    estado,
    calculos,
    isOnline,
    statusSync,
    usuario,
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
