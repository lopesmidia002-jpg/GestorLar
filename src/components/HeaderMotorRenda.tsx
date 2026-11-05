import { useState } from 'react';
import type { CalculoOrcamentario } from '../types/finance';
import type { StatusSyncNuvem } from '../hooks/useFinanceStorage';
import type { UsuarioLogado } from '../services/authService';
import { formatarBRL, formatarPercentual, parseMoedaBR } from '../utils/calculations';
import { 
  Edit3, 
  Check, 
  X, 
  RotateCcw, 
  RefreshCw, 
  Bell, 
  Database, 
  Trash2,
  MessageSquare,
  LogOut
} from 'lucide-react';

interface Props {
  rendaFamiliar: number;
  calculos: CalculoOrcamentario;
  isOnline: boolean;
  statusSync?: StatusSyncNuvem;
  usuario?: UsuarioLogado | null;
  onLogout?: () => void;
  onSincronizar?: () => void;
  onAbrirNotificacoes?: () => void;
  onAbrirWhatsApp?: () => void;
  onAbrirNuvem?: () => void;
  onAtualizarRenda: (novaRenda: number) => void;
  onAjustarTotalGeral?: (novoTotal: number) => void;
  onRedefinir: () => void;
  onAbrirZerarPainel?: () => void;
}

export const HeaderMotorRenda = ({
  rendaFamiliar,
  calculos,
  isOnline,
  statusSync = 'local_only',
  usuario,
  onLogout,
  onSincronizar,
  onAbrirNotificacoes,
  onAbrirWhatsApp,
  onAbrirNuvem,
  onAtualizarRenda,
  onAjustarTotalGeral,
  onRedefinir,
  onAbrirZerarPainel,
}: Props) => {
  const [toastSync, setToastSync] = useState(false);
  const [editandoRenda, setEditandoRenda] = useState(false);
  const [valorTemp, setValorTemp] = useState(rendaFamiliar.toString());

  const [editandoSaldoLivre, setEditandoSaldoLivre] = useState(false);
  const [tempSaldoLivre, setTempSaldoLivre] = useState(calculos.saldoLivre.toString());

  const [editandoTotalGastos, setEditandoTotalGastos] = useState(false);
  const [tempTotalGastos, setTempTotalGastos] = useState(calculos.totalGastos.toString());

  const handleDispararSincronizacao = () => {
    if (onSincronizar) {
      onSincronizar();
      setToastSync(true);
      setTimeout(() => setToastSync(false), 2200);
    }
  };

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
    <header className="w-full flex flex-col gap-10 pt-2 pb-4">
      {/* Top Navigation Bar: Factory Persistent Header (~64px height, #101010 transparent, minimal 3px radius) */}
      <nav className="min-h-[56px] py-2 sm:py-2.5 w-full flex items-center justify-between border-b border-[#3d3a39] px-1 sm:px-2">
        {/* Left: Wordmark 'FACTORY' in Geist Mono uppercase with live signal dot */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ee6018] shrink-0" title="War room operational" />
            <span className="font-mono text-xs uppercase tracking-[0.12em] sm:tracking-[0.2em] text-[#eeeeee] font-normal">
              FACTORY
            </span>
            <span className="text-[#3d3a39] font-mono text-xs hidden md:inline">/</span>
            <span className="font-mono text-xs uppercase tracking-tight text-[#8a8380] hidden md:inline">
              GESTOR 50-30-20
            </span>
          </div>
        </div>

        {/* Center / Section Links: Geist 14px 400 uppercase - visível apenas em telas amplas (2xl) com espaço livre */}
        <div className="hidden 2xl:flex items-center gap-8 text-[13px] font-normal uppercase tracking-tight text-[#8a8380] whitespace-nowrap shrink-0">
          <a href="#war-room" className="text-[#eeeeee] hover:text-[#fafafa] transition-colors whitespace-nowrap">
            War Room
          </a>
          <a href="#pilares" className="hover:text-[#eeeeee] transition-colors whitespace-nowrap">
            Pilares 50-30-20
          </a>
          <a href="#calendario" className="hover:text-[#eeeeee] transition-colors whitespace-nowrap">
            Calendário
          </a>
          <a href="#ledger" className="hover:text-[#eeeeee] transition-colors whitespace-nowrap">
            Ledger
          </a>
          <span className="text-[11px] font-mono text-[#4d4947] tracking-widest whitespace-nowrap">
            LATENCY: 0MS LOCAL
          </span>
        </div>

        {/* Right Actions: Ghost Link, Sync Pulse, High-Emphasis Light Button */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
          {/* Sync Trigger & State */}
          <div className="relative">
            <button
              onClick={handleDispararSincronizacao}
              className="h-[34px] px-2 sm:px-2.5 md:px-3 rounded-[3px] bg-transparent border border-[#3d3a39] hover:border-[#fafafa] text-[#eeeeee] hover:text-[#fafafa] font-mono text-xs uppercase tracking-tight flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-colors"
              title="Disparar sincronização com a nuvem"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${statusSync === 'sincronizando' ? 'animate-spin text-[#ee6018]' : ''}`} />
              <span className="hidden md:inline">
                {statusSync === 'conectado' && 'Sync OK'}
                {statusSync === 'sincronizando' && 'Syncing...'}
                {statusSync === 'local_only' && 'Sync Local'}
                {statusSync === 'offline' && 'Offline'}
                {statusSync === 'erro' && 'Sync Erro'}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#a0ca92]' : 'bg-[#ee6018]'}`} />
            </button>

            {/* Sync Feedback Toast */}
            {toastSync && (
              <div className="absolute right-0 top-full mt-2 z-50 whitespace-nowrap px-3 py-1.5 rounded-[3px] bg-[#1d1a18] border border-[#a0ca92] text-[#a0ca92] text-[11px] font-mono flex items-center gap-1.5">
                <Check className="w-3 h-3" />
                <span>Nuvem sincronizada</span>
              </div>
            )}
          </div>

          {/* Notificações Push Firebase */}
          {onAbrirNotificacoes && (
            <button
              onClick={onAbrirNotificacoes}
              className="h-[34px] w-[34px] rounded-[3px] bg-transparent border border-[#3d3a39] hover:border-[#fafafa] text-[#eeeeee] hover:text-[#fafafa] flex items-center justify-center cursor-pointer transition-colors shrink-0"
              title="Notificações push"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Cadastramento de Números de WhatsApp */}
          {onAbrirWhatsApp && (
            <button
              onClick={onAbrirWhatsApp}
              className="h-[34px] px-2 sm:px-2.5 rounded-[3px] bg-transparent border border-[#3d3a39] hover:border-[#25D366] text-[#8a8380] hover:text-[#25D366] flex items-center justify-center gap-1 sm:gap-1.5 font-mono text-xs uppercase tracking-tight cursor-pointer transition-colors shrink-0"
              title="Cadastrar e gerenciar números de WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
              <span className="hidden md:inline">WhatsApp</span>
            </button>
          )}

          {/* Botão para Zerar Todo o Painel */}
          {onAbrirZerarPainel && (
            <button
              onClick={onAbrirZerarPainel}
              className="h-[34px] px-2 sm:px-2.5 md:px-3 rounded-[3px] bg-transparent border border-[#3d3a39] hover:border-[#ee6018] text-[#8a8380] hover:text-[#ee6018] font-mono text-xs uppercase tracking-tight flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
              title="Zerar todos os dados do painel"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#ee6018]" />
              <span className="hidden min-[480px]:inline">Zerar</span>
            </button>
          )}

          {/* Resetar Dados Padrao */}
          <button
            onClick={() => {
              if (window.confirm('Resetar dados para os parâmetros de fábrica?')) {
                onRedefinir();
              }
            }}
            className="h-[34px] px-2.5 rounded-[3px] bg-transparent border border-[#3d3a39] hover:border-[#fafafa] text-[#8a8380] hover:text-[#eeeeee] font-mono text-xs uppercase cursor-pointer hidden md:flex items-center gap-1.5"
            title="Restaurar dados iniciais"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>

          {/* Log In / Conectar Nuvem: High-Emphasis Light Button (#fafafa fill, 3px radius, #101010 text) */}
          <button
            onClick={onAbrirNuvem}
            className="h-[34px] px-2.5 sm:px-3 md:px-3.5 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] font-normal text-xs uppercase tracking-tight flex items-center justify-center gap-1.5 cursor-pointer font-mono shrink-0"
            title="Conectar ou sincronizar conta de nuvem"
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden min-[480px]:inline md:hidden">Nuvem</span>
            <span className="hidden md:inline">Conectar Nuvem</span>
          </button>

          {/* Usuário Autenticado & Botão Sair */}
          {usuario && (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-[#3d3a39] shrink-0">
              <div className="hidden min-[640px]:flex flex-col text-right leading-tight select-none">
                <span className="font-mono text-xs text-[#eeeeee] font-medium max-w-[120px] truncate" title={usuario.nome || usuario.email}>
                  {usuario.nome || usuario.email.split('@')[0]}
                </span>
                <span className="font-mono text-[9px] text-[#8a8380] uppercase tracking-wider flex items-center justify-end gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${usuario.origem === 'supabase' ? 'bg-[#a0ca92]' : 'bg-[#ee6018]'}`} />
                  {usuario.origem === 'supabase' ? 'Nuvem' : 'Local'}
                </span>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="h-[34px] px-2 sm:px-2.5 rounded-[3px] bg-transparent border border-[#3d3a39] hover:border-[#ee6018] text-[#8a8380] hover:text-[#ee6018] font-mono text-xs uppercase tracking-tight flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0"
                  title={`Sair da conta (${usuario.email})`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* KPI Command Row: The Factory Signature Figure/Ground Triad */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        
        {/* Card 1: Renda Familiar Líquida (Dark Terminal Tile, 10px radius, 1px #3d3a39 border) */}
        <div className="bg-[#101010] border border-[#3d3a39] rounded-[10px] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#b8b3b0] mb-3">
              <span className="font-mono text-xs uppercase tracking-[-0.24px] text-[#b8b3b0]">
                Renda Familiar Líquida
              </span>
              <span className="text-[11px] font-mono text-[#8a8380]">BRL // 01</span>
            </div>

            {editandoRenda ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-[#8a8380] shrink-0">R$</span>
                <input
                  type="text"
                  value={valorTemp}
                  onChange={(e) => setValorTemp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSalvarRenda();
                    if (e.key === 'Escape') setEditandoRenda(false);
                  }}
                  autoFocus
                  className="flex-1 min-w-0 bg-[#1d1a18] border border-[#eeeeee] rounded-[3px] px-2.5 py-1 text-2xl font-mono text-[#eeeeee] focus:outline-none focus:ring-1 focus:ring-[#eeeeee]"
                />
                <button
                  onClick={handleSalvarRenda}
                  className="h-[38px] w-[38px] shrink-0 bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] rounded-[3px] flex items-center justify-center transition-colors cursor-pointer"
                  title="Confirmar"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button
                  onClick={() => setEditandoRenda(false)}
                  className="h-[38px] w-[38px] shrink-0 bg-[#1d1a18] hover:bg-[#3d3a39] border border-[#3d3a39] text-[#8a8380] hover:text-[#eeeeee] rounded-[3px] flex items-center justify-center transition-colors cursor-pointer"
                  title="Cancelar"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => {
                  setValorTemp(rendaFamiliar.toString());
                  setEditandoRenda(true);
                }}
                className="cursor-pointer group flex items-baseline justify-between mt-1"
                title="Clique para editar renda"
              >
                <span className="text-[36px] font-normal tracking-[-1.12px] leading-[1.1] font-geist text-[#eeeeee] group-hover:text-[#fafafa]">
                  {formatarBRL(rendaFamiliar)}
                </span>
                <Edit3 className="w-3.5 h-3.5 text-[#4d4947] group-hover:text-[#eeeeee] transition-colors" />
              </div>
            )}
          </div>

          <div className="mt-6 pt-3 border-t border-[#1d1a18] flex items-center justify-between text-xs text-[#8a8380]">
            <span className="font-mono text-[11px] uppercase tracking-tight">Base de Cálculo 50-30-20</span>
            <span 
              onClick={() => setEditandoRenda(true)}
              className="font-mono text-[11px] text-[#eeeeee] hover:underline cursor-pointer"
            >
              EDITAR →
            </span>
          </div>
        </div>

        {/* Card 2: THE SIGNATURE MOVE: Light Surface Card (#eeeeee floating on #101010 ground) */}
        <div className="factory-dispatch-card rounded-[10px] p-6 flex flex-col justify-between">
          <div>
            {/* Eyebrow: Geist Mono 12px uppercase, #ee6018 dot + #101010 text */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${saldoPositivo ? 'bg-[#a0ca92]' : 'bg-[#ee6018]'}`} />
                <span className="font-mono text-xs uppercase tracking-[-0.24px] text-[#101010] font-medium">
                  DISPATCH // SALDO LIVRE
                </span>
              </div>
              <span className="font-mono text-[11px] uppercase px-1.5 py-0.5 rounded-[3px] bg-[#101010] text-[#eeeeee]">
                {saldoPositivo ? 'SUPERÁVIT' : 'DÉFICIT'}
              </span>
            </div>

            {/* Headline: Geist 36px weight 400, #101010, tracking -1.12px */}
            {editandoSaldoLivre ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-[#4d4947] shrink-0">R$</span>
                <input
                  type="text"
                  value={tempSaldoLivre}
                  onChange={(e) => setTempSaldoLivre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSalvarSaldoLivre();
                    if (e.key === 'Escape') setEditandoSaldoLivre(false);
                  }}
                  autoFocus
                  className="flex-1 min-w-0 bg-white border border-[#101010] rounded-[3px] px-2.5 py-1 text-2xl font-mono text-[#101010] focus:outline-none focus:ring-1 focus:ring-[#101010]"
                />
                <button
                  onClick={handleSalvarSaldoLivre}
                  className="h-[38px] w-[38px] shrink-0 bg-[#101010] hover:bg-[#252220] text-[#fafafa] rounded-[3px] flex items-center justify-center transition-colors cursor-pointer"
                  title="Confirmar"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button
                  onClick={() => setEditandoSaldoLivre(false)}
                  className="h-[38px] w-[38px] shrink-0 bg-[#d8d3d0] hover:bg-[#c2bcb8] text-[#101010] border border-[#b8b3b0] rounded-[3px] flex items-center justify-center transition-colors cursor-pointer"
                  title="Cancelar"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => {
                  setTempSaldoLivre(calculos.saldoLivre.toString());
                  setEditandoSaldoLivre(true);
                }}
                className="cursor-pointer group flex items-baseline justify-between mt-1"
                title="Clique para editar saldo livre"
              >
                <span className="text-[36px] font-normal tracking-[-1.12px] leading-[1.1] font-geist text-[#101010]">
                  {formatarBRL(calculos.saldoLivre)}
                </span>
                <Edit3 className="w-3.5 h-3.5 text-[#8a8380] group-hover:text-[#101010] transition-colors" />
              </div>
            )}
          </div>

          {/* Sub-metric & Inline Gastos Editor */}
          <div className="mt-6 pt-3 border-t border-[#b8b3b0]/40 flex items-center justify-between text-xs text-[#4d4947]">
            <span className="font-mono text-[11px] uppercase">Comprometido:</span>
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
                  className="w-20 bg-white border border-[#101010] rounded-[3px] px-1 py-0.5 text-xs font-mono text-[#101010] focus:outline-none"
                />
                <button 
                  onClick={handleSalvarTotalGastos} 
                  className="w-5 h-5 shrink-0 flex items-center justify-center bg-[#101010] text-[#fafafa] rounded-[2px] cursor-pointer hover:bg-[#252220]"
                  title="Confirmar"
                >
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </button>
                <button 
                  onClick={() => setEditandoTotalGastos(false)} 
                  className="w-5 h-5 shrink-0 flex items-center justify-center bg-[#d8d3d0] text-[#101010] rounded-[2px] cursor-pointer hover:bg-[#c2bcb8]"
                  title="Cancelar"
                >
                  <X className="w-3 h-3 stroke-[2.5]" />
                </button>
              </div>
            ) : (
              <span 
                onClick={() => {
                  setTempTotalGastos(calculos.totalGastos.toString());
                  setEditandoTotalGastos(true);
                }}
                className="font-mono text-[12px] text-[#101010] font-medium cursor-pointer hover:underline flex items-center gap-1"
                title="Ajustar despesas totais"
              >
                <span>{formatarBRL(calculos.totalGastos)}</span>
                <Edit3 className="w-2.5 h-2.5 text-[#8a8380]" />
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Comprometimento Total (Dark Terminal Tile, 10px radius, 1px #3d3a39 border) */}
        <div className="bg-[#101010] border border-[#3d3a39] rounded-[10px] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#b8b3b0] mb-3">
              <span className="font-mono text-xs uppercase tracking-[-0.24px] text-[#b8b3b0]">
                Comprometimento da Renda
              </span>
              <span className={`text-[11px] font-mono uppercase px-1.5 py-0.5 rounded-[3px] border ${
                calculos.taxaComprometimento <= 100 
                  ? 'border-[#a0ca92]/40 text-[#a0ca92]' 
                  : 'border-[#ee6018]/40 text-[#ee6018]'
              }`}>
                {calculos.taxaComprometimento <= 100 ? 'NORMAL' : 'ALERTA'}
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <span className="text-[36px] font-normal tracking-[-1.12px] leading-[1.1] font-geist text-[#eeeeee]">
                {formatarPercentual(calculos.taxaComprometimento)}
              </span>
              <span className="font-mono text-xs text-[#8a8380]">
                Teto: 100.0%
              </span>
            </div>
          </div>

          {/* Segmented Flat Line: Hairline 3px height with Factory semantic colors */}
          <div className="mt-6 pt-3 border-t border-[#1d1a18]">
            <div className="w-full bg-[#1d1a18] h-1.5 rounded-[1px] overflow-hidden flex gap-[1px]">
              <div 
                style={{ width: `${Math.min(calculos.percentFixas, 100)}%` }} 
                className="bg-[#eeeeee] h-full"
                title={`Fixas: ${formatarPercentual(calculos.percentFixas)}`}
              />
              <div 
                style={{ width: `${Math.min(calculos.percentSuperfluos, 100)}%` }} 
                className="bg-[#ee6018] h-full"
                title={`Supérfluos: ${formatarPercentual(calculos.percentSuperfluos)}`}
              />
              <div 
                style={{ width: `${Math.min(calculos.percentInvestimentos, 100)}%` }} 
                className="bg-[#a0ca92] h-full"
                title={`Investimentos: ${formatarPercentual(calculos.percentInvestimentos)}`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-[#8a8380] mt-2">
              <span className="text-[#eeeeee]">FIXAS ({formatarPercentual(calculos.percentFixas)})</span>
              <span className="text-[#ee6018]">SUPÉRFLUOS ({formatarPercentual(calculos.percentSuperfluos)})</span>
              <span className="text-[#a0ca92]">APORTES ({formatarPercentual(calculos.percentInvestimentos)})</span>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};
