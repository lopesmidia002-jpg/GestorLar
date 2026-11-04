import { useState, useEffect, useRef } from 'react';
import type { CalculoOrcamentario, CategoriaOrcamentaria } from '../types/finance';
import { formatarBRL, parseMoedaBR } from '../utils/calculations';
import { Edit2, Check, X } from 'lucide-react';

interface Props {
  calculos: CalculoOrcamentario;
  rendaFamiliar: number;
  filtroAtivo: CategoriaOrcamentaria | 'todos';
  onSelecionarFiltro: (filtro: CategoriaOrcamentaria | 'todos') => void;
  onAtualizarRenda?: (novaRenda: number) => void;
  onAjustarTotalPilar?: (categoria: CategoriaOrcamentaria, novoTotal: number) => void;
}

export const HyperStarburstCard = ({
  calculos,
  rendaFamiliar,
  filtroAtivo,
  onSelecionarFiltro,
  onAtualizarRenda,
  onAjustarTotalPilar,
}: Props) => {
  const [tick, setTick] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [editandoCentro, setEditandoCentro] = useState(false);
  const [valorTemp, setValorTemp] = useState(rendaFamiliar.toString());
  const [editandoCat, setEditandoCat] = useState<CategoriaOrcamentaria | null>(null);
  const [tempCatValor, setTempCatValor] = useState('');
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    let current = 0;
    const loop = () => {
      current += 0.026;
      setTick(current);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const cx = 135;
  const cy = 135;
  const numRaios = 32;

  // Monochromatic technical scale with functional accents
  const factoryColors = [
    '#ee6018', '#8a8380', '#4d4947', '#3d3a39',
    '#eeeeee', '#a0ca92', '#8a8380', '#3d3a39'
  ];

  const raios = Array.from({ length: numRaios }).map((_, i) => {
    const angleDeg = (i / numRaios) * 360 - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    
    const baseLen = 40;
    const wave = Math.sin(4 * Math.PI * (i / numRaios) + tick) * 5;
    const isHovered = hoveredIndex === i;
    const hoverBoost = isHovered ? 8 : 0;
    const totalLen = baseLen + wave + hoverBoost;

    const innerR = 48;
    const x1 = cx + innerR * Math.cos(angleRad);
    const y1 = cy + innerR * Math.sin(angleRad);
    const x2 = cx + (innerR + totalLen) * Math.cos(angleRad);
    const y2 = cy + (innerR + totalLen) * Math.sin(angleRad);

    const cor = factoryColors[i % factoryColors.length];

    return { x1, y1, x2, y2, cor, i };
  });

  const salvarEdicaoCat = (cat: CategoriaOrcamentaria) => {
    const val = parseMoedaBR(tempCatValor);
    if (val >= 0 && onAjustarTotalPilar) {
      onAjustarTotalPilar(cat, val);
    }
    setEditandoCat(null);
  };

  return (
    <div className="bg-[#101010] border border-[#3d3a39] rounded-[10px] overflow-hidden flex flex-col justify-between h-full">
      {/* macOS Terminal Header */}
      <div className="h-9 bg-[#161413] border-b border-[#3d3a39] px-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
          <span className="ml-2 font-mono text-[11px] uppercase tracking-[-0.24px] text-[#eeeeee]">
            SPECTRUM_360 // DISTRIBUIÇÃO ORÇAMENTÁRIA
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ee6018]" />
          <span className="font-mono text-[10px] text-[#8a8380]">RADIAL_SYS</span>
        </div>
      </div>

      {/* Main Grid: Left Stats + Right Starburst Graphic */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 items-center my-auto">
        {/* Left Column: KPIs & Legend (6 colunas) */}
        <div className="md:col-span-6 flex flex-col gap-5">
          {/* KPI Semanal */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-mono text-[11px] uppercase tracking-[-0.24px] text-[#b8b3b0]">
                Média Semanal
              </span>
              <span className="font-mono text-[11px] text-[#a0ca92]">↑ 19.6%</span>
            </div>
            <div className="text-[32px] font-normal tracking-[-1.12px] leading-tight font-geist text-[#eeeeee]">
              {formatarBRL(rendaFamiliar / 4.3)}
            </div>
            <span className="text-[11px] text-[#8a8380] font-mono">
              vs base estimada mensal
            </span>
          </div>

          {/* Categorias / Legend (100% Editáveis) */}
          <div className="space-y-2 pt-3 border-t border-[#1d1a18]">
            {/* Fixas */}
            <div className={`w-full flex items-center justify-between p-2 rounded-[3px] border text-xs transition ${
              filtroAtivo === 'fixas' ? 'bg-[#161413] border-[#eeeeee]' : 'border-[#1d1a18] hover:border-[#3d3a39]'
            }`}>
              <button
                type="button"
                onClick={() => onSelecionarFiltro(filtroAtivo === 'fixas' ? 'todos' : 'fixas')}
                className="flex items-center gap-2 cursor-pointer font-mono text-[11px] text-[#eeeeee]"
              >
                <span className="w-2 h-2 rounded-full bg-[#eeeeee]" />
                <span>50% CONTAS FIXAS</span>
              </button>
              {editandoCat === 'fixas' ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempCatValor}
                    onChange={(e) => setTempCatValor(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') salvarEdicaoCat('fixas');
                      if (e.key === 'Escape') setEditandoCat(null);
                    }}
                    autoFocus
                    className="w-20 bg-[#101010] border border-[#eeeeee] rounded-[3px] px-1 text-xs font-mono text-[#eeeeee] text-right focus:outline-none"
                  />
                  <button onClick={() => salvarEdicaoCat('fixas')} className="text-[#a0ca92]"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditandoCat(null)} className="text-[#8a8380]"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setTempCatValor(calculos.totalFixas.toString());
                    setEditandoCat('fixas');
                  }}
                  className="font-mono text-xs text-[#eeeeee] cursor-pointer hover:underline flex items-center gap-1"
                  title="Editar total de Contas Fixas"
                >
                  {formatarBRL(calculos.totalFixas)}
                  <Edit2 className="w-2.5 h-2.5 text-[#4d4947]" />
                </span>
              )}
            </div>

            {/* Supérfluos */}
            <div className={`w-full flex items-center justify-between p-2 rounded-[3px] border text-xs transition ${
              filtroAtivo === 'superfluos' ? 'bg-[#161413] border-[#ee6018]' : 'border-[#1d1a18] hover:border-[#3d3a39]'
            }`}>
              <button
                type="button"
                onClick={() => onSelecionarFiltro(filtroAtivo === 'superfluos' ? 'todos' : 'superfluos')}
                className="flex items-center gap-2 cursor-pointer font-mono text-[11px] text-[#eeeeee]"
              >
                <span className="w-2 h-2 rounded-full bg-[#ee6018]" />
                <span>30% SUPÉRFLUOS</span>
              </button>
              {editandoCat === 'superfluos' ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempCatValor}
                    onChange={(e) => setTempCatValor(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') salvarEdicaoCat('superfluos');
                      if (e.key === 'Escape') setEditandoCat(null);
                    }}
                    autoFocus
                    className="w-20 bg-[#101010] border border-[#ee6018] rounded-[3px] px-1 text-xs font-mono text-[#eeeeee] text-right focus:outline-none"
                  />
                  <button onClick={() => salvarEdicaoCat('superfluos')} className="text-[#a0ca92]"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditandoCat(null)} className="text-[#8a8380]"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setTempCatValor(calculos.totalSuperfluos.toString());
                    setEditandoCat('superfluos');
                  }}
                  className="font-mono text-xs text-[#eeeeee] cursor-pointer hover:underline flex items-center gap-1"
                  title="Editar total de Supérfluos"
                >
                  {formatarBRL(calculos.totalSuperfluos)}
                  <Edit2 className="w-2.5 h-2.5 text-[#4d4947]" />
                </span>
              )}
            </div>

            {/* Aportes */}
            <div className={`w-full flex items-center justify-between p-2 rounded-[3px] border text-xs transition ${
              filtroAtivo === 'investimentos' ? 'bg-[#161413] border-[#a0ca92]' : 'border-[#1d1a18] hover:border-[#3d3a39]'
            }`}>
              <button
                type="button"
                onClick={() => onSelecionarFiltro(filtroAtivo === 'investimentos' ? 'todos' : 'investimentos')}
                className="flex items-center gap-2 cursor-pointer font-mono text-[11px] text-[#eeeeee]"
              >
                <span className="w-2 h-2 rounded-full bg-[#a0ca92]" />
                <span>20% APORTES</span>
              </button>
              {editandoCat === 'investimentos' ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempCatValor}
                    onChange={(e) => setTempCatValor(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') salvarEdicaoCat('investimentos');
                      if (e.key === 'Escape') setEditandoCat(null);
                    }}
                    autoFocus
                    className="w-20 bg-[#101010] border border-[#a0ca92] rounded-[3px] px-1 text-xs font-mono text-[#eeeeee] text-right focus:outline-none"
                  />
                  <button onClick={() => salvarEdicaoCat('investimentos')} className="text-[#a0ca92]"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditandoCat(null)} className="text-[#8a8380]"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setTempCatValor(calculos.totalInvestimentos.toString());
                    setEditandoCat('investimentos');
                  }}
                  className="font-mono text-xs text-[#eeeeee] cursor-pointer hover:underline flex items-center gap-1"
                  title="Editar total de Aportes"
                >
                  {formatarBRL(calculos.totalInvestimentos)}
                  <Edit2 className="w-2.5 h-2.5 text-[#4d4947]" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Starburst 360° Circular Graphic */}
        <div className="md:col-span-6 flex flex-col items-center justify-center relative">
          <svg
            viewBox="0 0 270 270"
            className="w-full max-w-[230px] aspect-square select-none overflow-visible"
          >
            {/* Concentric Guide Circles */}
            <circle cx={cx} cy={cy} r="102" fill="none" stroke="#1d1a18" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={cx} cy={cy} r="48" fill="none" stroke="#3d3a39" strokeWidth="1" />

            {/* Radial Rays (Flat, zero-shadow precision vectors) */}
            {raios.map((raio) => (
              <line
                key={raio.i}
                x1={raio.x1.toFixed(1)}
                y1={raio.y1.toFixed(1)}
                x2={raio.x2.toFixed(1)}
                y2={raio.y2.toFixed(1)}
                stroke={raio.cor}
                strokeWidth={hoveredIndex === raio.i ? '3' : '1.8'}
                strokeLinecap="round"
                className="cursor-pointer transition-all duration-150"
                style={{
                  opacity: hoveredIndex !== null && hoveredIndex !== raio.i ? 0.35 : 1,
                }}
                onMouseEnter={() => setHoveredIndex(raio.i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))}

            {/* Center Core Disc */}
            <g
              className="cursor-pointer"
              onClick={() => {
                if (onAtualizarRenda) {
                  setValorTemp(rendaFamiliar.toString());
                  setEditandoCentro(true);
                }
              }}
            >
              <circle 
                cx={cx} 
                cy={cy} 
                r="45" 
                fill="#161413" 
                stroke="#3d3a39"
                strokeWidth="1"
              />
              <text
                x={cx}
                y={cy - 8}
                textAnchor="middle"
                className="fill-[#8a8380] text-[9px] font-mono uppercase tracking-tight select-none"
              >
                RENDA TOTAL
              </text>
              <text
                x={cx}
                y={cy + 8}
                textAnchor="middle"
                className="fill-[#eeeeee] text-[12px] font-mono font-medium select-none"
              >
                {formatarBRL(rendaFamiliar)}
              </text>
            </g>
          </svg>

          {/* Modal Inline Renda Center */}
          {editandoCentro && (
            <div className="absolute inset-0 bg-[#101010]/95 flex flex-col items-center justify-center p-4 z-20 border border-[#3d3a39] rounded-[8px]">
              <span className="font-mono text-xs text-[#eeeeee] mb-2">AJUSTAR RENDA BASE</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={valorTemp}
                  onChange={(e) => setValorTemp(e.target.value)}
                  className="bg-[#1d1a18] border border-[#eeeeee] rounded-[3px] px-2 py-1 text-sm font-mono text-[#eeeeee] w-28 text-center"
                  autoFocus
                />
                <button
                  onClick={() => {
                    const num = parseMoedaBR(valorTemp);
                    if (num >= 0 && onAtualizarRenda) onAtualizarRenda(num);
                    setEditandoCentro(false);
                  }}
                  className="p-1 bg-[#fafafa] text-[#101010] rounded-[3px]"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditandoCentro(false)}
                  className="p-1 bg-[#1d1a18] text-[#8a8380] rounded-[3px]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Terminal Footer */}
      <div className="h-8 bg-[#161413] border-t border-[#1d1a18] px-4 flex items-center justify-between text-[11px] font-mono text-[#8a8380]">
        <span>CH_02: 32 POLAR RADIAL HARMONICS</span>
        <span className="text-[#eeeeee]">OK // SYNCED</span>
      </div>
    </div>
  );
};
