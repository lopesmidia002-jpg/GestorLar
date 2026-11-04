import { useState, useEffect, useRef } from 'react';
import type { CalculoOrcamentario, CategoriaOrcamentaria } from '../types/finance';
import { formatarBRL, parseMoedaBR } from '../utils/calculations';
import { Wallet, PieChart, Edit2, Check, X } from 'lucide-react';

interface Props {
  calculos: CalculoOrcamentario;
  rendaFamiliar: number;
  onSelecionarFiltro?: (filtro: CategoriaOrcamentaria | 'todos') => void;
  onAtualizarRenda?: (novaRenda: number) => void;
  onAjustarTotalPilar?: (categoria: CategoriaOrcamentaria, novoTotal: number) => void;
  onAjustarTotalGeral?: (novoTotal: number) => void;
}

export const HyperRadarCard = ({ 
  calculos, 
  rendaFamiliar,
  onSelecionarFiltro,
  onAtualizarRenda,
  onAjustarTotalPilar,
  onAjustarTotalGeral,
}: Props) => {
  const [tick, setTick] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [editandoCentro, setEditandoCentro] = useState(false);
  const [valorTemp, setValorTemp] = useState(rendaFamiliar.toString());
  const [editandoCat, setEditandoCat] = useState<CategoriaOrcamentaria | null>(null);
  const [tempCatValor, setTempCatValor] = useState('');
  const [editandoMensal, setEditandoMensal] = useState(false);
  const [tempMensalValor, setTempMensalValor] = useState(calculos.totalGastos.toString());
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    let current = 0;
    const loop = () => {
      current += 0.025;
      setTick(current);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const cx = 175;
  const cy = 175;
  const numVertices = 72;

  // Polar closed wave: r(theta) = r_base + sin(theta * freq + offset) * amp
  const generatePolarWave = (rBase: number, freq: number, offset: number, amplitude: number) => {
    const points: string[] = [];
    for (let i = 0; i <= numVertices; i++) {
      const theta = (i * 2 * Math.PI) / numVertices;
      const r = rBase + Math.sin(theta * freq + offset + tick) * amplitude;
      const x = cx + r * Math.cos(theta);
      const y = cy + r * Math.sin(theta);
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    points.push('Z');
    return points.join(' ');
  };

  const pathOuterGreen = generatePolarWave(76, 6, 0, isHovered ? 12 : 8);
  const pathInnerOrange = generatePolarWave(56, 6, Math.PI / 3, isHovered ? 10 : 7);

  const gridMarkers = [
    { label: '01', angleDeg: -90 },
    { label: '02', angleDeg: -45 },
    { label: '03', angleDeg: 0 },
    { label: '04', angleDeg: 45 },
    { label: '05', angleDeg: 90 },
    { label: '06', angleDeg: 135 },
    { label: '07', angleDeg: 180 },
    { label: '08', angleDeg: 225 },
  ];

  return (
    <div 
      className="bg-[#101010] border border-[#3d3a39] rounded-[10px] overflow-hidden flex flex-col justify-between"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* macOS Terminal Window Header */}
      <div className="h-9 bg-[#161413] border-b border-[#3d3a39] px-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
          <span className="ml-2 font-mono text-[11px] uppercase tracking-[-0.24px] text-[#eeeeee]">
            RADAR_EQUILIBRIUM // HARMONIA SENOIDAL 50-30-20
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92]" />
          <span className="font-mono text-[10px] text-[#8a8380]">POLAR_FEED</span>
        </div>
      </div>

      {/* Top Metric Row: 3 Columns with 1px #1d1a18 dividers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-[#1d1a18]">
        {/* Metric 1: Semanal */}
        <div className="p-5 border-b sm:border-b-0 sm:border-r border-[#1d1a18]">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-mono text-[11px] uppercase tracking-[-0.24px] text-[#b8b3b0]">
              Saldo Semanal
            </span>
            <span className="font-mono text-[11px] text-[#a0ca92]">↑ 19.6%</span>
          </div>
          <div className="text-[28px] font-normal tracking-[-1.12px] leading-tight font-geist text-[#eeeeee]">
            {formatarBRL(calculos.saldoLivre / 4.3)}
          </div>
          <span className="text-[11px] text-[#8a8380] font-mono">
            vs semana anterior
          </span>
        </div>

        {/* Metric 2: Mensal Consolidado */}
        <div className="p-5 border-b sm:border-b-0 sm:border-r border-[#1d1a18]">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-mono text-[11px] uppercase tracking-[-0.24px] text-[#b8b3b0]">
              Despesas Mensais
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#ee6018]" />
          </div>
          {editandoMensal ? (
            <div className="flex items-center gap-1 my-1">
              <span className="text-xs font-mono text-[#8a8380]">R$</span>
              <input
                type="text"
                value={tempMensalValor}
                onChange={(e) => setTempMensalValor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const num = parseMoedaBR(tempMensalValor);
                    if (num >= 0 && onAjustarTotalGeral) onAjustarTotalGeral(num);
                    setEditandoMensal(false);
                  }
                  if (e.key === 'Escape') setEditandoMensal(false);
                }}
                autoFocus
                className="w-24 bg-[#1d1a18] border border-[#eeeeee] rounded-[3px] p-1 text-sm font-mono text-[#eeeeee] focus:outline-none"
              />
              <button
                onClick={() => {
                  const num = parseMoedaBR(tempMensalValor);
                  if (num >= 0 && onAjustarTotalGeral) onAjustarTotalGeral(num);
                  setEditandoMensal(false);
                }}
                className="p-1 rounded-[3px] bg-[#fafafa] text-[#101010]"
              >
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setEditandoMensal(false)} className="p-1 rounded-[3px] bg-[#1d1a18] text-[#8a8380]">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => {
                setTempMensalValor(calculos.totalGastos.toString());
                setEditandoMensal(true);
              }}
              className="cursor-pointer group"
              title="Clique para editar despesas mensais consolidadas"
            >
              <div className="text-[28px] font-normal tracking-[-1.12px] leading-tight font-geist text-[#eeeeee] group-hover:text-[#fafafa] flex items-baseline justify-between">
                <span>{formatarBRL(calculos.totalGastos)}</span>
                <Edit2 className="w-3 h-3 text-[#4d4947] group-hover:text-[#eeeeee]" />
              </div>
              <span className="text-[11px] text-[#8a8380] font-mono">
                despesas consolidadas
              </span>
            </div>
          )}
        </div>

        {/* Metric 3: Capacidade Anual */}
        <div className="p-5">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-mono text-[11px] uppercase tracking-[-0.24px] text-[#b8b3b0]">
              Capacidade Anual
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92]" />
          </div>
          <div 
            onClick={() => {
              if (onAtualizarRenda) {
                setValorTemp(rendaFamiliar.toString());
                setEditandoCentro(true);
              }
            }}
            className="cursor-pointer group"
            title="Clique para editar renda"
          >
            <div className="text-[28px] font-normal tracking-[-1.12px] leading-tight font-geist text-[#eeeeee] group-hover:text-[#fafafa] flex items-baseline justify-between">
              <span>{formatarBRL(rendaFamiliar * 12)}</span>
              <Edit2 className="w-3 h-3 text-[#4d4947] group-hover:text-[#eeeeee]" />
            </div>
            <span className="text-[11px] text-[#8a8380] font-mono">
              renda líquida 12M
            </span>
          </div>
        </div>
      </div>

      {/* Central Technical Polar Radar Graphic */}
      <div className="relative w-full flex items-center justify-center p-6 select-none">
        <svg
          viewBox="0 0 350 350"
          className="w-full max-w-[320px] aspect-square overflow-visible"
        >
          {/* Concentric Polar Grid Rings */}
          <circle cx={cx} cy={cy} r="128" fill="none" stroke="#1d1a18" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx={cx} cy={cy} r="96" fill="none" stroke="#3d3a39" strokeWidth="1" />
          <circle cx={cx} cy={cy} r="64" fill="none" stroke="#1d1a18" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx={cx} cy={cy} r="32" fill="none" stroke="#3d3a39" strokeWidth="1" />

          {/* Polar Axis Lines */}
          <line x1={cx} y1="30" x2={cx} y2="320" stroke="#1d1a18" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="30" y1={cy} x2="320" y2={cy} stroke="#1d1a18" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="72" y1="72" x2="278" y2="278" stroke="#1d1a18" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="278" y1="72" x2="72" y2="278" stroke="#1d1a18" strokeWidth="1" strokeDasharray="2 2" />

          {/* Axis Labels */}
          {gridMarkers.map((marker, idx) => {
            const rad = (marker.angleDeg * Math.PI) / 180;
            const labelR = 142;
            const lx = cx + labelR * Math.cos(rad);
            const ly = cy + labelR * Math.sin(rad) + 3;
            return (
              <text
                key={idx}
                x={lx}
                y={ly}
                textAnchor="middle"
                fill="#8a8380"
                fontSize="9"
                fontFamily="monospace"
              >
                {marker.label}
              </text>
            );
          })}

          {/* Inner Organic Sinusoidal Loop: Signal Orange (#ee6018) */}
          <path
            d={pathInnerOrange}
            fill="none"
            stroke="#ee6018"
            strokeWidth="1.5"
            className="transition-all duration-100"
          />

          {/* Outer Organic Sinusoidal Loop: Metric Green (#a0ca92) */}
          <path
            d={pathOuterGreen}
            fill="none"
            stroke="#a0ca92"
            strokeWidth="1.8"
            className="transition-all duration-100"
          />

          {/* Central Technical Disc */}
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
              r="28" 
              fill="#161413" 
              stroke="#3d3a39" 
              strokeWidth="1.5" 
            />
            <circle cx={cx} cy={cy} r="22" fill="#101010" />

            {/* Geometric Diamond Core */}
            <path
              d={`M ${cx} ${cy - 12} L ${cx + 8} ${cy - 3} L ${cx} ${cy + 6} L ${cx - 8} ${cy - 3} Z`}
              fill="none"
              stroke="#eeeeee"
              strokeWidth="1.2"
            />
            <circle cx={cx} cy={cy - 3} r="2" fill="#ee6018" />
          </g>
        </svg>

        {/* Modal Inline Renda Center */}
        {editandoCentro && (
          <div className="absolute inset-0 bg-[#101010]/95 flex flex-col items-center justify-center p-4 z-20 border border-[#3d3a39] rounded-[8px]">
            <span className="font-mono text-xs text-[#eeeeee] mb-2">AJUSTAR RENDA FAMILIAR</span>
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

      {/* Bottom Breakdown: 3 Columns / Badges */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-5 border-t border-[#1d1a18] items-center">
        {/* Left Badges (6 cols) */}
        <div className="md:col-span-6 flex flex-wrap items-center gap-3">
          <button 
            type="button"
            onClick={() => onSelecionarFiltro?.('todos')}
            className="flex items-center gap-2.5 p-2 px-3 rounded-[3px] bg-[#161413] border border-[#3d3a39] hover:border-[#fafafa] text-left cursor-pointer"
          >
            <PieChart className="w-3.5 h-3.5 text-[#8a8380]" />
            <div>
              <span className="text-[10px] font-mono uppercase text-[#8a8380] block">Total Gasto</span>
              <span className="text-xs font-mono text-[#eeeeee]">
                {formatarBRL(calculos.totalGastos)}
              </span>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => {
              if (onAtualizarRenda) {
                setValorTemp(rendaFamiliar.toString());
                setEditandoCentro(true);
              }
            }}
            className="flex items-center gap-2.5 p-2 px-3 rounded-[3px] bg-[#161413] border border-[#3d3a39] hover:border-[#fafafa] text-left cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5 text-[#a0ca92]" />
            <div>
              <span className="text-[10px] font-mono uppercase text-[#8a8380] block">Saldo Livre</span>
              <span className="text-xs font-mono text-[#a0ca92]">
                {formatarBRL(calculos.saldoLivre)}
              </span>
            </div>
          </button>
        </div>

        {/* Right Stats Breakdown (6 cols) */}
        <div className="md:col-span-6 flex flex-col justify-center sm:items-end gap-1.5 text-xs font-mono">
          {/* Fixas */}
          <div className="flex items-center gap-2">
            <span 
              onClick={() => onSelecionarFiltro?.('fixas')}
              className="text-[#8a8380] hover:text-[#eeeeee] cursor-pointer"
            >
              FIXAS (50%):
            </span>
            {editandoCat === 'fixas' ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempCatValor}
                  onChange={(e) => setTempCatValor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseMoedaBR(tempCatValor);
                      if (val >= 0 && onAjustarTotalPilar) onAjustarTotalPilar('fixas', val);
                      setEditandoCat(null);
                    }
                    if (e.key === 'Escape') setEditandoCat(null);
                  }}
                  autoFocus
                  className="w-20 bg-[#101010] border border-[#eeeeee] rounded-[3px] px-1 text-xs font-mono text-[#eeeeee] text-right focus:outline-none"
                />
                <button 
                  onClick={() => {
                    const val = parseMoedaBR(tempCatValor);
                    if (val >= 0 && onAjustarTotalPilar) onAjustarTotalPilar('fixas', val);
                    setEditandoCat(null);
                  }} 
                  className="text-[#a0ca92]"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditandoCat(null)} className="text-[#8a8380]">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span 
                onClick={() => {
                  setTempCatValor(calculos.totalFixas.toString());
                  setEditandoCat('fixas');
                }}
                className="text-[#eeeeee] hover:underline cursor-pointer flex items-center gap-1"
                title="Editar total de Contas Fixas"
              >
                {formatarBRL(calculos.totalFixas)}
                <Edit2 className="w-2.5 h-2.5 text-[#4d4947]" />
              </span>
            )}
          </div>

          {/* Supérfluos */}
          <div className="flex items-center gap-2">
            <span 
              onClick={() => onSelecionarFiltro?.('superfluos')}
              className="text-[#8a8380] hover:text-[#ee6018] cursor-pointer"
            >
              SUPÉRFLUOS (30%):
            </span>
            {editandoCat === 'superfluos' ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempCatValor}
                  onChange={(e) => setTempCatValor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseMoedaBR(tempCatValor);
                      if (val >= 0 && onAjustarTotalPilar) onAjustarTotalPilar('superfluos', val);
                      setEditandoCat(null);
                    }
                    if (e.key === 'Escape') setEditandoCat(null);
                  }}
                  autoFocus
                  className="w-20 bg-[#101010] border border-[#ee6018] rounded-[3px] px-1 text-xs font-mono text-[#eeeeee] text-right focus:outline-none"
                />
                <button 
                  onClick={() => {
                    const val = parseMoedaBR(tempCatValor);
                    if (val >= 0 && onAjustarTotalPilar) onAjustarTotalPilar('superfluos', val);
                    setEditandoCat(null);
                  }} 
                  className="text-[#a0ca92]"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditandoCat(null)} className="text-[#8a8380]">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span 
                onClick={() => {
                  setTempCatValor(calculos.totalSuperfluos.toString());
                  setEditandoCat('superfluos');
                }}
                className="text-[#ee6018] hover:underline cursor-pointer flex items-center gap-1"
                title="Editar total de Supérfluos"
              >
                {formatarBRL(calculos.totalSuperfluos)}
                <Edit2 className="w-2.5 h-2.5 text-[#4d4947]" />
              </span>
            )}
          </div>

          {/* Investimentos */}
          <div className="flex items-center gap-2">
            <span 
              onClick={() => onSelecionarFiltro?.('investimentos')}
              className="text-[#8a8380] hover:text-[#a0ca92] cursor-pointer"
            >
              INVESTIMENTOS (20%):
            </span>
            {editandoCat === 'investimentos' ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempCatValor}
                  onChange={(e) => setTempCatValor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseMoedaBR(tempCatValor);
                      if (val >= 0 && onAjustarTotalPilar) onAjustarTotalPilar('investimentos', val);
                      setEditandoCat(null);
                    }
                    if (e.key === 'Escape') setEditandoCat(null);
                  }}
                  autoFocus
                  className="w-20 bg-[#101010] border border-[#a0ca92] rounded-[3px] px-1 text-xs font-mono text-[#eeeeee] text-right focus:outline-none"
                />
                <button 
                  onClick={() => {
                    const val = parseMoedaBR(tempCatValor);
                    if (val >= 0 && onAjustarTotalPilar) onAjustarTotalPilar('investimentos', val);
                    setEditandoCat(null);
                  }} 
                  className="text-[#a0ca92]"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditandoCat(null)} className="text-[#8a8380]">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span 
                onClick={() => {
                  setTempCatValor(calculos.totalInvestimentos.toString());
                  setEditandoCat('investimentos');
                }}
                className="text-[#a0ca92] hover:underline cursor-pointer flex items-center gap-1"
                title="Editar total de Investimentos"
              >
                {formatarBRL(calculos.totalInvestimentos)}
                <Edit2 className="w-2.5 h-2.5 text-[#4d4947]" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
