import { useState, useEffect } from 'react';
import type { ItemLancamento } from '../types/finance';
import { 
  type ConfiguracaoWhatsApp,
  type ResumoLembretesWhatsApp,
  obterConfiguracaoWhatsApp,
  salvarConfiguracaoWhatsApp,
  analisarContasParaLembrete,
  gerarMensagemWhatsAppConsolidada,
  gerarMensagemWhatsAppIndividual,
  dispararWhatsApp,
} from '../services/whatsappReminderService';
import { formatarBRL, CATEGORIAS_CONFIG } from '../utils/calculations';
import { 
  X, 
  MessageSquare, 
  Check, 
  Clock, 
  AlertCircle, 
  Copy, 
  Save, 
  Calendar,
  Send,
  PhoneCall
} from 'lucide-react';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  itens: ItemLancamento[];
  onAlternarPago: (id: string) => void;
}

export const ModalLembretesWhatsApp = ({
  aberto,
  onFechar,
  itens,
  onAlternarPago,
}: Props) => {
  const [config, setConfig] = useState<ConfiguracaoWhatsApp>(obterConfiguracaoWhatsApp);
  const [abaAtiva, setAbaAtiva] = useState<'lembretes' | 'config'>('lembretes');
  const [numeroInput, setNumeroInput] = useState('');
  const [diasInput, setDiasInput] = useState(3);
  const [incluirVencidasInput, setIncluirVencidasInput] = useState(true);
  const [exibirBannerInput, setExibirBannerInput] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [salvoFeedback, setSalvoFeedback] = useState(false);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  useEffect(() => {
    if (aberto) {
      const cfg = obterConfiguracaoWhatsApp();
      setConfig(cfg);
      setNumeroInput(cfg.numero);
      setDiasInput(cfg.diasAntecedencia);
      setIncluirVencidasInput(cfg.incluirVencidas);
      setExibirBannerInput(cfg.exibirBanner);
      setSalvoFeedback(false);
      setCopiado(false);
    }
  }, [aberto]);

  if (!aberto) return null;

  const resumo: ResumoLembretesWhatsApp = analisarContasParaLembrete(itens, config);
  const mensagemConsolidada = gerarMensagemWhatsAppConsolidada(resumo, config);

  const handleSalvarConfig = () => {
    const novaConfig: ConfiguracaoWhatsApp = {
      ...config,
      numero: numeroInput.trim(),
      diasAntecedencia: diasInput,
      incluirVencidas: incluirVencidasInput,
      exibirBanner: exibirBannerInput,
    };
    salvarConfiguracaoWhatsApp(novaConfig);
    setConfig(novaConfig);
    setSalvoFeedback(true);
    setTimeout(() => setSalvoFeedback(false), 2000);
  };

  const handleCopiarMensagem = () => {
    navigator.clipboard.writeText(mensagemConsolidada);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleEnviarConsolidado = () => {
    dispararWhatsApp(mensagemConsolidada, config.numero);
  };

  const handleEnviarIndividual = (item: ItemLancamento, diasRestantes?: number) => {
    const msg = gerarMensagemWhatsAppIndividual(item, diasRestantes);
    dispararWhatsApp(msg, config.numero);
  };

  const handleEnviarTeste = () => {
    const msgTeste = `✅ *GESTORLAR // TESTE DE INTEGRAÇÃO*\n\nSeu WhatsApp foi configurado com sucesso para receber alertas de contas a vencer e planejamento familiar!\n\n📅 Data do teste: ${new Date().toLocaleDateString('pt-BR')}`;
    dispararWhatsApp(msgTeste, numeroInput || config.numero);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#101010] border border-[#3d3a39] w-full max-w-2xl rounded-[3px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3d3a39] bg-[#161413]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[3px] bg-[#1d1a18] border border-[#3d3a39] flex items-center justify-center text-[#25D366]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-tight text-[#fafafa] flex items-center gap-2">
                LEMBRETES DE CONTAS // WHATSAPP
                {resumo.temAlertas && (
                  <span className="px-1.5 py-0.2 rounded-[2px] bg-[#ee6018] text-[#101010] text-[9px] font-bold">
                    {resumo.todasNotificaveis.length} PENDENTES
                  </span>
                )}
              </h3>
              <p className="font-mono text-[11px] text-[#8a8380]">
                Disparo de notificações diretas no WhatsApp para contas a vencer
              </p>
            </div>
          </div>

          <button
            onClick={onFechar}
            className="text-[#8a8380] hover:text-[#eeeeee] transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="flex items-center border-b border-[#3d3a39] px-6 bg-[#121110]">
          <button
            onClick={() => setAbaAtiva('lembretes')}
            className={`py-3 px-4 font-mono text-xs uppercase tracking-tight border-b-2 cursor-pointer transition ${
              abaAtiva === 'lembretes'
                ? 'border-[#25D366] text-[#fafafa] font-medium'
                : 'border-transparent text-[#8a8380] hover:text-[#eeeeee]'
            }`}
          >
            Contas a Vencer ({resumo.todasNotificaveis.length})
          </button>
          <button
            onClick={() => setAbaAtiva('config')}
            className={`py-3 px-4 font-mono text-xs uppercase tracking-tight border-b-2 cursor-pointer transition ${
              abaAtiva === 'config'
                ? 'border-[#25D366] text-[#fafafa] font-medium'
                : 'border-transparent text-[#8a8380] hover:text-[#eeeeee]'
            }`}
          >
            Configurar WhatsApp
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {abaAtiva === 'lembretes' && (
            <div className="flex flex-col gap-5">
              {/* Resumo de Indicadores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-[3px] bg-[#161413] border border-[#3d3a39] flex flex-col gap-1">
                  <span className="font-mono text-[10px] text-[#8a8380] uppercase">Vencem Hoje</span>
                  <span className="font-mono text-lg font-bold text-[#fafafa]">
                    {resumo.contasHoje.length}
                  </span>
                  <span className="font-mono text-[10px] text-[#ee6018]">
                    {resumo.contasHoje.length > 0 ? 'Ação prioritária' : 'Nenhuma hoje'}
                  </span>
                </div>

                <div className="p-3 rounded-[3px] bg-[#161413] border border-[#3d3a39] flex flex-col gap-1">
                  <span className="font-mono text-[10px] text-[#8a8380] uppercase">Próximos {config.diasAntecedencia} Dias</span>
                  <span className="font-mono text-lg font-bold text-[#fafafa]">
                    {resumo.contasProximas.length}
                  </span>
                  <span className="font-mono text-[10px] text-[#a0ca92]">
                    Chegando ao vencimento
                  </span>
                </div>

                <div className="p-3 rounded-[3px] bg-[#161413] border border-[#3d3a39] flex flex-col gap-1">
                  <span className="font-mono text-[10px] text-[#8a8380] uppercase">Total Pendente</span>
                  <span className="font-mono text-lg font-bold text-[#fafafa]">
                    {formatarBRL(resumo.totalValor)}
                  </span>
                  <span className="font-mono text-[10px] text-[#8a8380]">
                    {resumo.todasNotificaveis.length} obrigações
                  </span>
                </div>
              </div>

              {/* Botão de Disparo Consolidado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[3px] bg-[#161413] border border-[#3d3a39]">
                <div>
                  <h4 className="font-mono text-xs uppercase font-medium text-[#fafafa] flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-[#25D366]" />
                    DISPARAR MENSAGEM GERAL NO WHATSAPP
                  </h4>
                  <p className="text-xs text-[#8a8380] mt-0.5">
                    {config.numero ? (
                      <>Enviará para o número: <strong className="text-[#eeeeee] font-mono">{config.numero}</strong></>
                    ) : (
                      <>Nenhum número fixado. Você poderá escolher o contato no WhatsApp.</>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMostrarPreview(!mostrarPreview)}
                    className="px-3 py-1.5 rounded-[3px] bg-transparent border border-[#3d3a39] hover:border-[#8a8380] text-[#8a8380] hover:text-[#eeeeee] font-mono text-xs cursor-pointer transition"
                  >
                    {mostrarPreview ? 'Ocultar Preview' : 'Ver Texto'}
                  </button>

                  <button
                    onClick={handleEnviarConsolidado}
                    disabled={resumo.todasNotificaveis.length === 0}
                    className="px-4 py-2 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] disabled:opacity-50 text-[#101010] font-mono text-xs uppercase tracking-tight flex items-center gap-2 font-medium cursor-pointer transition"
                  >
                    <MessageSquare className="w-4 h-4 text-[#25D366]" />
                    <span>Disparar WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Preview Expansível da Mensagem */}
              {mostrarPreview && (
                <div className="p-4 rounded-[3px] bg-[#0c0c0c] border border-[#3d3a39] flex flex-col gap-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-[#1d1a18] pb-2">
                    <span className="font-mono text-[10px] text-[#8a8380] uppercase tracking-wider">
                      TEXTO FORMATADO DO WHATSAPP
                    </span>
                    <button
                      onClick={handleCopiarMensagem}
                      className="text-xs font-mono text-[#8a8380] hover:text-[#fafafa] flex items-center gap-1.5 transition"
                    >
                      {copiado ? <Check className="w-3.5 h-3.5 text-[#a0ca92]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiado ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-[#eeeeee] whitespace-pre-wrap leading-relaxed select-all">
                    {mensagemConsolidada}
                  </pre>
                </div>
              )}

              {/* Listagem das Contas */}
              <div className="flex flex-col gap-3">
                <span className="font-mono text-xs uppercase tracking-tight text-[#fafafa]">
                  LISTAGEM DETALHADA DE CONTAS PENDENTES
                </span>

                {resumo.todasNotificaveis.length === 0 ? (
                  <div className="p-8 text-center rounded-[3px] border border-dashed border-[#3d3a39] text-[#8a8380] font-mono text-xs">
                    Parabéns! Todas as contas com vencimento próximo estão quitadas.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {resumo.todasNotificaveis.map((c) => {
                      const item = c.item;
                      const isHoje = c.status === 'hoje';
                      const isAtrasada = c.status === 'atrasada';

                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-[3px] bg-[#161413] border border-[#3d3a39] hover:border-[#8a8380] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {isHoje ? (
                                <AlertCircle className="w-4 h-4 text-[#ee6018]" />
                              ) : isAtrasada ? (
                                <Clock className="w-4 h-4 text-[#ee6018]" />
                              ) : (
                                <Calendar className="w-4 h-4 text-[#a0ca92]" />
                              )}
                            </div>

                            <div className="flex flex-col">
                              <span className="font-medium text-[#fafafa]">
                                {item.titulo}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-[#8a8380] mt-0.5">
                                <span className="uppercase text-[#eeeeee]">
                                  {CATEGORIAS_CONFIG[item.categoria]?.nome} ({item.tipoDetalhado})
                                </span>
                                <span>•</span>
                                <span className={isHoje ? 'text-[#ee6018] font-bold' : isAtrasada ? 'text-[#ee6018]' : 'text-[#a0ca92]'}>
                                  {isHoje && 'VENCE HOJE!'}
                                  {c.diasRestantes === 1 && 'Vence amanhã!'}
                                  {c.diasRestantes > 1 && `Vence em ${c.diasRestantes} dias`}
                                  {isAtrasada && `Atrasada há ${Math.abs(c.diasRestantes)} dias`}
                                </span>
                                <span>•</span>
                                <span>{item.vencimento}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-[#1d1a18]">
                            <span className="font-bold text-sm text-[#fafafa]">
                              {formatarBRL(item.valor)}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {/* Botão Enviar Lembrete Individual no WhatsApp */}
                              <button
                                onClick={() => handleEnviarIndividual(item, c.diasRestantes)}
                                className="px-2.5 py-1 rounded-[2px] bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] text-[10px] font-mono flex items-center gap-1 cursor-pointer transition"
                                title="Enviar lembrete individual desta conta no WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Lembrar</span>
                              </button>

                              {/* Botão Quitar */}
                              <button
                                onClick={() => onAlternarPago(item.id)}
                                className="px-2.5 py-1 rounded-[2px] bg-transparent hover:bg-[#1d1a18] border border-[#3d3a39] text-[#8a8380] hover:text-[#a0ca92] text-[10px] font-mono flex items-center gap-1 cursor-pointer transition"
                                title="Marcar como pago"
                              >
                                <Check className="w-3 h-3" />
                                <span>Quitar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {abaAtiva === 'config' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs uppercase tracking-tight text-[#fafafa]">
                  CONFIGURAÇÕES DE DESTINO E DISPARO
                </span>
                <p className="text-xs text-[#8a8380]">
                  Configure o seu número de WhatsApp e com quantos dias de antecedência o sistema deve avisar sobre as contas.
                </p>
              </div>

              {/* Campo Número do WhatsApp */}
              <div className="flex flex-col gap-2 p-4 rounded-[3px] bg-[#161413] border border-[#3d3a39]">
                <label className="font-mono text-xs uppercase text-[#eeeeee] flex items-center gap-2">
                  <PhoneCall className="w-3.5 h-3.5 text-[#25D366]" />
                  Seu Número de WhatsApp (com DDD)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: 11999998888 ou 5511999998888"
                    value={numeroInput}
                    onChange={(e) => setNumeroInput(e.target.value)}
                    className="flex-1 bg-[#101010] border border-[#3d3a39] rounded-[3px] px-3 py-2 text-xs font-mono text-[#eeeeee] focus:border-[#fafafa] focus:outline-none"
                  />
                  <button
                    onClick={handleEnviarTeste}
                    className="px-3 py-2 rounded-[3px] bg-transparent border border-[#3d3a39] hover:border-[#fafafa] text-[#8a8380] hover:text-[#eeeeee] font-mono text-xs whitespace-nowrap cursor-pointer transition"
                    title="Dispara mensagem teste para verificar se o número abre corretamente"
                  >
                    Testar Disparo
                  </button>
                </div>
                <span className="text-[11px] font-mono text-[#8a8380]">
                  Deixe em branco se preferir que o WhatsApp pergunte o contato a cada envio.
                </span>
              </div>

              {/* Antecedência de Dias */}
              <div className="flex flex-col gap-2 p-4 rounded-[3px] bg-[#161413] border border-[#3d3a39]">
                <label className="font-mono text-xs uppercase text-[#eeeeee] flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#a0ca92]" />
                  Antecedência do Alerta de Vencimento
                </label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 5, 7].map((dias) => (
                    <button
                      key={dias}
                      type="button"
                      onClick={() => setDiasInput(dias)}
                      className={`px-3 py-1.5 rounded-[3px] font-mono text-xs cursor-pointer transition ${
                        diasInput === dias
                          ? 'bg-[#fafafa] text-[#101010] font-bold'
                          : 'bg-[#101010] border border-[#3d3a39] text-[#8a8380] hover:text-[#eeeeee]'
                      }`}
                    >
                      {dias === 1 ? '1 dia antes' : `${dias} dias antes`}
                      {dias === 3 && ' (Padrão)'}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] font-mono text-[#8a8380]">
                  Contas que vencem hoje sempre serão exibidas como prioridade máxima.
                </span>
              </div>

              {/* Opções de Exibição */}
              <div className="flex flex-col gap-3 p-4 rounded-[3px] bg-[#161413] border border-[#3d3a39]">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={incluirVencidasInput}
                    onChange={(e) => setIncluirVencidasInput(e.target.checked)}
                    className="accent-[#25D366] w-4 h-4 cursor-pointer"
                  />
                  <span className="font-mono text-xs text-[#eeeeee]">
                    Incluir contas atrasadas e não pagas na lista e na mensagem
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exibirBannerInput}
                    onChange={(e) => setExibirBannerInput(e.target.checked)}
                    className="accent-[#25D366] w-4 h-4 cursor-pointer"
                  />
                  <span className="font-mono text-xs text-[#eeeeee]">
                    Exibir banner de alerta no topo do painel quando houver contas a vencer
                  </span>
                </label>
              </div>

              {/* Botão Salvar */}
              <div className="flex items-center justify-between pt-2">
                <span className="font-mono text-xs text-[#a0ca92]">
                  {salvoFeedback && '✓ Configurações salvas com sucesso!'}
                </span>

                <button
                  onClick={handleSalvarConfig}
                  className="px-5 py-2 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] font-mono text-xs uppercase tracking-tight flex items-center gap-2 font-medium cursor-pointer transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Configuração</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div className="px-6 py-3 border-t border-[#3d3a39] bg-[#161413] flex items-center justify-between text-xs font-mono text-[#8a8380]">
          <span>INTEGRAÇÃO WHATSAPP // GESTORLAR</span>
          <button
            onClick={onFechar}
            className="text-[#eeeeee] hover:underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

