import { useState, useEffect, useMemo, useRef } from 'react';
import type { ItemLancamento, CategoriaOrcamentaria } from '../types/finance';
import { formatarBRL, CATEGORIAS_CONFIG, parseMoedaBR } from '../utils/calculations';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Calendar as CalendarIcon, 
  Check, 
  Clock, 
  Plus, 
  Trash2, 
  X, 
  CalendarCheck2,
  MessageSquare,
  Filter
} from 'lucide-react';
import { 
  dispararWhatsApp, 
  gerarMensagemWhatsAppIndividual, 
  gerarMensagemWhatsAppDia 
} from '../services/whatsappReminderService';

interface Props {
  itens: ItemLancamento[];
  rendaFamiliar: number;
  onAdicionarItem: (item: Omit<ItemLancamento, 'id'>) => void;
  onAtualizarItem: (id: string, updates: Partial<ItemLancamento>) => void;
  onRemoverItem: (id: string) => void;
  onAlternarPago: (id: string) => void;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

/**
 * Extrai o dia numérico do vencimento e valida pertinência ao mês e ano selecionados
 */
function extrairDiaDoVencimento(vencimento: string, ano: number, mes: number): number | null {
  if (!vencimento) return null;
  const v = vencimento.trim();
  const vLower = v.toLowerCase();

  // Se não foi definido dia ou foi marcado como a definir / sem vencimento / fatura cartão, ignora
  if (
    vLower === 'a definir' ||
    vLower === 'sem vencimento' ||
    vLower === 'indefinido' ||
    vLower === 'não informado' ||
    vLower === 'nao informado' ||
    vLower === 'fatura cartão' ||
    vLower === 'fatura cartao'
  ) {
    return null;
  }

  // 1. Formato ISO: YYYY-MM-DD
  const matchIso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    const itemAno = parseInt(matchIso[1], 10);
    const itemMes = parseInt(matchIso[2], 10) - 1; // 0-indexed
    const itemDia = parseInt(matchIso[3], 10);
    if (itemAno === ano && itemMes === mes) {
      return itemDia;
    }
    return null;
  }

  // 2. Formato Brasileiro completo: DD/MM/YYYY
  const matchBr = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (matchBr) {
    const itemDia = parseInt(matchBr[1], 10);
    const itemMes = parseInt(matchBr[2], 10) - 1;
    const itemAno = parseInt(matchBr[3], 10);
    if (itemAno === ano && itemMes === mes) {
      return itemDia;
    }
    return null;
  }

  // 3. Formato recorrente com palavra "Dia" explícita: "Dia 10", "Dia 15", "Dia 05"
  const matchDiaPrefixo = v.match(/^dia\s*0?([1-9]|[12]\d|3[01])$/i) || v.match(/\bdia\s*0?([1-9]|[12]\d|3[01])\b/i);
  if (matchDiaPrefixo) {
    return parseInt(matchDiaPrefixo[1], 10);
  }

  // 4. Apenas o número puro do dia (ex: "10", "5")
  const matchApenasDia = v.match(/^0?([1-9]|[12]\d|3[01])$/);
  if (matchApenasDia) {
    return parseInt(matchApenasDia[1], 10);
  }

  return null;
}

export const CalendarioPlanejamentoMensal = ({
  itens,
  rendaFamiliar,
  onAdicionarItem,
  onRemoverItem,
  onAlternarPago,
}: Props) => {
  const hoje = new Date();
  const [dataVisualizada, setDataVisualizada] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(hoje.getDate());
  const [filtroPilar, setFiltroPilar] = useState<CategoriaOrcamentaria | 'todos'>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendentes' | 'pagos'>('todos');

  // Formulário de agendamento rápido no dia
  const [mostrandoAgendamento, setMostrandoAgendamento] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaCategoria, setNovaCategoria] = useState<CategoriaOrcamentaria>('fixas');
  const [novoTipo, setNovoTipo] = useState('Moradia');

  const painelDiaRef = useRef<HTMLDivElement>(null);
  const [modalDiaAberto, setModalDiaAberto] = useState(false);
  const [menuFiltrosMobileAberto, setMenuFiltrosMobileAberto] = useState(false);

  const rotuloPilarAtual = useMemo(() => {
    if (filtroPilar === 'fixas') return 'Fixas (50%)';
    if (filtroPilar === 'superfluos') return 'Supérfluos (30%)';
    if (filtroPilar === 'investimentos') return 'Aportes (20%)';
    return 'Todos os Pilares';
  }, [filtroPilar]);

  const rotuloStatusAtual = useMemo(() => {
    if (filtroStatus === 'pendentes') return 'A Pagar';
    if (filtroStatus === 'pagos') return 'Pago';
    return 'Tudo';
  }, [filtroStatus]);

  const temFiltroAtivo = filtroPilar !== 'todos' || filtroStatus !== 'todos';

  const ano = dataVisualizada.getFullYear();
  const mes = dataVisualizada.getMonth();

  // Fecha o modal ao pressionar tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalDiaAberto) {
        setModalDiaAberto(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalDiaAberto]);

  // Seleciona um dia: quando tiver despesa, abre imediatamente na tela o modal com as despesas
  const handleSelecionarDia = (dia: number) => {
    setDiaSelecionado(dia);
    const itens = mapaItensPorDia.get(dia) || [];
    if (itens.length > 0) {
      setModalDiaAberto(true);
    } else if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTimeout(() => {
        painelDiaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    }
  };

  // Dias do mês e offset do primeiro dia da semana
  const totalDiasNoMes = new Date(ano, mes + 1, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay(); // 0 = Domingo

  // Navegação de meses
  const irParaMesAnterior = () => {
    setDataVisualizada(new Date(ano, mes - 1, 1));
    setDiaSelecionado(null);
  };

  const irParaProximoMes = () => {
    setDataVisualizada(new Date(ano, mes + 1, 1));
    setDiaSelecionado(null);
  };

  const voltarParaHoje = () => {
    const agora = new Date();
    setDataVisualizada(agora);
    setDiaSelecionado(agora.getDate());
  };

  // Mapeamento dos itens do mês por dia
  const mapaItensPorDia = useMemo(() => {
    const mapa = new Map<number, ItemLancamento[]>();
    for (let d = 1; d <= totalDiasNoMes; d++) {
      mapa.set(d, []);
    }

    for (const item of itens) {
      const dia = extrairDiaDoVencimento(item.vencimento, ano, mes);
      if (dia && dia >= 1 && dia <= totalDiasNoMes) {
        mapa.get(dia)?.push(item);
      }
    }

    return mapa;
  }, [itens, ano, mes, totalDiasNoMes]);

  // Cálculos do mês selecionado
  const estatisticasMes = useMemo(() => {
    let totalPrevisto = 0;
    let totalPago = 0;
    let totalPendente = 0;
    let diaComMaiorVolume = 1;
    let maiorVolume = 0;

    for (let d = 1; d <= totalDiasNoMes; d++) {
      const lista = mapaItensPorDia.get(d) || [];
      const somaDia = lista.reduce((acc, it) => acc + it.valor, 0);

      totalPrevisto += somaDia;
      for (const it of lista) {
        if (it.pago) totalPago += it.valor;
        else totalPendente += it.valor;
      }

      if (somaDia > maiorVolume) {
        maiorVolume = somaDia;
        diaComMaiorVolume = d;
      }
    }

    return {
      totalPrevisto,
      totalPago,
      totalPendente,
      diaComMaiorVolume,
      maiorVolume,
    };
  }, [mapaItensPorDia, totalDiasNoMes]);

  // Itens do dia selecionado com filtros aplicados
  const itensDoDiaSelecionado = useMemo(() => {
    if (!diaSelecionado) return [];
    let lista = mapaItensPorDia.get(diaSelecionado) || [];

    if (filtroPilar !== 'todos') {
      lista = lista.filter((it) => it.categoria === filtroPilar);
    }
    if (filtroStatus === 'pagos') {
      lista = lista.filter((it) => it.pago);
    } else if (filtroStatus === 'pendentes') {
      lista = lista.filter((it) => !it.pago);
    }

    return lista;
  }, [diaSelecionado, mapaItensPorDia, filtroPilar, filtroStatus]);

  // Total monetário do dia selecionado
  const totalDiaSelecionado = useMemo(() => {
    return itensDoDiaSelecionado.reduce((acc, it) => acc + it.valor, 0);
  }, [itensDoDiaSelecionado]);

  // Salvar novo compromisso para o dia selecionado
  const handleSalvarAgendamento = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseMoedaBR(novoValor);
    if (!novoTitulo.trim() || val <= 0 || !diaSelecionado) return;

    onAdicionarItem({
      titulo: novoTitulo.trim(),
      categoria: novaCategoria,
      tipoDetalhado: novoTipo,
      valor: val,
      vencimento: `Dia ${diaSelecionado.toString().padStart(2, '0')}`,
      pago: false,
    });

    setNovoTitulo('');
    setNovoValor('');
    setMostrandoAgendamento(false);
  };

  const ehHoje = (dia: number) => {
    return (
      hoje.getDate() === dia &&
      hoje.getMonth() === mes &&
      hoje.getFullYear() === ano
    );
  };

  return (
    <section id="calendario" className="flex flex-col gap-6 scroll-mt-20">
      {/* 1. Header do Painel de Calendário: Factory Terminal Frame */}
      <div className="bg-[#101010] border border-[#3d3a39] rounded-[10px] overflow-hidden flex flex-col">
        {/* Terminal Header */}
        <div className="h-9 bg-[#161413] border-b border-[#3d3a39] px-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
            </div>
            <span className="sm:ml-2 font-mono text-[11px] uppercase tracking-[-0.24px] text-[#eeeeee] flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-[#ee6018]" />
              CALENDAR // MONTHLY_PLANNING.SYS
            </span>
          </div>

          {/* Navegação de Mês */}
          <div className="flex items-center gap-2 font-mono">
            <button
              onClick={irParaMesAnterior}
              className="p-1 rounded-[3px] text-[#8a8380] hover:text-[#eeeeee] hover:bg-[#1d1a18] transition cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs uppercase tracking-tight text-[#fafafa] font-medium min-w-[130px] text-center">
              {MESES[mes]} {ano}
            </span>

            <button
              onClick={irParaProximoMes}
              className="p-1 rounded-[3px] text-[#8a8380] hover:text-[#eeeeee] hover:bg-[#1d1a18] transition cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={voltarParaHoje}
              className="ml-2 px-2 py-0.5 rounded-[3px] bg-[#1d1a18] border border-[#3d3a39] hover:border-[#fafafa] text-[10px] uppercase text-[#8a8380] hover:text-[#eeeeee] transition cursor-pointer"
              title="Voltar para o dia e mês atuais"
            >
              Hoje
            </button>
          </div>
        </div>

        {/* 2. KPIs de Planejamento do Mês (Factory 4-Tile Row with Hairline Dividers) */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-[#3d3a39] bg-[#101010]">
          {/* Card 1: Previsto */}
          <div className="p-4 border-r border-b md:border-b-0 border-[#3d3a39]">
            <span className="font-mono text-[11px] uppercase text-[#8a8380] tracking-[-0.24px] block mb-1">
              TOTAL PREVISTO NO MÊS
            </span>
            <span className="text-xl md:text-2xl font-normal text-[#eeeeee] tracking-tight block">
              {formatarBRL(estatisticasMes.totalPrevisto)}
            </span>
            <span className="text-[10px] font-mono text-[#8a8380] block mt-0.5">
              {rendaFamiliar > 0 ? `${((estatisticasMes.totalPrevisto / rendaFamiliar) * 100).toFixed(1)}% da renda` : 'Renda zerada'}
            </span>
          </div>

          {/* Card 2: Quitado */}
          <div className="p-4 border-b md:border-b-0 md:border-r border-[#3d3a39]">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[11px] uppercase text-[#8a8380] tracking-[-0.24px]">
                QUITADO / PAGO
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92]" />
            </div>
            <span className="text-xl md:text-2xl font-normal text-[#a0ca92] tracking-tight block">
              {formatarBRL(estatisticasMes.totalPago)}
            </span>
            <span className="text-[10px] font-mono text-[#8a8380] block mt-0.5">
              {estatisticasMes.totalPrevisto > 0
                ? `${((estatisticasMes.totalPago / estatisticasMes.totalPrevisto) * 100).toFixed(0)}% liquidado`
                : 'Nenhum lançamento'}
            </span>
          </div>

          {/* Card 3: A Vencer */}
          <div className="p-4 border-r border-[#3d3a39]">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[11px] uppercase text-[#8a8380] tracking-[-0.24px]">
                PENDENTE A VENCER
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#ee6018]" />
            </div>
            <span className="text-xl md:text-2xl font-normal text-[#ee6018] tracking-tight block">
              {formatarBRL(estatisticasMes.totalPendente)}
            </span>
            <span className="text-[10px] font-mono text-[#8a8380] block mt-0.5">
              Compromissos em aberto
            </span>
          </div>

          {/* Card 4: Pico do Mês */}
          <div className="p-4">
            <span className="font-mono text-[11px] uppercase text-[#8a8380] tracking-[-0.24px] block mb-1">
              PICO DE VENCIMENTOS
            </span>
            <span className="text-xl md:text-2xl font-normal text-[#fafafa] tracking-tight block">
              Dia {estatisticasMes.diaComMaiorVolume.toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] font-mono text-[#8a8380] block mt-0.5">
              {estatisticasMes.maiorVolume > 0 ? formatarBRL(estatisticasMes.maiorVolume) : 'Sem concentração'}
            </span>
          </div>
        </div>

        {/* 3. Filtros do Calendário (Menu no Mobile e Barra de Botões no Desktop) */}
        <div className="border-b border-[#3d3a39] bg-[#161413] select-none font-mono">
          {/* 3.1 Mobile (< sm): Menu de Filtros Expansível */}
          <div className="sm:hidden px-2.5 py-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMenuFiltrosMobileAberto(!menuFiltrosMobileAberto)}
              className="flex-1 flex items-center justify-between px-3 py-2 rounded-[3px] bg-[#1d1a18] border border-[#3d3a39] hover:border-[#fafafa] text-[#eeeeee] text-xs uppercase tracking-tight transition-colors cursor-pointer"
              title="Abrir menu de filtros do calendário"
            >
              <div className="flex items-center gap-2 truncate">
                <Filter className="w-3.5 h-3.5 text-[#ee6018] shrink-0" />
                <span className="text-[#8a8380] text-[11px]">Menu:</span>
                <span className="text-[#fafafa] font-medium text-[11px] truncate">
                  {rotuloPilarAtual} • {rotuloStatusAtual}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {temFiltroAtivo && (
                  <span className="w-2 h-2 rounded-full bg-[#ee6018]" title="Filtro ativo" />
                )}
                <ChevronDown className={`w-4 h-4 text-[#8a8380] transition-transform duration-200 ${menuFiltrosMobileAberto ? 'rotate-180 text-[#fafafa]' : ''}`} />
              </div>
            </button>

            {temFiltroAtivo && (
              <button
                type="button"
                onClick={() => {
                  setFiltroPilar('todos');
                  setFiltroStatus('todos');
                }}
                className="h-[34px] px-2.5 rounded-[3px] bg-[#1d1a18] border border-[#ee6018]/50 text-[#ee6018] text-[10px] uppercase font-mono tracking-tight shrink-0 flex items-center justify-center hover:bg-[#ee6018]/15 cursor-pointer transition"
                title="Limpar todos os filtros"
              >
                Limpar
              </button>
            )}
          </div>

          {/* 3.2 Painel do Menu de Filtros Mobile (Aberto) */}
          {menuFiltrosMobileAberto && (
            <div className="sm:hidden px-3.5 py-3 border-t border-[#3d3a39] bg-[#121110] flex flex-col gap-3.5 animate-fadeIn">
              {/* Seção Pilar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[#8a8380] uppercase tracking-wider block font-medium">
                    Pilar Orçamentário (50-30-20):
                  </span>
                  {filtroPilar !== 'todos' && (
                    <button
                      type="button"
                      onClick={() => setFiltroPilar('todos')}
                      className="text-[10px] text-[#ee6018] hover:underline cursor-pointer"
                    >
                      Resetar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFiltroPilar('todos')}
                    className={`px-2.5 py-2 rounded-[3px] border text-xs uppercase tracking-tight text-center transition cursor-pointer ${
                      filtroPilar === 'todos'
                        ? 'bg-[#fafafa] text-[#101010] border-[#fafafa] font-medium'
                        : 'bg-[#1d1a18] text-[#8a8380] border-[#3d3a39] hover:border-[#8a8380]'
                    }`}
                  >
                    Todos os Pilares
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroPilar('fixas')}
                    className={`px-2.5 py-2 rounded-[3px] border text-xs uppercase tracking-tight text-center transition cursor-pointer ${
                      filtroPilar === 'fixas'
                        ? 'bg-[#eeeeee] text-[#101010] border-[#eeeeee] font-medium'
                        : 'bg-[#1d1a18] text-[#8a8380] border-[#3d3a39] hover:border-[#8a8380]'
                    }`}
                  >
                    Fixas (50%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroPilar('superfluos')}
                    className={`px-2.5 py-2 rounded-[3px] border text-xs uppercase tracking-tight text-center transition cursor-pointer ${
                      filtroPilar === 'superfluos'
                        ? 'bg-[#ee6018] text-[#101010] border-[#ee6018] font-medium'
                        : 'bg-[#1d1a18] text-[#8a8380] border-[#3d3a39] hover:border-[#8a8380]'
                    }`}
                  >
                    Supérfluos (30%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroPilar('investimentos')}
                    className={`px-2.5 py-2 rounded-[3px] border text-xs uppercase tracking-tight text-center transition cursor-pointer ${
                      filtroPilar === 'investimentos'
                        ? 'bg-[#a0ca92] text-[#101010] border-[#a0ca92] font-medium'
                        : 'bg-[#1d1a18] text-[#8a8380] border-[#3d3a39] hover:border-[#8a8380]'
                    }`}
                  >
                    Aportes (20%)
                  </button>
                </div>
              </div>

              {/* Seção Status */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[#8a8380] uppercase tracking-wider block font-medium">
                    Status de Pagamento:
                  </span>
                  {filtroStatus !== 'todos' && (
                    <button
                      type="button"
                      onClick={() => setFiltroStatus('todos')}
                      className="text-[10px] text-[#ee6018] hover:underline cursor-pointer"
                    >
                      Resetar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFiltroStatus('todos')}
                    className={`px-2 py-2 rounded-[3px] border text-xs uppercase tracking-tight text-center transition cursor-pointer ${
                      filtroStatus === 'todos'
                        ? 'bg-[#fafafa] text-[#101010] border-[#fafafa] font-medium'
                        : 'bg-[#1d1a18] text-[#8a8380] border-[#3d3a39] hover:border-[#8a8380]'
                    }`}
                  >
                    Tudo
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroStatus('pendentes')}
                    className={`px-2 py-2 rounded-[3px] border text-xs uppercase tracking-tight text-center transition cursor-pointer ${
                      filtroStatus === 'pendentes'
                        ? 'bg-[#ee6018] text-[#101010] border-[#ee6018] font-medium'
                        : 'bg-[#1d1a18] text-[#8a8380] border-[#3d3a39] hover:border-[#8a8380]'
                    }`}
                  >
                    A Pagar
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroStatus('pagos')}
                    className={`px-2 py-2 rounded-[3px] border text-xs uppercase tracking-tight text-center transition cursor-pointer ${
                      filtroStatus === 'pagos'
                        ? 'bg-[#a0ca92] text-[#101010] border-[#a0ca92] font-medium'
                        : 'bg-[#1d1a18] text-[#8a8380] border-[#3d3a39] hover:border-[#8a8380]'
                    }`}
                  >
                    Pago
                  </button>
                </div>
              </div>

              {/* Rodapé do Menu */}
              <div className="pt-2 border-t border-[#1d1a18] flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setFiltroPilar('todos');
                    setFiltroStatus('todos');
                  }}
                  className="text-[#8a8380] hover:text-[#eeeeee] cursor-pointer text-[11px] underline"
                >
                  Limpar Filtros
                </button>
                <button
                  type="button"
                  onClick={() => setMenuFiltrosMobileAberto(false)}
                  className="px-3 py-1 rounded-[3px] bg-[#fafafa] text-[#101010] font-medium text-[11px] uppercase tracking-tight cursor-pointer"
                >
                  Fechar Menu
                </button>
              </div>
            </div>
          )}

          {/* 3.3 Desktop (>= sm): Barra Horizontal de Botões Rápidos */}
          <div className="hidden sm:flex px-6 py-2.5 sm:py-3 items-center justify-start gap-2.5 text-xs overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-[#8a8380] uppercase mr-1 whitespace-nowrap">Filtrar:</span>
              <button
                onClick={() => setFiltroPilar('todos')}
                className={`px-2 py-0.5 rounded-[3px] border transition whitespace-nowrap cursor-pointer ${
                  filtroPilar === 'todos' 
                    ? 'bg-[#fafafa] text-[#101010] border-[#fafafa]' 
                    : 'bg-transparent text-[#8a8380] border-[#3d3a39] hover:border-[#8a8380]'
                }`}
              >
                TODOS
              </button>
              <button
                onClick={() => setFiltroPilar('fixas')}
                className={`px-2 py-0.5 rounded-[3px] border transition whitespace-nowrap cursor-pointer ${
                  filtroPilar === 'fixas' 
                    ? 'bg-[#eeeeee] text-[#101010] border-[#eeeeee]' 
                    : 'bg-transparent text-[#8a8380] border-[#3d3a39] hover:border-[#8a8380]'
                }`}
              >
                FIXAS
              </button>
              <button
                onClick={() => setFiltroPilar('superfluos')}
                className={`px-2 py-0.5 rounded-[3px] border transition whitespace-nowrap cursor-pointer ${
                  filtroPilar === 'superfluos' 
                    ? 'bg-[#ee6018] text-[#101010] border-[#ee6018]' 
                    : 'bg-transparent text-[#8a8380] border-[#3d3a39] hover:border-[#8a8380]'
                }`}
              >
                SUPÉRFLUOS
              </button>
              <button
                onClick={() => setFiltroPilar('investimentos')}
                className={`px-2 py-0.5 rounded-[3px] border transition whitespace-nowrap cursor-pointer ${
                  filtroPilar === 'investimentos' 
                    ? 'bg-[#a0ca92] text-[#101010] border-[#a0ca92]' 
                    : 'bg-transparent text-[#8a8380] border-[#3d3a39] hover:border-[#8a8380]'
                }`}
              >
                APORTES
              </button>
            </div>

            {/* Divisor vertical */}
            <div className="h-4 w-px bg-[#3d3a39] shrink-0 mx-1" />

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setFiltroStatus('todos')}
                className={`px-2 py-0.5 rounded-[3px] border transition whitespace-nowrap cursor-pointer ${
                  filtroStatus === 'todos' 
                    ? 'bg-[#1d1a18] text-[#eeeeee] border-[#fafafa]' 
                    : 'bg-transparent text-[#8a8380] border-[#3d3a39]'
                }`}
              >
                TUDO
              </button>
              <button
                onClick={() => setFiltroStatus('pendentes')}
                className={`px-2 py-0.5 rounded-[3px] border transition whitespace-nowrap cursor-pointer ${
                  filtroStatus === 'pendentes' 
                    ? 'bg-[#ee6018]/10 text-[#ee6018] border-[#ee6018]' 
                    : 'bg-transparent text-[#8a8380] border-[#3d3a39]'
                }`}
              >
                A PAGAR
              </button>
              <button
                onClick={() => setFiltroStatus('pagos')}
                className={`px-2 py-0.5 rounded-[3px] border transition whitespace-nowrap cursor-pointer ${
                  filtroStatus === 'pagos' 
                    ? 'bg-[#a0ca92]/10 text-[#a0ca92] border-[#a0ca92]' 
                    : 'bg-transparent text-[#8a8380] border-[#3d3a39]'
                }`}
              >
                PAGO
              </button>
            </div>
          </div>
        </div>

        {/* 4. Grade do Calendário (7 Colunas: DOM a SÁB) */}
        <div className="p-2 sm:p-4 md:p-6 bg-[#101010]">
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 text-center">
            {DIAS_SEMANA.map((dia) => (
              <span key={dia} className="font-mono text-[9px] sm:text-[10px] md:text-xs text-[#8a8380] uppercase tracking-wider py-1">
                {dia}
              </span>
            ))}
          </div>

          {/* Células dos Dias */}
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {/* Espaços vazios antes do dia 1 */}
            {Array.from({ length: primeiroDiaSemana }).map((_, idx) => (
              <div 
                key={`vazio_${idx}`} 
                className="min-h-[46px] sm:min-h-[84px] md:min-h-[94px] rounded-[3px] bg-[#161413]/30 border border-transparent p-1 opacity-25 select-none"
              />
            ))}

            {/* Dias reais do mês */}
            {Array.from({ length: totalDiasNoMes }).map((_, idx) => {
              const dia = idx + 1;
              const itensDoDia = mapaItensPorDia.get(dia) || [];
              const totalDia = itensDoDia.reduce((acc, it) => acc + it.valor, 0);
              const selecionado = diaSelecionado === dia;
              const ehDiaAtual = ehHoje(dia);

              return (
                <div
                  key={`dia_${dia}`}
                  onClick={() => handleSelecionarDia(dia)}
                  className={`min-h-[46px] sm:min-h-[84px] md:min-h-[94px] rounded-[3px] p-1 sm:p-1.5 md:p-2 border transition-all cursor-pointer flex flex-col justify-between group overflow-hidden ${
                    selecionado
                      ? 'bg-[#1d1a18] border-[#fafafa] ring-1 ring-[#fafafa]/40'
                      : ehDiaAtual
                      ? 'bg-[#161413] border-[#ee6018]/60 hover:border-[#ee6018]'
                      : 'bg-[#161413] border-[#3d3a39] hover:border-[#8a8380]'
                  }`}
                >
                  {/* Topo da Célula: Número do Dia + Indicador de Hoje */}
                  <div className="flex items-center justify-between leading-none mb-0.5">
                    <span className={`font-mono text-xs md:text-sm font-medium ${
                      ehDiaAtual ? 'text-[#ee6018]' : selecionado ? 'text-[#fafafa]' : 'text-[#8a8380] group-hover:text-[#eeeeee]'
                    }`}>
                      {dia.toString().padStart(2, '0')}
                    </span>

                    {ehDiaAtual && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ee6018]" title="Hoje" />
                    )}

                    {totalDia > 0 && !ehDiaAtual && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8a8380] opacity-50 hidden sm:block" />
                    )}
                  </div>

                  {/* Indicador Mobile: micro-dots elegantes quando o dia possui lançamentos (sem poluir a célula) */}
                  <div className="flex sm:hidden items-center justify-center gap-1 mt-auto pb-0.5">
                    {itensDoDia.length > 0 && (
                      <div className="flex items-center gap-0.5">
                        {itensDoDia.slice(0, 3).map((it, i) => (
                          <span
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              it.pago
                                ? 'bg-[#a0ca92]'
                                : it.categoria === 'superfluos'
                                ? 'bg-[#ee6018]'
                                : 'bg-[#eeeeee]'
                            }`}
                          />
                        ))}
                        {itensDoDia.length > 3 && (
                          <span className="w-1 h-1 rounded-full bg-[#8a8380]" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Meio: Mini Pílulas de Lançamentos com Micro-Dot e Título Expandido (Oculto no mobile, visível no desktop) */}
                  <div className="hidden sm:flex flex-col gap-0.5 sm:gap-1 my-0.5 overflow-hidden">
                    {itensDoDia.slice(0, 2).map((it) => (
                      <div
                        key={it.id}
                        className={`text-[8.5px] sm:text-[9.5px] md:text-[10px] font-mono px-1 py-0.5 rounded-[2px] border flex items-center justify-between gap-0.5 leading-tight transition-colors ${
                          it.pago
                            ? 'bg-[#a0ca92]/15 text-[#a0ca92] border-[#a0ca92]/40'
                            : it.categoria === 'superfluos'
                            ? 'bg-[#ee6018]/15 text-[#ee6018] border-[#ee6018]/40'
                            : 'bg-[#1d1a18] text-[#eeeeee] border-[#3d3a39]'
                        }`}
                        title={`${it.titulo} - ${formatarBRL(it.valor)} (${it.pago ? 'Pago' : 'Pendente'})`}
                      >
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <span 
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              it.pago 
                                ? 'bg-[#a0ca92]' 
                                : it.categoria === 'superfluos' 
                                ? 'bg-[#ee6018]' 
                                : 'bg-[#eeeeee]'
                            }`} 
                          />
                          <span className="truncate font-medium">{it.titulo}</span>
                        </div>

                        {it.pago ? (
                          <Check className="w-2.5 h-2.5 shrink-0 ml-0.5 hidden sm:block text-[#a0ca92]" />
                        ) : (
                          <Clock className="w-2.5 h-2.5 shrink-0 ml-0.5 hidden sm:block text-[#ee6018]" />
                        )}
                      </div>
                    ))}

                    {itensDoDia.length > 2 && (
                      <span className="text-[8px] sm:text-[9px] font-mono text-[#8a8380] pl-0.5 font-medium leading-none">
                        +{itensDoDia.length - 2} mais
                      </span>
                    )}
                  </div>

                  {/* Rodapé da Célula: Valor Total do Dia Compacto (Oculto no mobile, visível no desktop) */}
                  <div className="hidden sm:block text-right mt-auto pt-0.5">
                    {totalDia > 0 ? (
                      <span className="font-mono text-[8.5px] sm:text-[9.5px] md:text-[11px] text-[#eeeeee] block tracking-tighter truncate font-medium">
                        {formatarBRL(totalDia)}
                      </span>
                    ) : (
                      <span className="text-[8.5px] text-transparent font-mono block select-none">-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Painel Detalhado do Dia Selecionado */}
        {diaSelecionado && (
          <div 
            ref={painelDiaRef}
            className="border-t border-[#3d3a39] bg-[#161413] p-4 md:p-6 flex flex-col gap-4 animate-fadeIn scroll-mt-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3d3a39] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[3px] bg-[#1d1a18] border border-[#3d3a39] flex items-center justify-center font-mono text-sm font-bold text-[#fafafa]">
                  {diaSelecionado.toString().padStart(2, '0')}
                </div>
                <div>
                  <h4 className="font-mono text-xs uppercase tracking-tight text-[#fafafa] flex items-center gap-2">
                    PLANEJAMENTO DO DIA {diaSelecionado} DE {MESES[mes].toUpperCase()}
                    {ehHoje(diaSelecionado) && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#ee6018] text-[#101010] font-bold">HOJE</span>
                    )}
                  </h4>
                  <span className="text-[11px] font-mono text-[#8a8380]">
                    Total no dia: <strong className="text-[#eeeeee]">{formatarBRL(totalDiaSelecionado)}</strong> ({itensDoDiaSelecionado.length} {itensDoDiaSelecionado.length === 1 ? 'lançamento' : 'lançamentos'})
                  </span>
                </div>
              </div>

              {/* Botões de Ação do Dia */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Botão Abrir Modal na Tela */}
                <button
                  onClick={() => setModalDiaAberto(true)}
                  className="px-2.5 py-1.5 rounded-[3px] bg-transparent hover:bg-[#1d1a18] border border-[#3d3a39] hover:border-[#fafafa] text-[#8a8380] hover:text-[#fafafa] font-mono text-xs uppercase tracking-tight flex items-center justify-center gap-1.5 cursor-pointer transition"
                  title="Abrir detalhes deste dia em janela modal na tela"
                >
                  <span>Abrir na Tela</span>
                </button>

                {/* Botão Lembrar Dia no WhatsApp */}
                {itensDoDiaSelecionado.some(it => !it.pago) && (
                  <button
                    onClick={() => {
                      const msg = gerarMensagemWhatsAppDia(diaSelecionado, MESES[mes], itensDoDiaSelecionado);
                      dispararWhatsApp(msg);
                    }}
                    className="px-3 py-1.5 rounded-[3px] bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] font-mono text-xs uppercase tracking-tight flex items-center justify-center gap-1.5 cursor-pointer transition"
                    title="Enviar lista de pendências deste dia para o WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Lembrar Dia no WhatsApp</span>
                  </button>
                )}

                {/* Botão Novo Agendamento no Dia */}
                <button
                  onClick={() => setMostrandoAgendamento(!mostrandoAgendamento)}
                  className="px-3 py-1.5 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] font-mono text-xs uppercase tracking-tight flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agendar no Dia {diaSelecionado}</span>
                </button>
              </div>
            </div>

            {/* Formulário Inline de Novo Agendamento */}
            {mostrandoAgendamento && (
              <form onSubmit={handleSalvarAgendamento} className="p-4 rounded-[3px] bg-[#101010] border border-[#3d3a39] flex flex-col gap-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-[#3d3a39] pb-2">
                  <span className="font-mono text-xs uppercase text-[#eeeeee]">
                    + NOVO COMPROMISSO PARA O DIA {diaSelecionado} DE {MESES[mes].toUpperCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMostrandoAgendamento(false)}
                    className="text-[#8a8380] hover:text-[#eeeeee]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Descrição</label>
                    <input
                      type="text"
                      placeholder="Ex: Conta de Luz, Mercado..."
                      value={novoTitulo}
                      onChange={(e) => setNovoTitulo(e.target.value)}
                      className="w-full bg-[#161413] border border-[#3d3a39] rounded-[3px] px-2.5 py-1.5 text-xs text-[#eeeeee] focus:border-[#eeeeee] focus:outline-none font-mono"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Valor (R$)</label>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={novoValor}
                      onChange={(e) => setNovoValor(e.target.value)}
                      className="w-full bg-[#161413] border border-[#3d3a39] rounded-[3px] px-2.5 py-1.5 text-xs text-[#eeeeee] focus:border-[#eeeeee] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Pilar 50-30-20</label>
                    <select
                      value={novaCategoria}
                      onChange={(e) => {
                        const cat = e.target.value as CategoriaOrcamentaria;
                        setNovaCategoria(cat);
                        setNovoTipo(CATEGORIAS_CONFIG[cat].subcategorias[0] || 'Geral');
                      }}
                      className="w-full bg-[#161413] border border-[#3d3a39] rounded-[3px] px-2 py-1.5 text-xs text-[#eeeeee] focus:border-[#eeeeee] focus:outline-none font-mono"
                    >
                      <option value="fixas">50% Fixas & Essenciais</option>
                      <option value="superfluos">30% Estilo de Vida / Supérfluos</option>
                      <option value="investimentos">20% Investimentos & Reserva</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Subcategoria</label>
                    <select
                      value={novoTipo}
                      onChange={(e) => setNovoTipo(e.target.value)}
                      className="w-full bg-[#161413] border border-[#3d3a39] rounded-[3px] px-2 py-1.5 text-xs text-[#eeeeee] focus:border-[#eeeeee] focus:outline-none font-mono"
                    >
                      {CATEGORIAS_CONFIG[novaCategoria].subcategorias.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#3d3a39]">
                  <button
                    type="button"
                    onClick={() => setMostrandoAgendamento(false)}
                    className="px-3 py-1 rounded-[3px] bg-transparent border border-[#3d3a39] text-[#8a8380] hover:text-[#eeeeee] text-xs font-mono"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] text-xs font-mono font-medium uppercase"
                  >
                    Confirmar Agendamento
                  </button>
                </div>
              </form>
            )}

            {/* Lista de Itens do Dia Selecionado */}
            {itensDoDiaSelecionado.length === 0 ? (
              <div className="p-6 text-center rounded-[3px] border border-dashed border-[#3d3a39] text-[#8a8380] font-mono text-xs flex flex-col items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-[#8a8380]" />
                <span>Nenhum compromisso financeiro agendado para o dia {diaSelecionado}.</span>
                <button
                  onClick={() => setMostrandoAgendamento(true)}
                  className="mt-1 text-xs text-[#fafafa] hover:underline"
                >
                  + Agendar despesa ou aporte neste dia
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {itensDoDiaSelecionado.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-[3px] bg-[#101010] border border-[#3d3a39] hover:border-[#8a8380] transition flex flex-col justify-between gap-2.5 font-mono"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="overflow-hidden">
                        <span className={`text-xs block font-medium truncate ${
                          item.pago ? 'line-through text-[#8a8380]' : 'text-[#eeeeee]'
                        }`}>
                          {item.titulo}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9px] px-1 rounded uppercase border ${
                            item.categoria === 'fixas'
                              ? 'text-[#eeeeee] border-[#3d3a39]'
                              : item.categoria === 'superfluos'
                              ? 'text-[#ee6018] border-[#ee6018]/40'
                              : 'text-[#a0ca92] border-[#a0ca92]/40'
                          }`}>
                            {CATEGORIAS_CONFIG[item.categoria].nome}
                          </span>
                          <span className="text-[10px] text-[#8a8380] truncate">{item.tipoDetalhado}</span>
                        </div>
                      </div>

                      <span className="text-sm font-medium text-[#fafafa] shrink-0">
                        {formatarBRL(item.valor)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#1d1a18] text-xs">
                      {/* Botão Alternar Pago */}
                      <button
                        onClick={() => onAlternarPago(item.id)}
                        className={`px-2 py-0.5 rounded-[2px] text-[10px] uppercase flex items-center gap-1 cursor-pointer transition ${
                          item.pago
                            ? 'bg-[#a0ca92]/20 text-[#a0ca92] border border-[#a0ca92]/40'
                            : 'bg-[#ee6018]/10 text-[#ee6018] border border-[#ee6018]/40 hover:bg-[#ee6018]/20'
                        }`}
                        title={item.pago ? 'Marcar como pendente' : 'Marcar como pago'}
                      >
                        {item.pago ? (
                          <>
                            <Check className="w-3 h-3" /> PAGO
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" /> A PAGAR
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1">
                        {/* Botão Enviar no WhatsApp */}
                        {!item.pago && (
                          <button
                            onClick={() => {
                              const msg = gerarMensagemWhatsAppIndividual(item);
                              dispararWhatsApp(msg);
                            }}
                            className="p-1 text-[#8a8380] hover:text-[#25D366] transition cursor-pointer"
                            title="Enviar lembrete desta conta no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Excluir */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Excluir "${item.titulo}"?`)) {
                              onRemoverItem(item.id);
                            }
                          }}
                          className="text-[#8a8380] hover:text-[#ee6018] transition p-1 cursor-pointer"
                          title="Remover lançamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* 6. Modal On-Screen: Abre na tela ao clicar no dia com despesas */}
        {modalDiaAberto && diaSelecionado && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
            onClick={() => setModalDiaAberto(false)}
          >
            <div 
              className="relative w-full max-w-lg bg-[#161413] border border-[#3d3a39] rounded-[10px] overflow-hidden shadow-2xl flex flex-col max-h-[88vh] text-[#eeeeee]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* macOS Window Terminal Header */}
              <div className="h-10 bg-[#1d1a18] border-b border-[#3d3a39] px-4 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ee6018]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-[#8a8380] sm:ml-2 truncate">
                    CALENDÁRIO // DIA {diaSelecionado.toString().padStart(2, '0')} DE {MESES[mes].toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => setModalDiaAberto(false)}
                  className="h-7 w-7 rounded-[3px] bg-transparent hover:bg-[#3d3a39]/50 text-[#8a8380] hover:text-[#fafafa] flex items-center justify-center cursor-pointer transition-colors"
                  title="Fechar (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Header com Totais e Métricas do Dia */}
              <div className="p-4 sm:p-5 bg-[#101010] border-b border-[#3d3a39] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[4px] bg-[#1d1a18] border border-[#3d3a39] flex items-center justify-center font-mono text-base font-bold text-[#fafafa] shrink-0">
                    {diaSelecionado.toString().padStart(2, '0')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs uppercase text-[#fafafa] font-medium">
                        {diaSelecionado} de {MESES[mes]} de {ano}
                      </span>
                      {ehHoje(diaSelecionado) && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#ee6018] text-[#101010] font-bold">HOJE</span>
                      )}
                    </div>
                    <div className="text-lg sm:text-xl font-normal text-[#eeeeee] tracking-tight font-geist mt-0.5">
                      {formatarBRL(totalDiaSelecionado)}
                    </div>
                    <span className="text-[11px] font-mono text-[#8a8380]">
                      {itensDoDiaSelecionado.length} {itensDoDiaSelecionado.length === 1 ? 'compromisso cadastrado' : 'compromissos cadastrados'}
                    </span>
                  </div>
                </div>

                {/* Botão Ação WhatsApp e Agendar */}
                <div className="flex items-center gap-2 flex-wrap">
                  {itensDoDiaSelecionado.some(it => !it.pago) && (
                    <button
                      onClick={() => {
                        const msg = gerarMensagemWhatsAppDia(diaSelecionado, MESES[mes], itensDoDiaSelecionado);
                        dispararWhatsApp(msg);
                      }}
                      className="h-8 px-2.5 rounded-[3px] bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] font-mono text-xs uppercase tracking-tight flex items-center gap-1.5 cursor-pointer transition"
                      title="Lembrar pendências deste dia no WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  )}

                  <button
                    onClick={() => setMostrandoAgendamento(!mostrandoAgendamento)}
                    className="h-8 px-2.5 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] font-mono text-xs uppercase tracking-tight flex items-center gap-1.5 cursor-pointer transition font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo</span>
                  </button>
                </div>
              </div>

              {/* Formulário Inline se aberto */}
              {mostrandoAgendamento && (
                <form onSubmit={handleSalvarAgendamento} className="p-4 bg-[#161413] border-b border-[#3d3a39] flex flex-col gap-3 animate-fadeIn shrink-0">
                  <div className="flex items-center justify-between border-b border-[#3d3a39] pb-2">
                    <span className="font-mono text-xs uppercase text-[#eeeeee]">
                      + NOVO COMPROMISSO PARA O DIA {diaSelecionado} DE {MESES[mes].toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMostrandoAgendamento(false)}
                      className="text-[#8a8380] hover:text-[#eeeeee]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Descrição</label>
                      <input
                        type="text"
                        placeholder="Ex: Conta de Luz, Mercado..."
                        value={novoTitulo}
                        onChange={(e) => setNovoTitulo(e.target.value)}
                        className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2.5 py-1.5 text-xs text-[#eeeeee] focus:border-[#eeeeee] focus:outline-none font-mono"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Valor (R$)</label>
                      <input
                        type="text"
                        placeholder="0,00"
                        value={novoValor}
                        onChange={(e) => setNovoValor(e.target.value)}
                        className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2.5 py-1.5 text-xs text-[#eeeeee] focus:border-[#eeeeee] focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Pilar 50-30-20</label>
                      <select
                        value={novaCategoria}
                        onChange={(e) => {
                          const cat = e.target.value as CategoriaOrcamentaria;
                          setNovaCategoria(cat);
                          setNovoTipo(CATEGORIAS_CONFIG[cat].subcategorias[0] || 'Geral');
                        }}
                        className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2 py-1.5 text-xs text-[#eeeeee] focus:border-[#eeeeee] focus:outline-none font-mono"
                      >
                        <option value="fixas">50% Fixas & Essenciais</option>
                        <option value="superfluos">30% Estilo de Vida / Supérfluos</option>
                        <option value="investimentos">20% Investimentos & Reserva</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Subcategoria</label>
                      <select
                        value={novoTipo}
                        onChange={(e) => setNovoTipo(e.target.value)}
                        className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2 py-1.5 text-xs text-[#eeeeee] focus:border-[#eeeeee] focus:outline-none font-mono"
                      >
                        {CATEGORIAS_CONFIG[novaCategoria].subcategorias.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#3d3a39]">
                    <button
                      type="button"
                      onClick={() => setMostrandoAgendamento(false)}
                      className="px-3 py-1 rounded-[3px] bg-transparent border border-[#3d3a39] text-[#8a8380] hover:text-[#eeeeee] text-xs font-mono cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] text-xs font-mono font-medium uppercase cursor-pointer"
                    >
                      Confirmar
                    </button>
                  </div>
                </form>
              )}

              {/* Lista com as Despesas Cadastradas */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-2.5 select-text">
                <span className="font-mono text-[10px] text-[#8a8380] uppercase tracking-wider block mb-1">
                  Despesas e compromissos deste dia:
                </span>

                {itensDoDiaSelecionado.length === 0 ? (
                  <div className="p-8 text-center rounded-[3px] border border-dashed border-[#3d3a39] text-[#8a8380] font-mono text-xs flex flex-col items-center gap-2">
                    <CalendarCheck2 className="w-6 h-6 text-[#8a8380]" />
                    <span>Nenhum compromisso financeiro agendado para o dia {diaSelecionado}.</span>
                    <button
                      onClick={() => setMostrandoAgendamento(true)}
                      className="mt-1 text-xs text-[#fafafa] hover:underline cursor-pointer"
                    >
                      + Agendar despesa ou aporte neste dia
                    </button>
                  </div>
                ) : (
                  itensDoDiaSelecionado.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-[4px] bg-[#101010] border border-[#3d3a39] hover:border-[#8a8380] transition flex flex-col justify-between gap-3 font-mono"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="overflow-hidden flex-1">
                          <span className={`text-sm block font-medium truncate ${
                            item.pago ? 'line-through text-[#8a8380]' : 'text-[#fafafa]'
                          }`}>
                            {item.titulo}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase border ${
                              item.categoria === 'fixas'
                                ? 'text-[#eeeeee] border-[#3d3a39]'
                                : item.categoria === 'superfluos'
                                ? 'text-[#ee6018] border-[#ee6018]/40 bg-[#ee6018]/10'
                                : 'text-[#a0ca92] border-[#a0ca92]/40 bg-[#a0ca92]/10'
                            }`}>
                              {CATEGORIAS_CONFIG[item.categoria].nome}
                            </span>
                            <span className="text-[11px] text-[#8a8380] truncate">{item.tipoDetalhado}</span>
                          </div>
                        </div>

                        <span className="text-base font-medium text-[#fafafa] shrink-0">
                          {formatarBRL(item.valor)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-[#1d1a18] text-xs">
                        {/* Alternar Pago/Pendente */}
                        <button
                          onClick={() => onAlternarPago(item.id)}
                          className={`px-2.5 py-1 rounded-[3px] border text-[11px] font-mono uppercase tracking-tight flex items-center gap-1.5 cursor-pointer transition ${
                            item.pago
                              ? 'bg-[#a0ca92]/15 text-[#a0ca92] border-[#a0ca92]/50 hover:bg-[#a0ca92]/25'
                              : 'bg-[#ee6018]/15 text-[#ee6018] border-[#ee6018]/50 hover:bg-[#ee6018]/25'
                          }`}
                        >
                          {item.pago ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> PAGO
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5" /> A PAGAR
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-2">
                          {!item.pago && (
                            <button
                              onClick={() => {
                                const msg = gerarMensagemWhatsAppIndividual(item);
                                dispararWhatsApp(msg);
                              }}
                              className="p-1.5 text-[#8a8380] hover:text-[#25D366] transition cursor-pointer"
                              title="Lembrar no WhatsApp"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (window.confirm(`Excluir "${item.titulo}"?`)) {
                                onRemoverItem(item.id);
                              }
                            }}
                            className="p-1.5 text-[#8a8380] hover:text-[#ee6018] transition cursor-pointer"
                            title="Remover lançamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-[#1d1a18] border-t border-[#3d3a39] flex items-center justify-end shrink-0">
                <button
                  onClick={() => setModalDiaAberto(false)}
                  className="px-4 py-1.5 rounded-[3px] bg-transparent border border-[#3d3a39] hover:border-[#fafafa] text-[#8a8380] hover:text-[#fafafa] font-mono text-xs uppercase tracking-tight cursor-pointer transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
