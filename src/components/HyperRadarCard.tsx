import { useState, useEffect, useRef } from 'react';
import type { CalculoOrcamentario, CategoriaOrcamentaria } from '../types/finance';
import { formatarBRL, parseMoedaBR } from '../utils/calculations';
import { Sparkles, Wallet, PieChart, Edit2, Check, X } from 'lucide-react';

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
      // Velocidade do loop de respiração orgânica
      current += 0.028;
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

  // Geração de onda orgânica senoidal polar fechada (72 vértices polares)
  // r(theta) = r_base + sin(theta * freq + offset) * amplitude
  const generatePolarWave = (rBase: number, freq: number, offset: number, amplitude: number) => {
    const points: string[] = [];
    for (let i = 0; i <= numVertices; i++) {
      const theta = (i * 2 * Math.PI) / numVertices;
      // Modulação senoidal contínua com respiração harmônica
      const r = rBase + Math.sin(theta * freq + offset + tick) * amplitude;
      const x = cx + r * Math.cos(theta);
      const y = cy + r * Math.sin(theta);
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    points.push('Z');
    return points.join(' ');
  };

  // Onda Externa: Verde Esmeralda Neon (#00FF87)
  const pathOuterEmerald = generatePolarWave(78, 6, 0, isHovered ? 14 : 10);
  // Onda Interna: Roxo / Violeta Neon (#9D00FF)
  const pathInnerPurple = generatePolarWave(58, 6, Math.PI / 3, isHovered ? 12 : 8);

  // Ângulos e marcadores da grade polar exatamente como na imagem de referência
  const gridMarkers = [
    { label: '8', angleDeg: -90 },
    { label: '19', angleDeg: -45 },
    { label: '15', angleDeg: 0 },
    { label: '28', angleDeg: 45 },
    { label: '25', angleDeg: 90 },
    { label: '38', angleDeg: 135 },
    { label: '35', angleDeg: 180 },
    { label: '48', angleDeg: 225 },
  ];

  return (
    <div 
      className="hyper-card p-6 lg:p-7 flex flex-col justify-between relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Header com Título e Sparkle Pill */}
      <div className="flex items-center justify-between pb-4 border-b border-[#161924]">
        <div>
          <h2 className="text-lg lg:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Equilíbrio Harmônico 50-30-20
          </h2>
          <p className="text-xs text-[#9CA3AF]">
            Radar orgânico senoidal de respiração orçamentária contínua
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#00FF87]/15 border border-[#00FF87]/40 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[#00FF87] animate-star-pulse" />
          </div>
        </div>
      </div>

      {/* Top Row: Weekly, Monthly, Annual KPIs exatamente como na imagem */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#00FF87]" />
            <span className="font-semibold text-white">Semanal</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight font-mono-numeric text-white">
              {formatarBRL(calculos.saldoLivre / 4.3)}
            </span>
            <span className="text-xs font-mono text-[#00FF87]">↑ +19.6%</span>
          </div>
          <span className="text-[10px] text-[#4B5563] font-mono">
            vs semana anterior
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-1">
            <span className="text-[#00FF87] font-bold text-sm leading-none">+</span>
            <span className="font-semibold text-white">Mensal</span>
          </div>
          {editandoMensal ? (
            <div className="flex items-center gap-1 my-1">
              <span className="text-xs font-mono text-[#9CA3AF]">R$</span>
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
                className="w-24 bg-[#07080b] border border-[#00FF87] rounded px-1.5 py-0.5 text-xs font-mono text-white focus:outline-none"
              />
              <button
                onClick={() => {
                  const num = parseMoedaBR(tempMensalValor);
                  if (num >= 0 && onAjustarTotalGeral) onAjustarTotalGeral(num);
                  setEditandoMensal(false);
                }}
                className="text-[#00FF87] p-0.5"
              >
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setEditandoMensal(false)} className="text-[#9CA3AF] p-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => {
                setTempMensalValor(calculos.totalGastos.toString());
                setEditandoMensal(true);
              }}
              className="flex items-baseline gap-2 cursor-pointer group/mensal"
              title="Clique para editar despesas mensais totais"
            >
              <span className="text-2xl font-extrabold tracking-tight font-mono-numeric text-white group-hover/mensal:text-[#00FF87] transition-colors border-b border-transparent group-hover/mensal:border-dashed group-hover/mensal:border-[#00FF87]">
                {formatarBRL(calculos.totalGastos)}
              </span>
              <Edit2 className="w-3 h-3 text-[#00FF87]/60 group-hover/mensal:text-[#00FF87] opacity-60 group-hover/mensal:opacity-100 transition-opacity" />
            </div>
          )}
          <span className="text-[10px] text-[#4B5563] font-mono">
            despesas consolidadas
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-1">
            <span className="text-[#FF6B00] font-bold text-sm leading-none">●</span>
            <span className="font-semibold text-white">Anual</span>
          </div>
          <div 
            onClick={() => {
              if (onAtualizarRenda) {
                setValorTemp(rendaFamiliar.toString());
                setEditandoCentro(true);
              }
            }}
            className="flex items-baseline gap-2 cursor-pointer group/anual"
            title="Clique para editar capacidade anual (atualiza renda)"
          >
            <span className="text-2xl font-extrabold tracking-tight font-mono-numeric text-white group-hover/anual:text-[#FF6B00] transition-colors border-b border-transparent group-hover/anual:border-dashed group-hover/anual:border-[#FF6B00]">
              {formatarBRL(rendaFamiliar * 12)}
            </span>
            <Edit2 className="w-3 h-3 text-[#FF6B00]/60 group-hover/anual:text-[#FF6B00] opacity-60 group-hover/anual:opacity-100 transition-opacity" />
          </div>
          <span className="text-[10px] text-[#4B5563] font-mono">
            capacidade total anual
          </span>
        </div>
      </div>

      {/* Central Interactive Harmonic Wave Polar Radar */}
      <div className="relative w-full flex items-center justify-center my-4 select-none">
        <svg
          viewBox="0 0 350 350"
          className="w-full max-w-[340px] aspect-square overflow-visible"
        >
          <defs>
            {/* Glowing Drop Shadow Filters */}
            <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#00FF87" floodOpacity="0.8" />
            </filter>
            <filter id="purpleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#9D00FF" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Concentric Polar Grid Rings */}
          <circle cx={cx} cy={cy} r="130" fill="none" stroke="#161924" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx={cx} cy={cy} r="98" fill="none" stroke="#1c2233" strokeWidth="1" />
          <circle cx={cx} cy={cy} r="65" fill="none" stroke="#161924" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx={cx} cy={cy} r="35" fill="none" stroke="#1c2233" strokeWidth="1" />

          {/* Polar Axis Lines */}
          <line x1={cx} y1="30" x2={cx} y2="320" stroke="#161924" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="30" y1={cy} x2="320" y2={cy} stroke="#161924" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="72" y1="72" x2="278" y2="278" stroke="#161924" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="278" y1="72" x2="72" y2="278" stroke="#161924" strokeWidth="1" strokeDasharray="2 2" />

          {/* Perimeter Degree Labels (8, 19, 15, 28, 25, 38, 35, 48) */}
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
                fill="#4B5563"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="500"
              >
                {marker.label}
              </text>
            );
          })}

          {/* Inner Organic Sinusoidal Wave Loop (Neon Purple / Violet) */}
          <path
            d={pathInnerPurple}
            fill="none"
            stroke="#9D00FF"
            strokeWidth="2.4"
            filter="url(#purpleGlow)"
            className="transition-all duration-100"
          />

          {/* Outer Organic Sinusoidal Wave Loop (Neon Green / Emerald) */}
          <path
            d={pathOuterEmerald}
            fill="none"
            stroke="#00FF87"
            strokeWidth="2.8"
            filter="url(#emeraldGlow)"
            className="transition-all duration-100"
          />

          {/* Central Dark Disc with Polygon / Diamond Emblem (Editável ao clicar) */}
          <g
            className="cursor-pointer group/center"
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
              r="30" 
              fill="#07080b" 
              stroke="#222738" 
              strokeWidth="2" 
              className="group-hover/center:stroke-[#00FF87] transition-colors"
            />
            <circle cx={cx} cy={cy} r="25" fill="#0b0e14" />

            {/* Central Geometric Icon */}
            <path
              d={`M ${cx} ${cy - 14} L ${cx + 10} ${cy - 4} L ${cx} ${cy + 6} L ${cx - 10} ${cy - 4} Z`}
              fill="none"
              stroke="#00FF87"
              strokeWidth="1.8"
            />
            <path
              d={`M ${cx} ${cy - 14} L ${cx} ${cy + 6}`}
              stroke="#00FF87"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle cx={cx} cy={cy - 4} r="2.5" fill="#00D2FF" />
          </g>
        </svg>

        {/* Modal Inline Rápido de Edição de Renda */}
        {editandoCentro && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 rounded-2xl z-20 animate-fadeIn">
            <span className="text-xs font-bold text-[#00FF87] uppercase tracking-wider mb-2">
              Editar Renda Familiar
            </span>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-mono text-[#9CA3AF]">R$</span>
              <input
                type="text"
                value={valorTemp}
                onChange={(e) => setValorTemp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const num = parseMoedaBR(valorTemp);
                    if (num >= 0 && onAtualizarRenda) onAtualizarRenda(num);
                    setEditandoCentro(false);
                  }
                  if (e.key === 'Escape') setEditandoCentro(false);
                }}
                autoFocus
                className="w-36 bg-[#07080b] border border-[#00FF87] rounded-lg px-2.5 py-1 text-base font-mono font-bold text-white focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditandoCentro(false)}
                className="px-3 py-1 rounded-lg text-xs text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const num = parseMoedaBR(valorTemp);
                  if (num >= 0 && onAtualizarRenda) onAtualizarRenda(num);
                  setEditandoCentro(false);
                }}
                className="px-3 py-1 rounded-lg bg-[#00FF87] text-[#07080b] font-bold text-xs hover:bg-[#00FF87]/90 transition cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Area: Left Icon Badges + Right Category Breakdown (100% Editáveis) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-[#161924] items-center">
        {/* Left Badges (6 colunas) */}
        <div className="md:col-span-6 flex flex-wrap items-center gap-3">
          {/* Badge 1 (Purple Badge - Total Gasto) */}
          <div 
            onClick={() => onSelecionarFiltro?.('todos')}
            className="flex items-center gap-3 p-2.5 px-3 rounded-xl bg-[#141724] border border-[#222738] hover:border-[#9D00FF]/50 transition-all cursor-pointer flex-1 sm:flex-initial"
            title="Ver todas as despesas"
          >
            <div className="w-8 h-8 rounded-lg bg-[#9D00FF] flex items-center justify-center text-white shadow-md shadow-[#9D00FF]/30">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#9CA3AF] block leading-tight">Total Gasto</span>
              <span className="text-xs font-bold font-mono text-white">
                {formatarBRL(calculos.totalGastos)}
              </span>
            </div>
          </div>

          {/* Badge 2 (Dark Badge - Saldo Livre Editável) */}
          <div 
            onClick={() => {
              if (onAtualizarRenda) {
                setValorTemp(rendaFamiliar.toString());
                setEditandoCentro(true);
              }
            }}
            className="flex items-center gap-3 p-2.5 px-3 rounded-xl bg-[#0f1118] border border-[#1e2333] hover:border-[#00FF87]/50 transition-all cursor-pointer flex-1 sm:flex-initial"
            title="Clique para editar renda familiar"
          >
            <div className="w-8 h-8 rounded-lg bg-[#181d29] border border-[#2d354d] flex items-center justify-center text-[#00FF87]">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#9CA3AF] block leading-tight flex items-center gap-1">
                Saldo Livre <span className="text-[#00FF87]">✎</span>
              </span>
              <span className="text-xs font-bold font-mono text-[#00FF87]">
                {formatarBRL(calculos.saldoLivre)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Stats Breakdown (6 colunas com clique para filtrar e editar) */}
        <div className="md:col-span-6 flex flex-col justify-center sm:items-end gap-1.5 text-xs">
          {/* Fixas */}
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => onSelecionarFiltro?.('fixas')}
              className="text-[#9CA3AF] hover:text-[#00D2FF] transition cursor-pointer"
            >
              Contas Fixas (50%):
            </button>
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
                  className="w-20 bg-[#07080b] border border-[#00D2FF] rounded px-1 text-xs font-mono text-white text-right focus:outline-none"
                />
                <button 
                  onClick={() => {
                    const val = parseMoedaBR(tempCatValor);
                    if (val >= 0 && onAjustarTotalPilar) onAjustarTotalPilar('fixas', val);
                    setEditandoCat(null);
                  }} 
                  className="text-[#00FF87] cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditandoCat(null)} className="text-[#9CA3AF] cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span 
                onClick={() => {
                  setTempCatValor(calculos.totalFixas.toString());
                  setEditandoCat('fixas');
                }}
                className="font-mono font-bold text-white hover:text-[#00D2FF] cursor-pointer flex items-center gap-1 border-b border-transparent hover:border-dashed hover:border-[#00D2FF]"
                title="Clique para editar total de Contas Fixas"
              >
                {formatarBRL(calculos.totalFixas)}
                <Edit2 className="w-2.5 h-2.5 text-[#00D2FF]/60" />
              </span>
            )}
          </div>

          {/* Supérfluos */}
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => onSelecionarFiltro?.('superfluos')}
              className="text-[#9CA3AF] hover:text-[#9D00FF] transition cursor-pointer"
            >
              Gastos Supérfluos (30%):
            </button>
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
                  className="w-20 bg-[#07080b] border border-[#9D00FF] rounded px-1 text-xs font-mono text-white text-right focus:outline-none"
                />
                <button 
                  onClick={() => {
                    const val = parseMoedaBR(tempCatValor);
                    if (val >= 0 && onAjustarTotalPilar) onAjustarTotalPilar('superfluos', val);
                    setEditandoCat(null);
                  }} 
                  className="text-[#00FF87] cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditandoCat(null)} className="text-[#9CA3AF] cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span 
                onClick={() => {
                  setTempCatValor(calculos.totalSuperfluos.toString());
                  setEditandoCat('superfluos');
                }}
                className="font-mono font-bold text-white hover:text-[#9D00FF] cursor-pointer flex items-center gap-1 border-b border-transparent hover:border-dashed hover:border-[#9D00FF]"
                title="Clique para editar total de Gastos Supérfluos"
              >
                {formatarBRL(calculos.totalSuperfluos)}
                <Edit2 className="w-2.5 h-2.5 text-[#9D00FF]/60" />
              </span>
            )}
          </div>

          {/* Investimentos */}
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => onSelecionarFiltro?.('investimentos')}
              className="text-[#9CA3AF] hover:text-[#00FF87] transition cursor-pointer"
            >
              Aportes & Reserva (20%):
            </button>
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
                  className="w-20 bg-[#07080b] border border-[#00FF87] rounded px-1 text-xs font-mono text-white text-right focus:outline-none"
                />
                <button 
                  onClick={() => {
                    const val = parseMoedaBR(tempCatValor);
                    if (val >= 0 && onAjustarTotalPilar) onAjustarTotalPilar('investimentos', val);
                    setEditandoCat(null);
                  }} 
                  className="text-[#00FF87] cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditandoCat(null)} className="text-[#9CA3AF] cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span 
                onClick={() => {
                  setTempCatValor(calculos.totalInvestimentos.toString());
                  setEditandoCat('investimentos');
                }}
                className="font-mono font-bold text-[#00FF87] hover:underline cursor-pointer flex items-center gap-1 border-b border-transparent hover:border-dashed hover:border-[#00FF87]"
                title="Clique para editar total de Aportes & Reserva"
              >
                {formatarBRL(calculos.totalInvestimentos)}
                <Edit2 className="w-2.5 h-2.5 text-[#00FF87]/60" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
