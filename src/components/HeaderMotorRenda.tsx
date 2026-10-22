import { useState } from 'react';
import type { CalculoOrcamentario } from '../types/finance';
import type { StatusSyncNuvem } from '../hooks/useFinanceStorage';
import type { User } from '@supabase/supabase-js';
import { formatarBRL, formatarPercentual, parseMoedaBR } from '../utils/calculations';
import { 
  Wallet, 
  TrendingUp, 
  PieChart, 
  Wifi, 
  WifiOff, 
  Edit3, 
  Check, 
  X,
  RotateCcw,
  Sparkles,
  Cloud
} from 'lucide-react';

interface Props {
  rendaFamiliar: number;
  calculos: CalculoOrcamentario;
  isOnline: boolean;
  statusSync?: StatusSyncNuvem;
  usuario?: User | null;
  onAbrirNuvemModal?: () => void;
  onAtualizarRenda: (novaRenda: number) => void;
  onAjustarTotalGeral?: (novoTotal: number) => void;
  onRedefinir: () => void;
}

export const HeaderMotorRenda = ({
  rendaFamiliar,
  calculos,
  isOnline,
  statusSync = 'local_only',
  usuario,
  onAbrirNuvemModal,
  onAtualizarRenda,
  onAjustarTotalGeral,
  onRedefinir,
}: Props) => {
  const [editandoRenda, setEditandoRenda] = useState(false);
  const [valorTemp, setValorTemp] = useState(rendaFamiliar.toString());

  const [editandoSaldoLivre, setEditandoSaldoLivre] = useState(false);
  const [tempSaldoLivre, setTempSaldoLivre] = useState(calculos.saldoLivre.toString());

  const [editandoTotalGastos, setEditandoTotalGastos] = useState(false);
  const [tempTotalGastos, setTempTotalGastos] = useState(calculos.totalGastos.toString());

  const handleSalvarRenda = () => {
    const limpo = parseMoedaBR(valorTemp);
    if (limpo >= 0) {
      onAtualizarRenda(limpo);
    }
    setEditandoRenda(false);
  };

  const handleSalvarSaldoLivre = () => {
    const desejado = parseMoedaBR(tempSaldoLivre);
    if (desejado >= 0) {
      onAtualizarRenda(calculos.totalGastos + desejado);
    }
    setEditandoSaldoLivre(false);
  };

  const handleSalvarTotalGastos = () => {
    const val = parseMoedaBR(tempTotalGastos);
    if (val >= 0 && onAjustarTotalGeral) {
      onAjustarTotalGeral(val);
    }
    setEditandoTotalGastos(false);
  };

  const saldoPositivo = calculos.saldoLivre >= 0;

  return (
    <header className="w-full flex flex-col gap-6 pt-6 pb-2">
      {/* Top Navbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1e2333] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0d0f15] to-[#171b29] border border-[#2d354d] flex items-center justify-center shadow-lg shadow-black/40">
            <Sparkles className="w-5 h-5 text-[#00FF87]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2 m-0">
                GestorLar <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/30">PWA 50-30-20</span>
              </h1>
            </div>
            <p className="text-xs text-[#9CA3AF] hidden sm:block">
              Controle Orçamentário Doméstico • Obsidian Dark Fintech
            </p>
          </div>
        </div>

        {/* Connectivity & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Botão de Status da Nuvem Supabase */}
          <button
            onClick={onAbrirNuvemModal}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium border transition-all cursor-pointer shadow-sm ${
              statusSync === 'conectado'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-[#00FF87] hover:bg-emerald-950/80 hover:border-emerald-400'
                : statusSync === 'sincronizando'
                ? 'bg-blue-950/60 border-blue-500/40 text-blue-400 hover:bg-blue-950/80 animate-pulse'
                : 'bg-[#121520] border-[#1e2333] hover:border-[#00FF87]/40 text-[#9CA3AF] hover:text-white'
            }`}
            title="Gerenciar Sincronização em Nuvem (Supabase)"
          >
            <Cloud className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {statusSync === 'conectado' && (usuario?.email ? usuario.email.split('@')[0] : 'Nuvem Ativa')}
              {statusSync === 'sincronizando' && 'Sincronizando...'}
              {statusSync === 'local_only' && 'Conectar Nuvem'}
              {statusSync === 'offline' && 'Offline'}
              {statusSync === 'erro' && 'Erro Nuvem'}
            </span>
            <span className="sm:hidden">
              {statusSync === 'conectado' ? 'Nuvem' : 'Sync'}
            </span>
            {statusSync === 'conectado' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF87] animate-pulse" />
            )}
          </button>

          {/* Indicador de Rede */}
          <div 
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-mono font-medium border transition-colors ${
              isOnline 
                ? 'bg-[#0d121c] border-[#1a2333] text-[#9CA3AF]' 
                : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            }`}
            title={isOnline ? 'Dispositivo conectado à internet' : 'Modo offline: salvando localmente'}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5" />}
          </div>

          <button
            onClick={() => {
              if (window.confirm('Deseja resetar para os dados originais de demonstração?')) {
                onRedefinir();
              }
            }}
            className="p-1.5 px-2.5 rounded-lg bg-[#121520] hover:bg-[#1a1e2d] border border-[#1e2333] hover:border-[#2d354d] text-[#9CA3AF] hover:text-white transition-all text-xs flex items-center gap-1.5 cursor-pointer"
            title="Redefinir dados"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Restaurar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Motor de Renda */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Renda Líquida Familiar */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group border border-[#1e2333] hover:border-[#00FF87]/40 transition-all duration-300">
          <div className="flex items-center justify-between text-[#9CA3AF] mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Renda Familiar Líquida</span>
            <Wallet className="w-4 h-4 text-[#00FF87]" />
          </div>

          {editandoRenda ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-mono text-[#9CA3AF]">R$</span>
              <input
                type="text"
                value={valorTemp}
                onChange={(e) => setValorTemp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSalvarRenda();
                  if (e.key === 'Escape') setEditandoRenda(false);
                }}
                autoFocus
                className="w-full bg-[#07080b] border border-[#00FF87] rounded-lg px-2 py-1 text-lg font-mono-numeric font-bold text-white focus:outline-none"
              />
              <button
                onClick={handleSalvarRenda}
                className="p-1.5 rounded-md bg-[#00FF87] text-[#07080b] hover:bg-[#00FF87]/80"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditandoRenda(false)}
                className="p-1.5 rounded-md bg-[#1e2333] text-[#9CA3AF] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => {
                setValorTemp(rendaFamiliar.toString());
                setEditandoRenda(true);
              }}
              className="cursor-pointer group/val flex items-baseline justify-between mt-1"
              title="Clique para editar a renda"
            >
              <span className="text-2xl lg:text-3xl font-extrabold tracking-tight font-mono-numeric text-white group-hover/val:text-[#00FF87] transition-colors">
                {formatarBRL(rendaFamiliar)}
              </span>
              <Edit3 className="w-4 h-4 text-[#4B5563] group-hover/val:text-[#00FF87] opacity-0 group-hover/val:opacity-100 transition-opacity" />
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-[#1e2333]/80 flex items-center justify-between text-xs text-[#9CA3AF]">
            <span>Base de cálculo 50-30-20</span>
            <span className="text-[#00FF87] font-mono text-[11px] cursor-pointer hover:underline" onClick={() => setEditandoRenda(true)}>
              Clique para alterar
            </span>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00FF87]/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Card 2: Saldo Livre Disponível */}
        <div className={`glass-panel rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden border transition-all duration-300 ${
          saldoPositivo 
            ? 'border-[#1e2333] hover:border-[#00D2FF]/40' 
            : 'border-rose-900/40 bg-rose-950/10'
        }`}>
          <div className="flex items-center justify-between text-[#9CA3AF] mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Saldo Livre Disponível</span>
            <TrendingUp className={`w-4 h-4 ${saldoPositivo ? 'text-[#00D2FF]' : 'text-rose-400'}`} />
          </div>

          {editandoSaldoLivre ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-mono text-[#9CA3AF]">R$</span>
              <input
                type="text"
                value={tempSaldoLivre}
                onChange={(e) => setTempSaldoLivre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSalvarSaldoLivre();
                  if (e.key === 'Escape') setEditandoSaldoLivre(false);
                }}
                autoFocus
                className="w-full bg-[#07080b] border border-[#00D2FF] rounded-lg px-2 py-1 text-lg font-mono-numeric font-bold text-white focus:outline-none"
              />
              <button
                onClick={handleSalvarSaldoLivre}
                className="p-1.5 rounded-md bg-[#00D2FF] text-[#07080b] hover:bg-[#00D2FF]/80 cursor-pointer"
                title="Salvar saldo livre desejado"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditandoSaldoLivre(false)}
                className="p-1.5 rounded-md bg-[#1e2333] text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => {
                setTempSaldoLivre(calculos.saldoLivre.toString());
                setEditandoSaldoLivre(true);
              }}
              className="cursor-pointer group/val flex items-baseline justify-between mt-1"
              title="Clique para editar saldo livre (ajusta renda automaticamente)"
            >
              <span className={`text-2xl lg:text-3xl font-extrabold tracking-tight font-mono-numeric transition-colors border-b border-transparent group-hover/val:border-dashed ${
                saldoPositivo ? 'text-[#00D2FF] group-hover/val:border-[#00D2FF]' : 'text-rose-400 group-hover/val:border-rose-400'
              }`}>
                {formatarBRL(calculos.saldoLivre)}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                  saldoPositivo ? 'bg-[#00D2FF]/10 text-[#00D2FF]' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {saldoPositivo ? 'Sobra' : 'Déficit'}
                </span>
                <Edit3 className="w-3.5 h-3.5 text-[#00D2FF]/60 group-hover/val:text-[#00D2FF] opacity-60 group-hover/val:opacity-100 transition-opacity" />
              </div>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-[#1e2333]/80 flex items-center justify-between text-xs text-[#9CA3AF]">
            <span>Total em despesas + aportes:</span>
            {editandoTotalGastos ? (
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs">R$</span>
                <input
                  type="text"
                  value={tempTotalGastos}
                  onChange={(e) => setTempTotalGastos(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSalvarTotalGastos();
                    if (e.key === 'Escape') setEditandoTotalGastos(false);
                  }}
                  autoFocus
                  className="w-20 bg-[#07080b] border border-[#00FF87] rounded px-1.5 py-0.5 text-xs font-mono text-white focus:outline-none"
                />
                <button onClick={handleSalvarTotalGastos} className="text-[#00FF87]">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditandoTotalGastos(false)} className="text-[#9CA3AF]">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span 
                onClick={() => {
                  setTempTotalGastos(calculos.totalGastos.toString());
                  setEditandoTotalGastos(true);
                }}
                className="font-mono text-white font-medium cursor-pointer hover:text-[#00FF87] hover:underline flex items-center gap-1"
                title="Clique para ajustar total de gastos proporcionalmente"
              >
                <span>{formatarBRL(calculos.totalGastos)}</span>
                <Edit3 className="w-2.5 h-2.5 text-[#00FF87]/50" />
              </span>
            )}
          </div>
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none ${
            saldoPositivo ? 'bg-[#00D2FF]/5' : 'bg-rose-500/10'
          }`} />
        </div>

        {/* Card 3: Taxa de Comprometimento */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden border border-[#1e2333] hover:border-[#9D00FF]/40 transition-all duration-300">
          <div className="flex items-center justify-between text-[#9CA3AF] mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Comprometimento Total</span>
            <PieChart className="w-4 h-4 text-[#9D00FF]" />
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl lg:text-3xl font-extrabold tracking-tight font-mono-numeric text-white">
              {formatarPercentual(calculos.taxaComprometimento)}
            </span>
            <span className={`text-xs font-mono px-2 py-0.5 rounded ${
              calculos.taxaComprometimento <= 100 
                ? 'bg-emerald-500/10 text-emerald-400' 
                : 'bg-rose-500/10 text-rose-400'
            }`}>
              {calculos.taxaComprometimento <= 100 ? 'Orçamento Equilibrado' : 'Estouro de Renda'}
            </span>
          </div>

          {/* Micro Progress Bar */}
          <div className="mt-3 pt-2">
            <div className="w-full bg-[#1e2333] h-2 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${Math.min(calculos.percentFixas, 100)}%` }} 
                className="bg-[#00D2FF] h-full"
                title={`Fixas: ${formatarPercentual(calculos.percentFixas)}`}
              />
              <div 
                style={{ width: `${Math.min(calculos.percentSuperfluos, 100)}%` }} 
                className="bg-[#9D00FF] h-full"
                title={`Supérfluos: ${formatarPercentual(calculos.percentSuperfluos)}`}
              />
              <div 
                style={{ width: `${Math.min(calculos.percentInvestimentos, 100)}%` }} 
                className="bg-[#00FF87] h-full"
                title={`Investimentos: ${formatarPercentual(calculos.percentInvestimentos)}`}
              />
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#9D00FF]/5 rounded-full blur-2xl pointer-events-none" />
        </div>
      </div>
    </header>
  );
};
