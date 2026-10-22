import { useState } from 'react';
import type { CalculoOrcamentario, CategoriaOrcamentaria, MetasRegra } from '../types/finance';
import { formatarBRL, formatarPercentual, parseMoedaBR } from '../utils/calculations';
import { 
  ShieldCheck, 
  Coffee, 
  Rocket, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Edit2, 
  Check, 
  X,
  Plus
} from 'lucide-react';

interface Props {
  calculos: CalculoOrcamentario;
  metasRegra: MetasRegra;
  filtroAtivo: CategoriaOrcamentaria | 'todos';
  rendaFamiliar?: number;
  onSelecionarFiltro: (filtro: CategoriaOrcamentaria | 'todos') => void;
  onAtualizarMeta: (categoria: CategoriaOrcamentaria, novoPercent: number) => void;
  onAdicionarItemRapido: (categoria: CategoriaOrcamentaria, titulo: string, valor: number) => void;
  onAjustarTotalPilar: (categoria: CategoriaOrcamentaria, novoTotal: number) => void;
  onAjustarTetoPilar: (categoria: CategoriaOrcamentaria, novoTeto: number) => void;
}

export const PilaresDoLar = ({
  calculos,
  metasRegra,
  filtroAtivo,
  rendaFamiliar,
  onSelecionarFiltro,
  onAtualizarMeta,
  onAdicionarItemRapido,
  onAjustarTotalPilar,
  onAjustarTetoPilar,
}: Props) => {
  const rendaBase = rendaFamiliar || (calculos.totalGastos + calculos.saldoLivre) || 1;

  // Estado para edição de meta percentual
  const [editandoMetaPilar, setEditandoMetaPilar] = useState<CategoriaOrcamentaria | null>(null);
  const [tempMetaPercent, setTempMetaPercent] = useState('');

  // Estado para edição direta do badge de porcentagem alocada
  const [editandoBadgePilar, setEditandoBadgePilar] = useState<CategoriaOrcamentaria | null>(null);
  const [tempBadgePercent, setTempBadgePercent] = useState('');

  // Estado para edição direta do total gasto no pilar
  const [editandoTotalPilar, setEditandoTotalPilar] = useState<CategoriaOrcamentaria | null>(null);
  const [tempTotalValor, setTempTotalValor] = useState('');

  // Estado para edição do teto em R$
  const [editandoTetoPilar, setEditandoTetoPilar] = useState<CategoriaOrcamentaria | null>(null);
  const [tempTetoValor, setTempTetoValor] = useState('');

  // Estado para formulário rápido no pilar
  const [pilarAdicionando, setPilarAdicionando] = useState<CategoriaOrcamentaria | null>(null);
  const [rapidoTitulo, setRapidoTitulo] = useState('');
  const [rapidoValor, setRapidoValor] = useState('');

  const iniciarEdicaoMeta = (pilar: CategoriaOrcamentaria, percentAtual: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditandoMetaPilar(pilar);
    setTempMetaPercent(percentAtual.toString());
  };

  const salvarMeta = (pilar: CategoriaOrcamentaria, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const num = parseFloat(tempMetaPercent.replace(',', '.'));
    if (!isNaN(num) && num >= 1 && num <= 100) {
      onAtualizarMeta(pilar, num);
    }
    setEditandoMetaPilar(null);
  };

  const iniciarEdicaoBadge = (pilar: CategoriaOrcamentaria, percentAtual: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditandoBadgePilar(pilar);
    setTempBadgePercent(percentAtual.toFixed(1).replace(',', '.'));
  };

  const salvarBadge = (pilar: CategoriaOrcamentaria, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const num = parseFloat(tempBadgePercent.replace(',', '.'));
    if (!isNaN(num) && num >= 0 && num <= 200) {
      const novoTotal = Math.round(((rendaBase * num) / 100) * 100) / 100;
      onAjustarTotalPilar(pilar, novoTotal);
    }
    setEditandoBadgePilar(null);
  };

  const iniciarEdicaoTotal = (pilar: CategoriaOrcamentaria, totalAtual: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditandoTotalPilar(pilar);
    setTempTotalValor(totalAtual.toString());
  };

  const salvarTotal = (pilar: CategoriaOrcamentaria, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const val = parseMoedaBR(tempTotalValor);
    if (val >= 0) {
      onAjustarTotalPilar(pilar, val);
    }
    setEditandoTotalPilar(null);
  };

  const iniciarEdicaoTeto = (pilar: CategoriaOrcamentaria, tetoAtual: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditandoTetoPilar(pilar);
    setTempTetoValor(tetoAtual.toString());
  };

  const salvarTeto = (pilar: CategoriaOrcamentaria, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const val = parseMoedaBR(tempTetoValor);
    if (val >= 0) {
      onAjustarTetoPilar(pilar, val);
    }
    setEditandoTetoPilar(null);
  };

  const submeterRapido = (pilar: CategoriaOrcamentaria, e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const val = parseMoedaBR(rapidoValor);
    if (!rapidoTitulo.trim() || val <= 0) return;

    onAdicionarItemRapido(pilar, rapidoTitulo.trim(), val);
    setRapidoTitulo('');
    setRapidoValor('');
    setPilarAdicionando(null);
  };

  const pilares = [
    {
      id: 'fixas' as CategoriaOrcamentaria,
      titulo: 'Contas Fixas',
      metaPercent: metasRegra.fixas,
      percentualAtual: calculos.percentFixas,
      totalGasto: calculos.totalFixas,
      limiteReais: calculos.limiteFixas,
      desvio: calculos.desvioFixas,
      corHex: '#00D2FF',
      icon: ShieldCheck,
      descricao: 'Moradia, energia, alimentação, saúde e essenciais',
      dentroDoLimite: calculos.percentFixas <= metasRegra.fixas,
      mensagemStatus: calculos.percentFixas <= metasRegra.fixas ? 'Essenciais sob controle' : `Acima do teto de ${metasRegra.fixas}%`,
      glowClass: 'group-hover:border-[#00D2FF]/50',
      activeBorderClass: 'border-[#00D2FF] shadow-lg shadow-[#00D2FF]/10',
    },
    {
      id: 'superfluos' as CategoriaOrcamentaria,
      titulo: 'Gastos Supérfluos',
      metaPercent: metasRegra.superfluos,
      percentualAtual: calculos.percentSuperfluos,
      totalGasto: calculos.totalSuperfluos,
      limiteReais: calculos.limiteSuperfluos,
      desvio: calculos.desvioSuperfluos,
      corHex: '#9D00FF',
      icon: Coffee,
      descricao: 'Restaurantes, streaming, delivery, vestuário e lazer',
      dentroDoLimite: calculos.percentSuperfluos <= metasRegra.superfluos,
      mensagemStatus: calculos.percentSuperfluos <= metasRegra.superfluos ? 'Dentro da cota discricionária' : 'Contenção recomendada',
      glowClass: 'group-hover:border-[#9D00FF]/50',
      activeBorderClass: 'border-[#9D00FF] shadow-lg shadow-[#9D00FF]/10',
    },
    {
      id: 'investimentos' as CategoriaOrcamentaria,
      titulo: 'Investimentos & Reserva',
      metaPercent: metasRegra.investimentos,
      percentualAtual: calculos.percentInvestimentos,
      totalGasto: calculos.totalInvestimentos,
      limiteReais: calculos.metaInvestimentos,
      desvio: calculos.desvioInvestimentos,
      corHex: '#00FF87',
      icon: Rocket,
      descricao: 'Reserva de liquidez diária, títulos públicos e FIIs',
      dentroDoLimite: calculos.percentInvestimentos >= metasRegra.investimentos,
      mensagemStatus: calculos.percentInvestimentos >= metasRegra.investimentos ? 'Meta de aporte alcançada!' : `Meta mínima: ${metasRegra.investimentos}%`,
      glowClass: 'group-hover:border-[#00FF87]/50',
      activeBorderClass: 'border-[#00FF87] shadow-lg shadow-[#00FF87]/10',
    },
  ];

  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm uppercase tracking-wider font-semibold text-[#9CA3AF]">
            Pilares do Lar • Metas e Alocação
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF87] animate-pulse" />
            100% Editáveis (Totais, Tetos e Metas ✎)
          </span>
        </div>
        {filtroAtivo !== 'todos' && (
          <button
            onClick={() => onSelecionarFiltro('todos')}
            className="text-xs text-[#00FF87] hover:underline cursor-pointer"
          >
            Limpar filtro de pilar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pilares.map((pilar) => {
          const Icon = pilar.icon;
          const isSelected = filtroAtivo === pilar.id;
          const percentProgresso = Math.min((pilar.percentualAtual / (pilar.metaPercent || 1)) * 100, 100);
          const isEditandoMeta = editandoMetaPilar === pilar.id;
          const isAdicionandoAqui = pilarAdicionando === pilar.id;

          return (
            <div
              key={pilar.id}
              onClick={() => onSelecionarFiltro(isSelected ? 'todos' : pilar.id)}
              className={`hyper-card p-5 cursor-pointer relative overflow-hidden transition-all duration-300 border ${
                isSelected 
                  ? pilar.activeBorderClass 
                  : `border-[#161924] ${pilar.glowClass}`
              }`}
            >
              {/* Header do Pilar */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center border"
                    style={{ 
                      backgroundColor: `${pilar.corHex}15`, 
                      borderColor: `${pilar.corHex}40`,
                      color: pilar.corHex 
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">
                      {pilar.titulo}
                    </h3>

                    {/* Meta Percentual Editável */}
                    {isEditandoMeta ? (
                      <div 
                        className="flex items-center gap-1 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[11px] font-mono text-[#9CA3AF]">Meta:</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={tempMetaPercent}
                          onChange={(e) => setTempMetaPercent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') salvarMeta(pilar.id, e);
                            if (e.key === 'Escape') setEditandoMetaPilar(null);
                          }}
                          autoFocus
                          className="w-12 bg-[#07080b] border border-[#00FF87] rounded px-1 text-xs font-mono text-white text-center focus:outline-none"
                        />
                        <span className="text-xs font-mono text-white">%</span>
                        <button
                          onClick={(e) => salvarMeta(pilar.id, e)}
                          className="p-1 rounded bg-[#00FF87] text-[#07080b] hover:bg-[#00FF87]/80"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditandoMetaPilar(null);
                          }}
                          className="p-1 rounded bg-[#1e2333] text-[#9CA3AF] hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={(e) => iniciarEdicaoMeta(pilar.id, pilar.metaPercent, e)}
                        className="group/meta flex items-center gap-1 cursor-pointer text-[11px] font-mono text-[#9CA3AF] hover:text-[#00FF87] transition-colors"
                        title="Clique para editar a meta percentual"
                      >
                        <span>Meta: <strong className="text-white group-hover/meta:text-[#00FF87]">{pilar.metaPercent}%</strong> da renda</span>
                        <Edit2 className="w-3 h-3 text-[#4B5563] group-hover/meta:text-[#00FF87] opacity-0 group-hover/meta:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Badge de Porcentagem Alocada (Editável) */}
                {editandoBadgePilar === pilar.id ? (
                  <div 
                    className="flex items-center gap-1 bg-[#07080b] border border-[#00FF87] rounded-full px-2 py-0.5 z-10 shadow-lg shadow-[#00FF87]/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="150"
                      value={tempBadgePercent}
                      onChange={(e) => setTempBadgePercent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') salvarBadge(pilar.id, e);
                        if (e.key === 'Escape') setEditandoBadgePilar(null);
                      }}
                      autoFocus
                      className="w-12 bg-transparent text-xs font-mono font-bold text-white text-center focus:outline-none"
                    />
                    <span className="text-xs font-mono text-[#00FF87]">%</span>
                    <button
                      onClick={(e) => salvarBadge(pilar.id, e)}
                      className="text-[#00FF87] hover:text-white p-0.5"
                      title="Salvar alocação %"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditandoBadgePilar(null);
                      }}
                      className="text-[#9CA3AF] hover:text-white p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span 
                    onClick={(e) => iniciarEdicaoBadge(pilar.id, pilar.percentualAtual, e)}
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded-full cursor-pointer hover:ring-1 hover:ring-[#00FF87] transition-all flex items-center gap-1 group/badge"
                    style={{ 
                      backgroundColor: `${pilar.corHex}20`, 
                      color: pilar.corHex 
                    }}
                    title="Clique para editar porcentagem gasta deste pilar"
                  >
                    <span>{formatarPercentual(pilar.percentualAtual)}</span>
                    <Edit2 className="w-2.5 h-2.5 text-[#00FF87]/50 group-hover/badge:text-[#00FF87] opacity-60 group-hover/badge:opacity-100 transition-opacity" />
                  </span>
                )}
              </div>

              {/* Valores em Moeda (100% Editáveis: Total e Teto) */}
              <div className="my-2">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  {/* Total Gasto Editável */}
                  {editandoTotalPilar === pilar.id ? (
                    <div 
                      className="flex items-center gap-1 bg-[#07080b] border border-[#00FF87] rounded-lg px-2 py-0.5 z-10 shadow-lg shadow-[#00FF87]/20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs font-mono text-[#9CA3AF]">R$</span>
                      <input
                        type="text"
                        value={tempTotalValor}
                        onChange={(e) => setTempTotalValor(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') salvarTotal(pilar.id, e);
                          if (e.key === 'Escape') setEditandoTotalPilar(null);
                        }}
                        autoFocus
                        className="w-28 bg-transparent text-xl font-bold font-mono text-white focus:outline-none"
                      />
                      <button
                        onClick={(e) => salvarTotal(pilar.id, e)}
                        className="p-1 rounded bg-[#00FF87] text-[#07080b] hover:bg-[#00FF87]/80 cursor-pointer"
                        title="Salvar total"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditandoTotalPilar(null);
                        }}
                        className="p-1 rounded bg-[#1e2333] text-[#9CA3AF] hover:text-white cursor-pointer"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={(e) => iniciarEdicaoTotal(pilar.id, pilar.totalGasto, e)}
                      className="group/val cursor-pointer flex items-baseline gap-1.5"
                      title="Clique para editar o total deste pilar diretamente"
                    >
                      <span className="text-2xl font-extrabold tracking-tight font-mono-numeric text-white group-hover/val:text-[#00FF87] transition-colors border-b border-transparent group-hover/val:border-dashed group-hover/val:border-[#00FF87]">
                        {formatarBRL(pilar.totalGasto)}
                      </span>
                      <Edit2 className="w-3.5 h-3.5 text-[#00FF87]/60 group-hover/val:text-[#00FF87] opacity-60 group-hover/val:opacity-100 transition-opacity" />
                    </div>
                  )}

                  {/* Teto em Reais Editável */}
                  {editandoTetoPilar === pilar.id ? (
                    <div 
                      className="flex items-center gap-1 bg-[#07080b] border border-[#00FF87] rounded-lg px-2 py-0.5 z-10 shadow-lg shadow-[#00FF87]/20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[10px] text-[#9CA3AF] font-mono">Teto: R$</span>
                      <input
                        type="text"
                        value={tempTetoValor}
                        onChange={(e) => setTempTetoValor(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') salvarTeto(pilar.id, e);
                          if (e.key === 'Escape') setEditandoTetoPilar(null);
                        }}
                        autoFocus
                        className="w-20 bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                      />
                      <button
                        onClick={(e) => salvarTeto(pilar.id, e)}
                        className="p-0.5 rounded bg-[#00FF87] text-[#07080b] hover:bg-[#00FF87]/80 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditandoTetoPilar(null);
                        }}
                        className="p-0.5 rounded bg-[#1e2333] text-[#9CA3AF] hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={(e) => iniciarEdicaoTeto(pilar.id, pilar.limiteReais, e)}
                      className="group/teto cursor-pointer flex items-center gap-1 text-xs text-[#9CA3AF] font-mono hover:text-white"
                      title="Clique para editar o teto em R$ deste pilar"
                    >
                      <span>Teto: <strong className="text-white group-hover/teto:text-[#00FF87] border-b border-transparent group-hover/teto:border-dashed group-hover/teto:border-[#00FF87]">{formatarBRL(pilar.limiteReais)}</strong></span>
                      <Edit2 className="w-3 h-3 text-[#00FF87]/60 group-hover/teto:text-[#00FF87] opacity-60 group-hover/teto:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de Progresso com Saturação */}
              <div className="mt-3 mb-2">
                <div className="w-full bg-[#181d2b] h-2.5 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${percentProgresso}%`,
                      backgroundColor: pilar.corHex,
                      boxShadow: `0 0 10px ${pilar.corHex}80`,
                    }}
                  />
                </div>
              </div>

              {/* Formulário Rápido de Inserção de Despesa Inline no Pilar */}
              {isAdicionandoAqui ? (
                <form 
                  onSubmit={(e) => submeterRapido(pilar.id, e)} 
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3 p-2.5 rounded-xl bg-[#0a0c14] border border-[#00FF87]/40 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#00FF87]">
                    <span>Novo em {pilar.titulo}</span>
                    <button 
                      type="button" 
                      onClick={() => setPilarAdicionando(null)}
                      className="text-[#9CA3AF] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Descrição do lançamento..."
                    value={rapidoTitulo}
                    onChange={(e) => setRapidoTitulo(e.target.value)}
                    autoFocus
                    className="w-full bg-[#141724] border border-[#222738] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#00FF87]"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Valor R$"
                      value={rapidoValor}
                      onChange={(e) => setRapidoValor(e.target.value)}
                      className="w-full bg-[#141724] border border-[#222738] rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#00FF87]"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-lg bg-[#00FF87] text-[#07080b] font-bold text-xs shrink-0 hover:bg-[#00FF87]/90 transition"
                    >
                      Adicionar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#161924]">
                  <div className="flex items-center gap-1.5">
                    {pilar.dentroDoLimite ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF87]" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span className={pilar.dentroDoLimite ? 'text-[#9CA3AF] text-[11px]' : 'text-amber-300 font-medium text-[11px]'}>
                      {pilar.mensagemStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPilarAdicionando(pilar.id);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-[#00FF87] hover:underline"
                      title="Adicionar lançamento rápido neste pilar"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar</span>
                    </button>
                    <div className="flex items-center gap-0.5 text-[11px] text-[#4B5563] group-hover:text-white">
                      <span>{isSelected ? 'Filtrado' : 'Filtrar'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
