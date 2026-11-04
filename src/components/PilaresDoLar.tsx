import { useState } from 'react';
import type { CalculoOrcamentario, CategoriaOrcamentaria, MetasRegra } from '../types/finance';
import { formatarBRL, formatarPercentual, parseMoedaBR } from '../utils/calculations';
import { 
  ShieldCheck, 
  Coffee, 
  Rocket, 
  ArrowRight, 
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
      tag: '01',
      titulo: 'Contas Fixas',
      metaPercent: metasRegra.fixas,
      percentualAtual: calculos.percentFixas,
      totalGasto: calculos.totalFixas,
      limiteReais: calculos.limiteFixas,
      desvio: calculos.desvioFixas,
      corHex: '#eeeeee',
      accentColor: '#eeeeee',
      icon: ShieldCheck,
      descricao: 'Moradia, energia, alimentação, saúde e essenciais',
      dentroDoLimite: calculos.percentFixas <= metasRegra.fixas,
      mensagemStatus: calculos.percentFixas <= metasRegra.fixas ? 'Essenciais sob controle' : `Acima do teto (${metasRegra.fixas}%)`,
    },
    {
      id: 'superfluos' as CategoriaOrcamentaria,
      tag: '02',
      titulo: 'Gastos Supérfluos',
      metaPercent: metasRegra.superfluos,
      percentualAtual: calculos.percentSuperfluos,
      totalGasto: calculos.totalSuperfluos,
      limiteReais: calculos.limiteSuperfluos,
      desvio: calculos.desvioSuperfluos,
      corHex: '#ee6018',
      accentColor: '#ee6018',
      icon: Coffee,
      descricao: 'Restaurantes, streaming, delivery, vestuário e lazer',
      dentroDoLimite: calculos.percentSuperfluos <= metasRegra.superfluos,
      mensagemStatus: calculos.percentSuperfluos <= metasRegra.superfluos ? 'Dentro da cota' : 'Contenção recomendada',
    },
    {
      id: 'investimentos' as CategoriaOrcamentaria,
      tag: '03',
      titulo: 'Investimentos & Reserva',
      metaPercent: metasRegra.investimentos,
      percentualAtual: calculos.percentInvestimentos,
      totalGasto: calculos.totalInvestimentos,
      limiteReais: calculos.metaInvestimentos,
      desvio: calculos.desvioInvestimentos,
      corHex: '#a0ca92',
      accentColor: '#a0ca92',
      icon: Rocket,
      descricao: 'Reserva de liquidez diária, títulos públicos e FIIs',
      dentroDoLimite: calculos.percentInvestimentos >= metasRegra.investimentos,
      mensagemStatus: calculos.percentInvestimentos >= metasRegra.investimentos ? 'Meta atingida' : `Meta mínima: ${metasRegra.investimentos}%`,
    },
  ];

  return (
    <section id="pilares" className="w-full flex flex-col gap-4">
      {/* Section Header: Factory terminal eyebrow style */}
      <div className="flex items-center justify-between border-b border-[#3d3a39] pb-3">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92]" />
          <h2 className="font-mono text-xs uppercase tracking-[-0.24px] text-[#eeeeee]">
            PILARES DO LAR // METODOLOGIA 50-30-20
          </h2>
          <span className="font-mono text-[11px] text-[#8a8380] hidden sm:inline">
            • CLICK-TO-EDIT TOTAL
          </span>
        </div>
        {filtroAtivo !== 'todos' && (
          <button
            onClick={() => onSelecionarFiltro('todos')}
            className="font-mono text-xs text-[#a0ca92] hover:underline cursor-pointer"
          >
            [LIMPAR FILTRO DE PILAR]
          </button>
        )}
      </div>

      {/* Feature Card Row: Dark cards with 1px #3d3a39 hairline border, 10px radius, 24px padding */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {pilares.map((pilar) => {
          const isSelected = filtroAtivo === pilar.id;
          const percentProgresso = Math.min((pilar.percentualAtual / (pilar.metaPercent || 1)) * 100, 100);
          const isEditandoMeta = editandoMetaPilar === pilar.id;
          const isAdicionandoAqui = pilarAdicionando === pilar.id;

          return (
            <div
              key={pilar.id}
              onClick={() => onSelecionarFiltro(isSelected ? 'todos' : pilar.id)}
              className={`p-6 rounded-[10px] border cursor-pointer flex flex-col justify-between transition-colors ${
                isSelected 
                  ? 'bg-[#161413] border-[#eeeeee]' 
                  : 'bg-[#101010] border-[#3d3a39] hover:border-[#8a8380]'
              }`}
            >
              {/* Header do Pilar */}
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-tight text-[#8a8380]">
                      PILAR {pilar.tag} //
                    </span>
                    <h3 className="text-sm font-normal text-[#eeeeee] leading-tight">
                      {pilar.titulo}
                    </h3>
                  </div>

                  {/* Badge de Porcentagem Alocada (Editável) */}
                  {editandoBadgePilar === pilar.id ? (
                    <div 
                      className="flex items-center gap-1 bg-[#1d1a18] border border-[#eeeeee] rounded-[3px] px-1.5 py-0.5 z-10"
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
                        className="w-12 bg-transparent text-xs font-mono text-[#eeeeee] text-center focus:outline-none"
                      />
                      <span className="text-xs font-mono text-[#8a8380]">%</span>
                      <button
                        onClick={(e) => salvarBadge(pilar.id, e)}
                        className="text-[#eeeeee] hover:text-[#fafafa] p-0.5"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditandoBadgePilar(null);
                        }}
                        className="text-[#8a8380] hover:text-[#eeeeee] p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span 
                      onClick={(e) => iniciarEdicaoBadge(pilar.id, pilar.percentualAtual, e)}
                      className="font-mono text-xs px-2 py-0.5 rounded-[3px] border border-[#3d3a39] bg-[#1d1a18] text-[#eeeeee] cursor-pointer hover:border-[#fafafa] flex items-center gap-1"
                      title="Editar percentual alocado"
                    >
                      <span>{formatarPercentual(pilar.percentualAtual)}</span>
                      <Edit2 className="w-2.5 h-2.5 text-[#8a8380]" />
                    </span>
                  )}
                </div>

                {/* Meta Percentual */}
                <div className="mb-4">
                  {isEditandoMeta ? (
                    <div 
                      className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs font-mono text-[#8a8380]">META:</span>
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
                        className="w-12 bg-[#1d1a18] border border-[#eeeeee] rounded-[3px] px-1 text-xs font-mono text-[#eeeeee] text-center focus:outline-none"
                      />
                      <span className="text-xs font-mono text-[#eeeeee]">%</span>
                      <button
                        onClick={(e) => salvarMeta(pilar.id, e)}
                        className="p-1 rounded-[3px] bg-[#fafafa] text-[#101010]"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditandoMetaPilar(null);
                        }}
                        className="p-1 rounded-[3px] bg-[#1d1a18] text-[#8a8380]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={(e) => iniciarEdicaoMeta(pilar.id, pilar.metaPercent, e)}
                      className="flex items-center gap-1 text-xs font-mono text-[#8a8380] hover:text-[#eeeeee] cursor-pointer"
                      title="Clique para editar meta"
                    >
                      <span>META: {pilar.metaPercent}% DA RENDA</span>
                      <Edit2 className="w-2.5 h-2.5 text-[#4d4947]" />
                    </div>
                  )}
                </div>

                {/* Valores: Total Gasto e Teto */}
                <div className="mb-4">
                  {editandoTotalPilar === pilar.id ? (
                    <div 
                      className="flex items-center gap-1 bg-[#1d1a18] border border-[#eeeeee] rounded-[3px] p-1.5 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs font-mono text-[#8a8380]">R$</span>
                      <input
                        type="text"
                        value={tempTotalValor}
                        onChange={(e) => setTempTotalValor(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') salvarTotal(pilar.id, e);
                          if (e.key === 'Escape') setEditandoTotalPilar(null);
                        }}
                        autoFocus
                        className="w-28 bg-transparent text-lg font-mono text-[#eeeeee] focus:outline-none"
                      />
                      <button
                        onClick={(e) => salvarTotal(pilar.id, e)}
                        className="p-1 rounded-[3px] bg-[#fafafa] text-[#101010]"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditandoTotalPilar(null);
                        }}
                        className="p-1 rounded-[3px] bg-[#101010] text-[#8a8380]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={(e) => iniciarEdicaoTotal(pilar.id, pilar.totalGasto, e)}
                      className="cursor-pointer group flex items-baseline justify-between"
                      title="Clique para editar o total"
                    >
                      <span className="text-[28px] font-normal tracking-[-1.12px] leading-tight font-geist text-[#eeeeee]">
                        {formatarBRL(pilar.totalGasto)}
                      </span>
                      <Edit2 className="w-3.5 h-3.5 text-[#4d4947] group-hover:text-[#eeeeee] transition-colors" />
                    </div>
                  )}

                  {/* Teto Editável */}
                  <div className="mt-1">
                    {editandoTetoPilar === pilar.id ? (
                      <div 
                        className="flex items-center gap-1 bg-[#1d1a18] border border-[#eeeeee] rounded-[3px] p-1 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] text-[#8a8380] font-mono">Teto: R$</span>
                        <input
                          type="text"
                          value={tempTetoValor}
                          onChange={(e) => setTempTetoValor(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') salvarTeto(pilar.id, e);
                            if (e.key === 'Escape') setEditandoTetoPilar(null);
                          }}
                          autoFocus
                          className="w-24 bg-transparent text-xs font-mono text-[#eeeeee] focus:outline-none"
                        />
                        <button
                          onClick={(e) => salvarTeto(pilar.id, e)}
                          className="p-0.5 rounded-[3px] bg-[#fafafa] text-[#101010]"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditandoTetoPilar(null);
                          }}
                          className="p-0.5 rounded-[3px] bg-[#101010] text-[#8a8380]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={(e) => iniciarEdicaoTeto(pilar.id, pilar.limiteReais, e)}
                        className="flex items-center gap-1 text-xs text-[#8a8380] font-mono hover:text-[#eeeeee] cursor-pointer"
                        title="Clique para editar o teto"
                      >
                        <span>Teto: {formatarBRL(pilar.limiteReais)}</span>
                        <Edit2 className="w-2.5 h-2.5 text-[#4d4947]" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Hairline 2px Precision Progress Bar (Zero glow) */}
                <div className="w-full bg-[#1d1a18] h-1.5 rounded-[1px] overflow-hidden my-4">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${percentProgresso}%`,
                      backgroundColor: pilar.dentroDoLimite ? pilar.corHex : '#ee6018',
                    }}
                  />
                </div>
              </div>

              {/* Footer / Quick Add in Card */}
              {isAdicionandoAqui ? (
                <form 
                  onSubmit={(e) => submeterRapido(pilar.id, e)} 
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2 p-3 rounded-[3px] bg-[#161413] border border-[#3d3a39] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-xs font-mono text-[#eeeeee]">
                    <span>NOVO EM {pilar.titulo.toUpperCase()}</span>
                    <button 
                      type="button" 
                      onClick={() => setPilarAdicionando(null)}
                      className="text-[#8a8380] hover:text-[#eeeeee]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Descrição..."
                    value={rapidoTitulo}
                    onChange={(e) => setRapidoTitulo(e.target.value)}
                    autoFocus
                    className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2 py-1 text-xs text-[#eeeeee] focus:outline-none focus:border-[#eeeeee]"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Valor R$"
                      value={rapidoValor}
                      onChange={(e) => setRapidoValor(e.target.value)}
                      className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2 py-1 text-xs font-mono text-[#eeeeee] focus:outline-none focus:border-[#eeeeee]"
                    />
                    <button
                      type="submit"
                      className="h-7 px-3 rounded-[3px] bg-[#fafafa] text-[#101010] font-mono text-xs shrink-0 cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="pt-3 border-t border-[#1d1a18] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${pilar.dentroDoLimite ? 'bg-[#a0ca92]' : 'bg-[#ee6018]'}`} />
                    <span className="font-mono text-[11px] text-[#8a8380]">
                      {pilar.mensagemStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPilarAdicionando(pilar.id);
                      }}
                      className="font-mono text-[11px] text-[#eeeeee] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar</span>
                    </button>
                    <span className="font-mono text-[11px] text-[#4d4947] flex items-center gap-0.5">
                      <span>{isSelected ? 'FILTRADO' : 'FILTRAR'}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </span>
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
