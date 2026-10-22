import { useState, useEffect, useRef } from 'react';
import type { CalculoOrcamentario, CategoriaOrcamentaria } from '../types/finance';
import { formatarBRL, formatarPercentual, parseMoedaBR } from '../utils/calculations';
import { Edit2, Check, X } from 'lucide-react';

interface Props {
  calculos: CalculoOrcamentario;
  rendaFamiliar: number;
  onAtualizarRenda?: (novaRenda: number) => void;
  onAjustarTotalPilar?: (categoria: CategoriaOrcamentaria, novoTotal: number) => void;
}

export const HyperWaveCard = ({ 
  calculos, 
  rendaFamiliar,
  onAtualizarRenda,
  onAjustarTotalPilar,
}: Props) => {
  const [tick, setTick] = useState(0);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [editandoRenda, setEditandoRenda] = useState(false);
  const [tempRenda, setTempRenda] = useState(rendaFamiliar.toString());
  const [editandoAporte, setEditandoAporte] = useState(false);
  const [tempAporte, setTempAporte] = useState(calculos.totalInvestimentos.toString());
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    let current = 0;
    const loop = () => {
      current += 0.035;
      setTick(current);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const width = 340;
  const height = 190;

  // Gerador de ondas com envelope suave (estreito nas pontas, aberto no meio como na imagem)
  const generateWave = (baseY: number, freq: number, phase: number, amp: number, invert = false) => {
    const points: string[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * width;
      // Envelope senoidal normalizado de 0 a 1 para abrir no centro
      const envelope = Math.sin((i / steps) * Math.PI);
      const direction = invert ? -1 : 1;
      const y = baseY + Math.sin(i * freq + phase + tick) * amp * envelope * direction;
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return points.join(' ');
  };

  const pathCyan = generateWave(75, 0.22, 0, 24, false);
  const pathEmerald = generateWave(75, 0.22, 0.4, 24, true);

  const pathYellow = generateWave(140, 0.20, Math.PI / 4, 20, false);
  const pathMagenta = generateWave(140, 0.20, Math.PI / 4 + 0.5, 20, true);

  return (
    <div className="hyper-card p-5 flex flex-col justify-between relative overflow-hidden h-full">
      {/* Top Header Metrics (100% Editáveis: Mensal e Projeção Anual) */}
      <div className="grid grid-cols-2 gap-4 pb-3 border-b border-[#161924]">
        {/* Mensal / Renda Editável */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF] mb-1">
            <span className="text-[#00FF87] font-bold text-sm leading-none">+</span>
            <span className="font-semibold text-white">Mensal Livre</span>
          </div>

          {editandoRenda ? (
            <div className="flex items-center gap-1 bg-[#07080b] border border-[#00FF87] rounded-lg p-1 my-1 shadow-lg shadow-[#00FF87]/20">
              <span className="text-xs font-mono text-[#9CA3AF]">R$</span>
              <input
                type="text"
                value={tempRenda}
                onChange={(e) => setTempRenda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const num = parseMoedaBR(tempRenda);
                    if (num >= 0 && onAtualizarRenda) onAtualizarRenda(num);
                    setEditandoRenda(false);
                  }
                  if (e.key === 'Escape') setEditandoRenda(false);
                }}
                autoFocus
                className="w-24 bg-transparent text-sm font-bold font-mono text-white focus:outline-none"
              />
              <button
                onClick={() => {
                  const num = parseMoedaBR(tempRenda);
                  if (num >= 0 && onAtualizarRenda) onAtualizarRenda(num);
                  setEditandoRenda(false);
                }}
                className="p-1 rounded bg-[#00FF87] text-[#07080b] cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setEditandoRenda(false)} className="p-1 rounded bg-[#1e2333] text-[#9CA3AF] cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => {
                if (onAtualizarRenda) {
                  setTempRenda(rendaFamiliar.toString());
                  setEditandoRenda(true);
                }
              }}
              className="group/mensal cursor-pointer"
              title="Clique para editar a renda familiar base"
            >
              <div className="text-xl lg:text-2xl font-extrabold tracking-tight font-mono-numeric text-white group-hover/mensal:text-[#00FF87] transition-colors flex items-baseline gap-1">
                <span className="border-b border-transparent group-hover/mensal:border-dashed group-hover/mensal:border-[#00FF87]">{formatarBRL(calculos.saldoLivre)}</span>
                <Edit2 className="w-3 h-3 text-[#00FF87]/60 group-hover/mensal:text-[#00FF87] opacity-60 group-hover/mensal:opacity-100 transition-opacity" />
              </div>
              <div className="text-[10px] text-[#00FF87] font-mono mt-0.5 flex items-center gap-1">
                <span>↑ {formatarPercentual(100 - calculos.taxaComprometimento)}</span>
                <span className="text-[#9CA3AF]">livre da renda ({formatarBRL(rendaFamiliar)})</span>
              </div>
            </div>
          )}
        </div>

        {/* Projeção Anual / Investimentos Editável */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF] mb-1">
            <span className="text-[#FFD600] font-bold text-sm leading-none">⚡</span>
            <span className="font-semibold text-white">Projeção Anual</span>
          </div>

          {editandoAporte ? (
            <div className="flex items-center gap-1 bg-[#07080b] border border-[#FFD600] rounded-lg p-1 my-1 shadow-lg shadow-[#FFD600]/20">
              <span className="text-xs font-mono text-[#9CA3AF]">R$</span>
              <input
                type="text"
                value={tempAporte}
                onChange={(e) => setTempAporte(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const num = parseMoedaBR(tempAporte);
                    if (num >= 0 && onAjustarTotalPilar) onAjustarTotalPilar('investimentos', num);
                    setEditandoAporte(false);
                  }
                  if (e.key === 'Escape') setEditandoAporte(false);
                }}
                autoFocus
                className="w-24 bg-transparent text-sm font-bold font-mono text-white focus:outline-none"
              />
              <button
                onClick={() => {
                  const num = parseMoedaBR(tempAporte);
                  if (num >= 0 && onAjustarTotalPilar) onAjustarTotalPilar('investimentos', num);
                  setEditandoAporte(false);
                }}
                className="p-1 rounded bg-[#FFD600] text-[#07080b] cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setEditandoAporte(false)} className="p-1 rounded bg-[#1e2333] text-[#9CA3AF] cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => {
                if (onAjustarTotalPilar) {
                  setTempAporte(calculos.totalInvestimentos.toString());
                  setEditandoAporte(true);
                }
              }}
              className="group/anual cursor-pointer"
              title="Clique para editar o aporte mensal e recalcular a projeção anual"
            >
              <div className="text-xl lg:text-2xl font-extrabold tracking-tight font-mono-numeric text-white group-hover/anual:text-[#FFD600] transition-colors flex items-baseline gap-1">
                <span className="border-b border-transparent group-hover/anual:border-dashed group-hover/anual:border-[#FFD600]">{formatarBRL(calculos.totalInvestimentos * 12)}</span>
                <Edit2 className="w-3 h-3 text-[#FFD600]/60 group-hover/anual:text-[#FFD600] opacity-60 group-hover/anual:opacity-100 transition-opacity" />
              </div>
              <div className="text-[10px] text-[#00D2FF] font-mono mt-0.5 flex items-center gap-1">
                <span>↑ +12.4%</span>
                <span className="text-[#9CA3AF]">({formatarBRL(calculos.totalInvestimentos)}/mês)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Sinusoidal Wave Graphic Area */}
      <div 
        className="relative w-full my-auto py-2 cursor-crosshair select-none"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHoverX(e.clientX - rect.left);
        }}
        onMouseLeave={() => setHoverX(null)}
      >
        {/* Left Axis Values */}
        <div className="absolute left-0 top-3 text-[10px] font-mono text-[#4B5563]">169</div>
        <div className="absolute left-0 top-[48%] -translate-y-1/2 text-[10px] font-mono text-[#4B5563]">269</div>
        <div className="absolute left-0 bottom-3 text-[10px] font-mono text-[#4B5563]">369</div>

        {/* Right Axis Values */}
        <div className="absolute right-0 top-3 text-[10px] font-mono text-[#4B5563]">2,109</div>
        <div className="absolute right-0 bottom-4 text-[10px] font-mono text-[#4B5563]">3,699</div>

        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto px-6 overflow-visible"
        >
          {/* Subtle horizontal grid lines */}
          <line x1="25" y1="75" x2={width - 25} y2="75" stroke="#161924" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="25" y1="140" x2={width - 25} y2="140" stroke="#161924" strokeWidth="1" strokeDasharray="3 3" />

          {/* Top Wave Pair (Cyan & Emerald) */}
          <path
            d={pathCyan}
            fill="none"
            stroke="#00D2FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="glow-cyan transition-all duration-75"
          />
          <path
            d={pathEmerald}
            fill="none"
            stroke="#00FF87"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="glow-emerald transition-all duration-75"
          />

          {/* Bottom Wave Pair (Yellow & Magenta) */}
          <path
            d={pathYellow}
            fill="none"
            stroke="#FFD600"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="transition-all duration-75"
          />
          <path
            d={pathMagenta}
            fill="none"
            stroke="#FF007F"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="glow-magenta transition-all duration-75"
          />

          {/* Interactive Hover Vertical Tracker */}
          {hoverX !== null && (
            <line
              x1={Math.min(Math.max(hoverX, 25), width - 25)}
              y1="10"
              x2={Math.min(Math.max(hoverX, 25), width - 25)}
              y2={height - 10}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          )}
        </svg>
      </div>

      {/* Footer Pill */}
      <div className="pt-2 border-t border-[#161924] flex items-center justify-between text-[11px] text-[#9CA3AF]">
        <span>Oscilação harmônica contínua</span>
        <span className="font-mono text-[#00FF87]">Fluxo Vivo 60 FPS</span>
      </div>
    </div>
  );
};
