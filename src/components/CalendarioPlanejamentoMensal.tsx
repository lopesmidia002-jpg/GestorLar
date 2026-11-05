import { useState, useMemo, useRef } from 'react';
import type { ItemLancamento, CategoriaOrcamentaria } from '../types/finance';
import { formatarBRL, CATEGORIAS_CONFIG, parseMoedaBR } from '../utils/calculations';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Check, 
  Clock, 
  Plus, 
  Trash2, 
  X, 
  CalendarCheck2,
  MessageSquare
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

  const ano = dataVisualizada.getFullYear();
  const mes = dataVisualizada.getMonth();

  // Seleciona um dia e assegura visibilidade do painel no mobile
  const handleSelecionarDia = (dia: number) => {
    setDiaSelecionado(dia);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
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
            <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
            <span className="ml-2 font-mono text-[11px] uppercase tracking-[-0.24px] text-[#eeeeee] flex items-center gap-1.5">
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

        {/* 3. Filtros do Calendário */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-[#3d3a39] bg-[#161413] flex items-center justify-start md:justify-between gap-2.5 sm:gap-3 text-xs font-mono overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <span className="text-[10px] text-[#8a8380] uppercase mr-1 whitespace-nowrap">Filtrar:</span>
            <button
              onClick={() => setFiltroPilar('todos')}
              className={`px-2 py-0.5 rounded-[3px] border transition whitespace-nowrap ${
                filtroPilar === 'todos' 
                  ? 'bg-[#fafafa] text-[#101010] border-[#fafafa]' 
                  : 'bg-transparent text-[#8a8380] border-[#3d3a39] hover:border-[#8a8380]'
              }`}
            >
              TODOS
            </button>
            <button
              onClick={() => setFiltroPilar('fixas')}
              className={`px-2 py-0.5 rounded-[3px] border transition whitespace-nowrap ${
                filtroPilar === 'fixas' 
                  ? 'bg-[#eeeeee] text-[#101010] border-[#eeeeee]' 
                  : 'bg-transparent text-[#8a8380] border-[#3d3a39] hover:border-[#8a8380]'
              }`}
            >
              FIXAS
            </button>
            <button
              onClick={() => setFiltroPilar('superfluos')}
              className={`px-2 py-0.5 rounded-[3px] border transition whitespace-nowrap ${
                filtroPilar === 'superfluos' 
                  ? 'bg-[#ee6018] text-[#101010] border-[#ee6018]' 
                  : 'bg-transparent text-[#8a8380] border-[#3d3a39] hover:border-[#8a8380]'
              }`}
            >
              SUPÉRFLUOS
            </button>
            <button
              onClick={() => setFiltroPilar('investimentos')}
              className={`px-2 py-0.5 rounded-[3px] border transition whitespace-nowrap ${
                filtroPilar === 'investimentos' 
                  ? 'bg-[#a0ca92] text-[#101010] border-[#a0ca92]' 
                  : 'bg-transparent text-[#8a8380] border-[#3d3a39] hover:border-[#8a8380]'
              }`}
            >
              APORTES
            </button>
          </div>

          {/* Divisor vertical sutil entre pilares e status */}
          <div className="h-4 w-px bg-[#3d3a39] shrink-0" />

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={() => setFiltroStatus('todos')}
              className={`px-2 py-0.5 rounded-[3px] border transition whitespace-nowrap ${
                filtroStatus === 'todos' 
                  ? 'bg-[#1d1a18] text-[#eeeeee] border-[#fafafa]' 
                  : 'bg-transparent text-[#8a8380] border-[#3d3a39]'
              }`}
            >
              TUDO
            </button>
            <button
              onClick={() => setFiltroStatus('pendentes')}
              className={`px-2 py-0.5 rounded-[3px] border transition whitespace-nowrap ${
                filtroStatus === 'pendentes' 
                  ? 'bg-[#ee6018]/10 text-[#ee6018] border-[#ee6018]' 
                  : 'bg-transparent text-[#8a8380] border-[#3d3a39]'
              }`}
            >
              A PAGAR
            </button>
            <button
              onClick={() => setFiltroStatus('pagos')}
              className={`px-2 py-0.5 rounded-[3px] border transition whitespace-nowrap ${
                filtroStatus === 'pagos' 
                  ? 'bg-[#a0ca92]/10 text-[#a0ca92] border-[#a0ca92]' 
                  : 'bg-transparent text-[#8a8380] border-[#3d3a39]'
              }`}
            >
              PAGO
            </button>
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
      </div>
    </section>
  );
};
