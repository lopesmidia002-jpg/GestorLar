import { useState } from 'react';
import type { ResumoLembretesWhatsApp, ConfiguracaoWhatsApp } from '../services/whatsappReminderService';
import { 
  dispararWhatsApp, 
  gerarMensagemWhatsAppConsolidada 
} from '../services/whatsappReminderService';
import { formatarBRL } from '../utils/calculations';
import { 
  MessageSquare, 
  X, 
  Settings, 
  Clock, 
  AlertCircle 
} from 'lucide-react';

interface Props {
  resumo: ResumoLembretesWhatsApp;
  config: ConfiguracaoWhatsApp;
  onAbrirConfiguracoes: () => void;
}

export const BannerLembreteWhatsApp = ({
  resumo,
  config,
  onAbrirConfiguracoes,
}: Props) => {
  const [dispensado, setDispensado] = useState(false);

  // Não exibe se o usuário desabilitou nas configurações, se foi dispensado na sessão ou se não há contas a alertar
  if (dispensado || !config.exibirBanner || !resumo.temAlertas) {
    return null;
  }

  const temHoje = resumo.contasHoje.length > 0;
  const temAtrasadas = resumo.contasAtrasadas.length > 0;
  const corDestaque = temHoje || temAtrasadas ? 'text-[#ee6018]' : 'text-[#a0ca92]';
  const bordaDestaque = temHoje || temAtrasadas ? 'border-[#ee6018]/50' : 'border-[#a0ca92]/50';
  const pontoDestaque = temHoje || temAtrasadas ? 'bg-[#ee6018]' : 'bg-[#a0ca92]';

  const handleEnviarWhatsApp = () => {
    const msg = gerarMensagemWhatsAppConsolidada(resumo, config);
    dispararWhatsApp(msg, config.numero);
  };

  return (
    <aside 
      aria-label="Lembretes de vencimento"
      className={`w-full rounded-[3px] bg-[#161413] border ${bordaDestaque} p-3.5 sm:p-4 transition-all duration-200`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Esquerda: Identificador e Resumo */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 relative shrink-0">
            <span className={`w-2 h-2 rounded-full ${pontoDestaque} inline-block animate-pulse`} />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={`font-mono text-[10px] uppercase tracking-wider font-semibold ${corDestaque} flex items-center gap-1.5`}>
                {temHoje ? (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    ATENÇÃO // CONTAS VENCEM HOJE
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3" />
                    AVISO // CONTAS PRÓXIMAS DO VENCIMENTO
                  </>
                )}
              </span>
              <span className="text-[#3d3a39] text-xs font-mono">•</span>
              <span className="text-[11px] font-mono text-[#8a8380]">
                {resumo.todasNotificaveis.length} {resumo.todasNotificaveis.length === 1 ? 'conta' : 'contas'} pendentes
              </span>
            </div>

            <p className="text-xs text-[#eeeeee] leading-relaxed">
              {temHoje && (
                <span className="font-semibold text-[#fafafa]">
                  {resumo.contasHoje.map(c => c.item.titulo).join(', ')} vence(m) hoje!{' '}
                </span>
              )}
              {resumo.contasProximas.length > 0 && (
                <span className="text-[#b8b3b0]">
                  +{resumo.contasProximas.length} a vencer nos próximos {config.diasAntecedencia} dias.{' '}
                </span>
              )}
              <span className="font-mono text-[#fafafa] font-medium">
                Total a liquidar: {formatarBRL(resumo.totalValor)}
              </span>
            </p>
          </div>
        </div>

        {/* Direita: Ações Rápidas */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {/* Botão Enviar Lembrete no WhatsApp */}
          <button
            onClick={handleEnviarWhatsApp}
            className="h-[32px] px-3.5 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] font-mono text-xs uppercase tracking-tight flex items-center gap-2 font-medium cursor-pointer transition shadow-none"
            title="Enviar mensagem de lembrete no WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
            <span>Enviar no WhatsApp</span>
          </button>

          {/* Botão Configurações / Ver Detalhes */}
          <button
            onClick={onAbrirConfiguracoes}
            className="h-[32px] px-2.5 rounded-[3px] bg-transparent border border-[#3d3a39] hover:border-[#fafafa] text-[#8a8380] hover:text-[#eeeeee] font-mono text-xs flex items-center gap-1 cursor-pointer transition"
            title="Ver todas as contas e configurar número do WhatsApp"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Configurar</span>
          </button>

          {/* Botão Fechar Banner da Sessão */}
          <button
            onClick={() => setDispensado(true)}
            className="h-[32px] w-[32px] rounded-[3px] bg-transparent border border-[#3d3a39] hover:border-[#8a8380] text-[#8a8380] hover:text-[#eeeeee] flex items-center justify-center cursor-pointer transition"
            title="Dispensar aviso por agora"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

