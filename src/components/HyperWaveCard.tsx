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
      current += 0.032;
      setTick(current);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const width = 340;
  const height = 150;

  // Wave generator
  const generateWave = (baseY: number, freq: number, phase: number, amp: number, invert = false) => {
    const points: string[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * width;
      const envelope = Math.sin((i / steps) * Math.PI);
      const direction = invert ? -1 : 1;
      const y = baseY + Math.sin(i * freq + phase + tick) * amp * envelope * direction;
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return points.join(' ');
  };

  const pathOrange = generateWave(55, 0.22, 0, 20, false);
  const pathGreen = generateWave(55, 0.22, 0.4, 20, true);
  const pathBone = generateWave(105, 0.20, Math.PI / 4, 16, false);
  const pathGranite = generateWave(105, 0.20, Math.PI / 4 + 0.5, 16, true);

  return (
    <div className="bg-[#101010] border border-[#3d3a39] rounded-[10px] overflow-hidden flex flex-col justify-between h-full">
      {/* macOS Terminal Window Header */}
      <div className="h-9 shrink-0 bg-[#161413] border-b border-[#3d3a39] px-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
          <span className="ml-2 font-mono text-[11px] uppercase tracking-[-0.24px] text-[#eeeeee]">
            WAVE_OSCILLATOR // FLUXO CONTÍNUO
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-[#1d1a18] border border-[#3d3a39]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92] animate-pulse" />
          <span className="font-mono text-[10px] text-[#8a8380]">60 FPS</span>
        </div>
      </div>

      {/* Metric Tiles Header */}
      <div className="grid grid-cols-2 border-b border-[#1d1a18]">
        {/* Metric 1: Mensal Livre */}
        <div className="px-3.5 py-3 sm:px-4 sm:py-3.5 border-r border-[#1d1a18] min-w-0">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-mono text-[11px] uppercase tracking-[-0.24px] text-[#b8b3b0] truncate">
              Saldo Mensal
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92] shrink-0" />
          </div>

          {editandoRenda ? (
            <div className="flex items-center gap-1 my-1 min-w-0">
              <span className="text-xs font-mono text-[#8a8380] shrink-0">R$</span>
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
                className="w-full max-w-[90px] bg-[#1d1a18] border border-[#eeeeee] rounded-[3px] p-1 text-xs sm:text-sm font-mono text-[#eeeeee] focus:outline-none min-w-0"
              />
              <button
                onClick={() => {
                  const num = parseMoedaBR(tempRenda);
                  if (num >= 0 && onAtualizarRenda) onAtualizarRenda(num);
                  setEditandoRenda(false);
                }}
                className="p-1 rounded-[3px] bg-[#fafafa] text-[#101010] shrink-0 cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setEditandoRenda(false)} className="p-1 rounded-[3px] bg-[#1d1a18] text-[#8a8380] shrink-0 cursor-pointer">
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
              className="cursor-pointer group min-w-0"
              title="Clique para editar renda familiar base"
            >
              <div className="flex items-baseline justify-between gap-1 min-w-0">
                <span 
                  className="text-base sm:text-lg lg:text-[19px] xl:text-[21px] font-normal tracking-[-0.5px] leading-tight font-geist text-[#eeeeee] group-hover:text-[#fafafa] truncate"
                  title={formatarBRL(calculos.saldoLivre)}
                >
                  {formatarBRL(calculos.saldoLivre)}
                </span>
                <Edit2 className="w-3 h-3 text-[#4d4947] group-hover:text-[#eeeeee] shrink-0 opacity-70 group-hover:opacity-100 transition-opacity ml-1" />
              </div>
              <div className="text-[11px] font-mono text-[#8a8380] mt-1 truncate">
                Livre: <span className="text-[#a0ca92]">{formatarPercentual(100 - calculos.taxaComprometimento)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Metric 2: Projeção Anual */}
        <div className="px-3.5 py-3 sm:px-4 sm:py-3.5 min-w-0">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-mono text-[11px] uppercase tracking-[-0.24px] text-[#b8b3b0] truncate">
              Projeção 12M
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#ee6018] shrink-0" />
          </div>

          {editandoAporte ? (
            <div className="flex items-center gap-1 my-1 min-w-0">
              <span className="text-xs font-mono text-[#8a8380] shrink-0">R$</span>
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
                className="w-full max-w-[90px] bg-[#1d1a18] border border-[#eeeeee] rounded-[3px] p-1 text-xs sm:text-sm font-mono text-[#eeeeee] focus:outline-none min-w-0"
              />
              <button
                onClick={() => {
                  const num = parseMoedaBR(tempAporte);
                  if (num >= 0 && onAjustarTotalPilar) onAjustarTotalPilar('investimentos', num);
                  setEditandoAporte(false);
                }}
                className="p-1 rounded-[3px] bg-[#fafafa] text-[#101010] shrink-0 cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setEditandoAporte(false)} className="p-1 rounded-[3px] bg-[#1d1a18] text-[#8a8380] shrink-0 cursor-pointer">
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
              className="cursor-pointer group min-w-0"
              title="Clique para editar aporte e recalcular a projeção"
            >
              <div className="flex items-baseline justify-between gap-1 min-w-0">
                <span 
                  className="text-base sm:text-lg lg:text-[19px] xl:text-[21px] font-normal tracking-[-0.5px] leading-tight font-geist text-[#eeeeee] group-hover:text-[#fafafa] truncate"
                  title={formatarBRL(calculos.totalInvestimentos * 12)}
                >
                  {formatarBRL(calculos.totalInvestimentos * 12)}
                </span>
                <Edit2 className="w-3 h-3 text-[#4d4947] group-hover:text-[#eeeeee] shrink-0 opacity-70 group-hover:opacity-100 transition-opacity ml-1" />
              </div>
              <div className="text-[11px] font-mono text-[#8a8380] mt-1 truncate" title={`Aporte: ${formatarBRL(calculos.totalInvestimentos)}/mês`}>
                Aporte: <span className="text-[#eeeeee]">{formatarBRL(calculos.totalInvestimentos)}/mês</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Sinusoidal Technical Graph */}
      <div 
        className="relative flex-1 min-h-[140px] flex flex-col justify-center px-4 py-2 cursor-crosshair select-none overflow-hidden"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHoverX(e.clientX - rect.left);
        }}
        onMouseLeave={() => setHoverX(null)}
      >
        <div className="absolute left-4 top-2 text-[10px] font-mono text-[#4d4947]">Y1: +120</div>
        <div className="absolute right-4 top-2 text-[10px] font-mono text-[#4d4947]">SIG_OUT</div>
        <div className="absolute left-4 bottom-2 text-[10px] font-mono text-[#4d4947]">Y0: -120</div>

        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto max-h-[145px] overflow-visible py-1"
        >
          {/* Hairline Grid Dividers */}
          <line x1="10" y1="55" x2={width - 10} y2="55" stroke="#1d1a18" strokeWidth="1" strokeDasharray="2 4" />
          <line x1="10" y1="105" x2={width - 10} y2="105" stroke="#1d1a18" strokeWidth="1" strokeDasharray="2 4" />

          {/* Technical Waves (Zero drop-shadow, flat 1.5px / 1px strokes) */}
          <path
            d={pathGreen}
            fill="none"
            stroke="#a0ca92"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d={pathOrange}
            fill="none"
            stroke="#ee6018"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d={pathBone}
            fill="none"
            stroke="#eeeeee"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <path
            d={pathGranite}
            fill="none"
            stroke="#8a8380"
            strokeWidth="1"
            strokeDasharray="3 3"
            strokeLinecap="round"
          />

          {/* Interactive Hover Tracker */}
          {hoverX !== null && (
            <line
              x1={Math.min(Math.max(hoverX, 10), width - 10)}
              y1="5"
              x2={Math.min(Math.max(hoverX, 10), width - 10)}
              y2={height - 5}
              stroke="#fafafa"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}
        </svg>
      </div>

      {/* Terminal Footer com Enquadramento Perfeito e Badge Exclusivo */}
      <div className="h-9 shrink-0 bg-[#161413] border-t border-[#3d3a39] px-4 flex items-center justify-between text-[11px] font-mono text-[#8a8380] select-none z-10">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3d3a39]" />
          <span className="text-[10px] uppercase tracking-wider text-[#8a8380]">
            CH 01: ORÇAMENTO DINÂMICO
          </span>
        </div>

        {/* Badge LIVE STREAM com enquadramento e espaçamento precisos */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-[#1d1a18] border border-[#a0ca92]/40 text-[#a0ca92] text-[10px] font-mono tracking-wider font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92] animate-pulse shrink-0" />
          <span>LIVE STREAM</span>
        </div>
      </div>
    </div>
  );
};
