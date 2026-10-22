import { useEffect, useRef, useState } from 'react';
import type { CalculoOrcamentario, ItemLancamento } from '../types/finance';
import { formatarBRL, formatarPercentual } from '../utils/calculations';
import { Activity, Radio, Eye } from 'lucide-react';

interface Props {
  calculos: CalculoOrcamentario;
  itens: ItemLancamento[];
}

export const GraficosVetoriaisSVG = ({ calculos, itens }: Props) => {
  const [modoGrafico, setModoGrafico] = useState<'radar' | 'starburst'>('radar');
  const [tick, setTick] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  // Loop de animação contínua a 60 FPS com funções trigonométricas puras
  useEffect(() => {
    let currentTick = 0;
    const animate = () => {
      currentTick += 0.025; // Velocidade suave da onda
      setTick(currentTick);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Centro e dimensões do SVG
  const cx = 200;
  const cy = 200;

  // 1. Radar Harmônico Senoidal Orgânico (72 Vértices Interpolados Polares)
  // r(theta) = r_base + sin(theta * freq + offset) * amplitude
  const gerarPathRadar = (
    rBase: number,
    freq: number,
    offset: number,
    amplitude: number
  ) => {
    const numVertices = 72;
    const points: string[] = [];

    for (let i = 0; i <= numVertices; i++) {
      const theta = (i * 2 * Math.PI) / numVertices;
      // Respiração líquida modulada pelo tick
      const r = rBase + Math.sin(theta * freq + offset + tick) * amplitude;
      const x = cx + r * Math.cos(theta);
      const y = cy + r * Math.sin(theta);
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }

    points.push('Z');
    return points.join(' ');
  };

  // Modulação do raio base de cada camada baseada no percentual orçamentário
  const rFixas = 60 + Math.min(calculos.percentFixas, 60);
  const rSuperfluos = 45 + Math.min(calculos.percentSuperfluos, 45);
  const rInvestimentos = 35 + Math.min(calculos.percentInvestimentos, 35);

  const pathFixas = gerarPathRadar(rFixas, 4, 0, 7);
  const pathSuperfluos = gerarPathRadar(rSuperfluos, 3, Math.PI / 3, 5);
  const pathInvestimentos = gerarPathRadar(rInvestimentos, 5, Math.PI / 2, 4);

  // 2. Raios Radiais 360° (Starburst)
  // theta = (i * 360) / N
  // L = Base + (Peso / 100) * 36 + sin(4*pi*(i/N) + tick) * 4
  const numRaios = Math.max(itens.length, 16);
  const raiosStarburst = Array.from({ length: numRaios }).map((_, i) => {
    const item = itens[i % itens.length];
    const peso = item ? Math.min((item.valor / (calculos.totalGastos || 1)) * 100, 100) : 10;
    const base = 50;
    const l = base + (peso / 100) * 36 + Math.sin(4 * Math.PI * (i / numRaios) + tick) * 4;
    const angleRad = (i * 2 * Math.PI) / numRaios;
    const innerR = 40;

    const x1 = cx + innerR * Math.cos(angleRad);
    const y1 = cy + innerR * Math.sin(angleRad);
    const x2 = cx + (innerR + l) * Math.cos(angleRad);
    const y2 = cy + (innerR + l) * Math.sin(angleRad);

    const cor = 
      item?.categoria === 'fixas' 
        ? '#00D2FF' 
        : item?.categoria === 'superfluos' 
        ? '#9D00FF' 
        : '#00FF87';

    return { x1, y1, x2, y2, cor, item };
  });

  return (
    <div className="glass-panel rounded-2xl p-5 border border-[#1e2333] flex flex-col justify-between relative overflow-hidden">
      {/* Header com Alternância de Modo */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e2333]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00FF87] animate-pulse" />
          <h2 className="text-sm uppercase tracking-wider font-semibold text-white">
            Motor Vetorial SVG • 60 FPS
          </h2>
        </div>

        <div className="flex items-center p-0.5 rounded-lg bg-[#0d0f17] border border-[#1e2333] text-xs">
          <button
            onClick={() => setModoGrafico('radar')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              modoGrafico === 'radar'
                ? 'bg-[#181d2b] text-white shadow'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3 text-[#00FF87]" />
            Radar Harmônico
          </button>
          <button
            onClick={() => setModoGrafico('starburst')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              modoGrafico === 'starburst'
                ? 'bg-[#181d2b] text-white shadow'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Eye className="w-3 h-3 text-[#00D2FF]" />
            Starburst 360°
          </button>
        </div>
      </div>

      {/* Canvas Vetorial Central */}
      <div className="relative w-full flex items-center justify-center py-2">
        <svg
          viewBox="0 0 400 400"
          className="w-full max-w-[340px] aspect-square select-none"
        >
          <defs>
            {/* Gradientes Suaves Obsidian Dark */}
            <radialGradient id="radarCenter" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00FF87" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#07080b" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="gradFixas" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#00D2FF" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="gradSuperfluos" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9D00FF" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#9D00FF" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="gradInvest" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00FF87" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00FF87" stopOpacity="0.15" />
            </linearGradient>
          </defs>

          {/* Anéis de Fundo / Grade Polar */}
          <circle cx={cx} cy={cy} r="140" fill="none" stroke="#161b26" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx={cx} cy={cy} r="105" fill="none" stroke="#1c2233" strokeWidth="1" />
          <circle cx={cx} cy={cy} r="70" fill="none" stroke="#161b26" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx={cx} cy={cy} r="35" fill="none" stroke="#1c2233" strokeWidth="1" />
          <line x1={cx} y1="40" x2={cx} y2="360" stroke="#161b26" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="40" y1={cy} x2="360" y2={cy} stroke="#161b26" strokeWidth="1" strokeDasharray="2 2" />

          {/* Renderização Condicional de Modo */}
          {modoGrafico === 'radar' ? (
            <g>
              {/* Camada Fixas (Azul Ciano) */}
              <path
                d={pathFixas}
                fill="url(#gradFixas)"
                stroke="#00D2FF"
                strokeWidth="1.5"
                className="transition-all"
              />
              {/* Camada Supérfluos (Roxo) */}
              <path
                d={pathSuperfluos}
                fill="url(#gradSuperfluos)"
                stroke="#9D00FF"
                strokeWidth="1.5"
                className="transition-all"
              />
              {/* Camada Investimentos (Neon Esmeralda) */}
              <path
                d={pathInvestimentos}
                fill="url(#gradInvest)"
                stroke="#00FF87"
                strokeWidth="2"
                className="transition-all"
              />
            </g>
          ) : (
            <g>
              {/* Starburst 360° */}
              {raiosStarburst.map((raio, idx) => (
                <line
                  key={idx}
                  x1={raio.x1.toFixed(2)}
                  y1={raio.y1.toFixed(2)}
                  x2={raio.x2.toFixed(2)}
                  y2={raio.y2.toFixed(2)}
                  stroke={raio.cor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              ))}
            </g>
          )}

          {/* Núcleo Central Dinâmico */}
          <circle cx={cx} cy={cy} r="34" fill="#0d0f17" stroke="#2d354d" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="28" fill="url(#radarCenter)" />
          
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            fill="#00FF87"
            fontSize="12"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {formatarPercentual(calculos.taxaComprometimento)}
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fill="#9CA3AF"
            fontSize="8"
            fontWeight="500"
            letterSpacing="0.05em"
          >
            COMPROM.
          </text>
        </svg>
      </div>

      {/* Legenda Informativa dos Pilares */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#1e2333] text-center text-xs">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-[#00D2FF] font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#00D2FF]" />
            Fixas
          </div>
          <span className="font-mono text-white font-medium text-xs mt-0.5">
            {formatarPercentual(calculos.percentFixas)}
          </span>
          <span className="text-[10px] text-[#9CA3AF] font-mono">
            {formatarBRL(calculos.totalFixas)}
          </span>
        </div>

        <div className="flex flex-col items-center border-x border-[#1e2333]">
          <div className="flex items-center gap-1.5 text-[#9D00FF] font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#9D00FF]" />
            Supérfluos
          </div>
          <span className="font-mono text-white font-medium text-xs mt-0.5">
            {formatarPercentual(calculos.percentSuperfluos)}
          </span>
          <span className="text-[10px] text-[#9CA3AF] font-mono">
            {formatarBRL(calculos.totalSuperfluos)}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-[#00FF87] font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#00FF87]" />
            Aportes
          </div>
          <span className="font-mono text-white font-medium text-xs mt-0.5">
            {formatarPercentual(calculos.percentInvestimentos)}
          </span>
          <span className="text-[10px] text-[#9CA3AF] font-mono">
            {formatarBRL(calculos.totalInvestimentos)}
          </span>
        </div>
      </div>
    </div>
  );
};
