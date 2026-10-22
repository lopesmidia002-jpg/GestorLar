import { useState, useEffect, useRef } from 'react';
import type { CalculoOrcamentario, CategoriaOrcamentaria } from '../types/finance';
import { formatarBRL, parseMoedaBR } from '../utils/calculations';
import { Sparkles, Edit2, Check, X } from 'lucide-react';

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
      current += 0.03;
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

  // Espectro de cores do Starburst da imagem: Laranja -> Magenta -> Roxo -> Ciano -> Esmeralda
  const rainbowColors = [
    '#FF6B00', '#FF4500', '#FF1493', '#E000B0', '#9D00FF',
    '#7000FF', '#0055FF', '#00A2FF', '#00D2FF', '#00FFA3',
    '#00FF87', '#39FF14'
  ];

  const raios = Array.from({ length: numRaios }).map((_, i) => {
    // Ângulo em arco aberto de 270 graus ou círculo completo
    const angleDeg = (i / numRaios) * 360 - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    
    // Peso relativo do raio
    const baseLen = 42;
    const wave = Math.sin(4 * Math.PI * (i / numRaios) + tick) * 5;
    const isHovered = hoveredIndex === i;
    const hoverBoost = isHovered ? 10 : 0;
    const totalLen = baseLen + wave + hoverBoost;

    const innerR = 48;
    const x1 = cx + innerR * Math.cos(angleRad);
    const y1 = cy + innerR * Math.sin(angleRad);
    const x2 = cx + (innerR + totalLen) * Math.cos(angleRad);
    const y2 = cy + (innerR + totalLen) * Math.sin(angleRad);

    const corIndex = Math.floor((i / numRaios) * rainbowColors.length);
    const cor = rainbowColors[corIndex % rainbowColors.length];

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
    <div className="hyper-card p-5 lg:p-6 flex flex-col justify-between relative overflow-hidden h-full">
      {/* Top Header com Título e Sparkle Pill */}
      <div className="flex items-center justify-between pb-3 border-b border-[#161924]">
        <h2 className="text-base lg:text-lg font-bold text-white tracking-tight">
          Relatório de Distribuição
        </h2>
        <div className="w-7 h-7 rounded-full bg-[#00FF87]/15 border border-[#00FF87]/40 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-[#00FF87] animate-star-pulse" />
        </div>
      </div>

      {/* Main Grid: Left Stats + Right Starburst Graphic */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 my-auto items-center py-2">
        {/* Left Column: KPIs & Legend (6 colunas) */}
        <div className="md:col-span-6 flex flex-col justify-between gap-4">
          {/* KPI Semanal */}
          <div>
            <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-1">
              <span className="w-2 h-2 rounded-full border-2 border-[#00FF87]" />
              <span className="font-semibold text-white">Semanal</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl lg:text-2xl font-extrabold tracking-tight font-mono-numeric text-white">
                {formatarBRL(rendaFamiliar / 4.3)}
              </span>
              <span className="text-xs font-mono text-[#00FF87]">↑ 19.6%</span>
            </div>
            <span className="text-[10px] text-[#4B5563] font-mono">
              vs semana anterior
            </span>
          </div>

          {/* Categorias / Legend (100% Editáveis) */}
          <div className="space-y-1.5 pt-2 border-t border-[#161924]">
            {/* Fixas */}
            <div className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs transition ${
              filtroAtivo === 'fixas' ? 'bg-[#00D2FF]/15 text-[#00D2FF]' : 'text-[#9CA3AF] hover:text-white'
            }`}>
              <button
                type="button"
                onClick={() => onSelecionarFiltro(filtroAtivo === 'fixas' ? 'todos' : 'fixas')}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-[#00D2FF]" />
                <span>50% Contas Fixas</span>
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
                    className="w-20 bg-[#07080b] border border-[#00D2FF] rounded px-1 text-xs font-mono text-white text-right focus:outline-none"
                  />
                  <button onClick={() => salvarEdicaoCat('fixas')} className="text-[#00FF87] cursor-pointer"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditandoCat(null)} className="text-[#9CA3AF] cursor-pointer"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setTempCatValor(calculos.totalFixas.toString());
                    setEditandoCat('fixas');
                  }}
                  className="font-mono font-bold text-white cursor-pointer hover:text-[#00D2FF] hover:underline flex items-center gap-1"
                  title="Clique para editar total de Contas Fixas"
                >
                  {formatarBRL(calculos.totalFixas)}
                  <Edit2 className="w-2.5 h-2.5 text-[#00D2FF]/60" />
                </span>
              )}
            </div>

            {/* Supérfluos */}
            <div className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs transition ${
              filtroAtivo === 'superfluos' ? 'bg-[#9D00FF]/15 text-[#9D00FF]' : 'text-[#9CA3AF] hover:text-white'
            }`}>
              <button
                type="button"
                onClick={() => onSelecionarFiltro(filtroAtivo === 'superfluos' ? 'todos' : 'superfluos')}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-[#9D00FF]" />
                <span>30% Supérfluos</span>
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
                    className="w-20 bg-[#07080b] border border-[#9D00FF] rounded px-1 text-xs font-mono text-white text-right focus:outline-none"
                  />
                  <button onClick={() => salvarEdicaoCat('superfluos')} className="text-[#00FF87] cursor-pointer"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditandoCat(null)} className="text-[#9CA3AF] cursor-pointer"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setTempCatValor(calculos.totalSuperfluos.toString());
                    setEditandoCat('superfluos');
                  }}
                  className="font-mono font-bold text-white cursor-pointer hover:text-[#9D00FF] hover:underline flex items-center gap-1"
                  title="Clique para editar total de Supérfluos"
                >
                  {formatarBRL(calculos.totalSuperfluos)}
                  <Edit2 className="w-2.5 h-2.5 text-[#9D00FF]/60" />
                </span>
              )}
            </div>

            {/* Aportes */}
            <div className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs transition ${
              filtroAtivo === 'investimentos' ? 'bg-[#00FF87]/15 text-[#00FF87]' : 'text-[#9CA3AF] hover:text-white'
            }`}>
              <button
                type="button"
                onClick={() => onSelecionarFiltro(filtroAtivo === 'investimentos' ? 'todos' : 'investimentos')}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-[#00FF87]" />
                <span>20% Aportes</span>
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
                    className="w-20 bg-[#07080b] border border-[#00FF87] rounded px-1 text-xs font-mono text-white text-right focus:outline-none"
                  />
                  <button onClick={() => salvarEdicaoCat('investimentos')} className="text-[#00FF87] cursor-pointer"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditandoCat(null)} className="text-[#9CA3AF] cursor-pointer"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setTempCatValor(calculos.totalInvestimentos.toString());
                    setEditandoCat('investimentos');
                  }}
                  className="font-mono font-bold text-white cursor-pointer hover:text-[#00FF87] hover:underline flex items-center gap-1"
                  title="Clique para editar total de Aportes"
                >
                  {formatarBRL(calculos.totalInvestimentos)}
                  <Edit2 className="w-2.5 h-2.5 text-[#00FF87]/60" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Starburst 360° Circular Graphic (6 colunas) */}
        <div className="md:col-span-6 flex flex-col items-center justify-center relative">
          <svg
            viewBox="0 0 270 270"
            className="w-full max-w-[240px] aspect-square select-none overflow-visible"
          >
            {/* Concentric Guide Circles */}
            <circle cx={cx} cy={cy} r="105" fill="none" stroke="#161924" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={cx} cy={cy} r="48" fill="none" stroke="#222738" strokeWidth="1.5" />

            {/* Glowing Radial Rays (Starburst Spectrum) */}
            {raios.map((raio) => (
              <line
                key={raio.i}
                x1={raio.x1.toFixed(1)}
                y1={raio.y1.toFixed(1)}
                x2={raio.x2.toFixed(1)}
                y2={raio.y2.toFixed(1)}
                stroke={raio.cor}
                strokeWidth={hoveredIndex === raio.i ? '4' : '2.8'}
                strokeLinecap="round"
                className="cursor-pointer transition-all duration-150"
                style={{
                  filter: hoveredIndex === raio.i ? `drop-shadow(0 0 8px ${raio.cor})` : undefined,
                  opacity: hoveredIndex !== null && hoveredIndex !== raio.i ? 0.45 : 1,
                }}
                onMouseEnter={() => setHoveredIndex(raio.i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))}

            {/* Central Dark Disc with Polygon/Diamond Emblem (Editável ao clicar) */}
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
                r="46" 
                fill="#07080b" 
                stroke="#1f2433" 
                strokeWidth="2" 
                className="group-hover/center:stroke-[#00FF87] transition-colors"
              />
              <circle cx={cx} cy={cy} r="42" fill="#0a0c12" />

              {/* Geometric Diamond Icon */}
              <path
                d={`M ${cx} ${cy - 24} L ${cx + 10} ${cy - 14} L ${cx} ${cy - 4} L ${cx - 10} ${cy - 14} Z`}
                fill="none"
                stroke="#00FF87"
                strokeWidth="1.8"
              />
              <path
                d={`M ${cx} ${cy - 24} L ${cx} ${cy - 4}`}
                stroke="#00FF87"
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Central Number and SUMMARY label */}
              <text
                x={cx}
                y={cy + 8}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="12"
                fontWeight="800"
                fontFamily="monospace"
                letterSpacing="-0.02em"
                className="group-hover/center:fill-[#00FF87] transition-colors"
              >
                {formatarBRL(rendaFamiliar).replace(',00', '')}
              </text>
              <text
                x={cx}
                y={cy + 20}
                textAnchor="middle"
                fill="#9CA3AF"
                fontSize="7"
                fontWeight="600"
                letterSpacing="0.1em"
              >
                EDITAR RENDA ✎
              </text>
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
      </div>

      {/* Footer Metrics (Monthly & Annual) */}
      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#161924]">
        <div>
          <div className="text-[11px] text-[#9CA3AF] flex items-center gap-1">
            <span className="text-[#00FF87] font-bold">+</span>
            <span>Mensal</span>
          </div>
          <div className="text-base font-bold font-mono text-white mt-0.5">
            {formatarBRL(calculos.totalGastos)}
          </div>
          <span className="text-[9px] text-[#4B5563] font-mono">Total comprometido</span>
        </div>

        <div>
          <div className="text-[11px] text-[#9CA3AF] flex items-center gap-1">
            <span className="text-[#FF6B00] font-bold">●</span>
            <span>Anualizado</span>
          </div>
          <div className="text-base font-bold font-mono text-white mt-0.5">
            {formatarBRL(calculos.totalGastos * 12)}
          </div>
          <span className="text-[9px] text-[#4B5563] font-mono">Volume anual estimado</span>
        </div>
      </div>
    </div>
  );
};
