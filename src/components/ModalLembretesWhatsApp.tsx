import { useState, useEffect } from 'react';
import type { ItemLancamento } from '../types/finance';
import { 
  type ConfiguracaoWhatsApp,
  type ResumoLembretesWhatsApp,
  type DestinatarioWhatsApp,
  obterConfiguracaoWhatsApp,
  salvarConfiguracaoWhatsApp,
  analisarContasParaLembrete,
  gerarMensagemWhatsAppConsolidada,
  gerarMensagemWhatsAppIndividual,
  dispararWhatsApp,
  cadastrarDestinatarioWhatsApp,
  removerDestinatarioWhatsApp,
  alternarAtivoDestinatarioWhatsApp,
  dispararParaMultiplosDestinatarios
} from '../services/whatsappReminderService';
import { formatarBRL, CATEGORIAS_CONFIG } from '../utils/calculations';
import { 
  X, 
  MessageSquare, 
  Check, 
  Clock, 
  AlertCircle, 
  Copy, 
  Calendar,
  Send,
  Plus,
  Trash2,
  Users,
  Zap,
  CheckCircle2,
  Globe
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
  const [abaAtiva, setAbaAtiva] = useState<'lembretes' | 'destinatarios' | 'automacao'>('lembretes');
  
  // Formulário de novo destinatário
  const [novoNome, setNovoNome] = useState('');
  const [novoNumero, setNovoNumero] = useState('');
  const [novoTipo, setNovoTipo] = useState<DestinatarioWhatsApp['tipo']>('titular');

  // Configurações de automação
  const [disparoAuto, setDisparoAuto] = useState(true);
  const [diasAntecedencia, setDiasAntecedencia] = useState(3);
  const [incluirVencidas, setIncluirVencidas] = useState(true);
  const [exibirBanner, setExibirBanner] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookKey, setWebhookKey] = useState('');

  // Feedbacks
  const [copiado, setCopiado] = useState(false);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [disparandoLote, setDisparandoLote] = useState(false);
  const [feedbackMensagem, setFeedbackMensagem] = useState<string | null>(null);

  useEffect(() => {
    if (aberto) {
      const cfg = obterConfiguracaoWhatsApp();
      setConfig(cfg);
      setDisparoAuto(cfg.disparoAutomatico);
      setDiasAntecedencia(cfg.diasAntecedencia);
      setIncluirVencidas(cfg.incluirVencidas);
      setExibirBanner(cfg.exibirBanner);
      setWebhookUrl(cfg.webhookApiUrl || '');
      setWebhookKey(cfg.webhookApiKey || '');
      setFeedbackMensagem(null);
      setCopiado(false);
    }
  }, [aberto]);

  if (!aberto) return null;

  const resumo: ResumoLembretesWhatsApp = analisarContasParaLembrete(itens, config);
  const mensagemConsolidada = gerarMensagemWhatsAppConsolidada(resumo, config);
  const destinatariosAtivos = config.destinatarios.filter(d => d.ativo);
  const hojeStr = new Date().toISOString().split('T')[0];
  const jaDisparouHoje = config.ultimoDisparoData === hojeStr;

  const handleCadastrarDestinatario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNumero.trim()) return;

    const novaCfg = cadastrarDestinatarioWhatsApp(
      novoNome || 'Contato',
      novoNumero,
      novoTipo
    );
    setConfig(novaCfg);
    setNovoNome('');
    setNovoNumero('');
    setFeedbackMensagem('✓ Número cadastrado com sucesso!');
    setTimeout(() => setFeedbackMensagem(null), 2500);
  };

  const handleRemoverDestinatario = (id: string) => {
    const novaCfg = removerDestinatarioWhatsApp(id);
    setConfig(novaCfg);
  };

  const handleAlternarAtivo = (id: string) => {
    const novaCfg = alternarAtivoDestinatarioWhatsApp(id);
    setConfig(novaCfg);
  };

  const handleSalvarAutomacao = () => {
    const novaCfg: ConfiguracaoWhatsApp = {
      ...config,
      disparoAutomatico: disparoAuto,
      diasAntecedencia,
      incluirVencidas,
      exibirBanner,
      webhookApiUrl: webhookUrl.trim(),
      webhookApiKey: webhookKey.trim(),
    };
    salvarConfiguracaoWhatsApp(novaCfg);
    setConfig(novaCfg);
    setFeedbackMensagem('✓ Configurações de automação salvas!');
    setTimeout(() => setFeedbackMensagem(null), 2500);
  };

  const handleCopiarMensagem = () => {
    navigator.clipboard.writeText(mensagemConsolidada);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleDispararParaTodos = async (forcar: boolean = true) => {
    setDisparandoLote(true);
    setFeedbackMensagem('Disparando alertas para os números cadastrados...');
    try {
      const res = await dispararParaMultiplosDestinatarios(
        config.destinatarios,
        resumo,
        config,
        forcar ? 'manual' : 'automatico'
      );
      setConfig(obterConfiguracaoWhatsApp());
      setFeedbackMensagem(`✓ Alerta enviado com sucesso para ${res.enviados} contato(s) cadastrado(s)!`);
    } catch {
      setFeedbackMensagem('⚠️ Ocorreu um erro no disparo para alguns destinatários.');
    } finally {
      setDisparandoLote(false);
      setTimeout(() => setFeedbackMensagem(null), 4000);
    }
  };

  const handleDispararIndividual = (item: ItemLancamento, diasRestantes?: number) => {
    const msg = gerarMensagemWhatsAppIndividual(item, diasRestantes);
    // Se tiver destinatário ativo, envia para o primeiro ativo; senão abre genérico
    const primeiroAtivo = destinatariosAtivos[0]?.numero;
    dispararWhatsApp(msg, primeiroAtivo);
  };

  const handleTestarNumero = (dest: DestinatarioWhatsApp) => {
    const msg = `✅ *GESTORLAR // TESTE DE CONTATO*\n\nOlá, *${dest.nome}*! Este número foi cadastrado com sucesso para receber alertas automáticos de contas a vencer no GestorLar.`;
    dispararWhatsApp(msg, dest.numero);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#101010] border border-[#3d3a39] w-full max-w-2xl rounded-[3px] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#3d3a39] bg-[#161413]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[3px] bg-[#1d1a18] border border-[#3d3a39] flex items-center justify-center text-[#25D366]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-tight text-[#fafafa] flex items-center gap-2">
                ALERTA AUTOMÁTICO WHATSAPP
                {resumo.temAlertas && (
                  <span className="px-1.5 py-0.2 rounded-[2px] bg-[#ee6018] text-[#101010] text-[9px] font-bold">
                    {resumo.todasNotificaveis.length} A VENCER
                  </span>
                )}
                {destinatariosAtivos.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-[2px] bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 text-[9px] font-mono">
                    {destinatariosAtivos.length} {destinatariosAtivos.length === 1 ? 'NÚMERO ATIVO' : 'NÚMEROS ATIVOS'}
                  </span>
                )}
              </h3>
              <p className="font-mono text-[11px] text-[#8a8380]">
                Disparo automatizado de contas a vencer para os números cadastrados
              </p>
            </div>
          </div>

          <button
            onClick={onFechar}
            className="text-[#8a8380] hover:text-[#eeeeee] transition-colors p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="flex items-center border-b border-[#3d3a39] px-4 sm:px-6 bg-[#121110] overflow-x-auto">
          <button
            onClick={() => setAbaAtiva('lembretes')}
            className={`py-3 px-3.5 font-mono text-xs uppercase tracking-tight border-b-2 cursor-pointer transition whitespace-nowrap ${
              abaAtiva === 'lembretes'
                ? 'border-[#25D366] text-[#fafafa] font-medium'
                : 'border-transparent text-[#8a8380] hover:text-[#eeeeee]'
            }`}
          >
            Contas a Vencer ({resumo.todasNotificaveis.length})
          </button>
          
          <button
            onClick={() => setAbaAtiva('destinatarios')}
            className={`py-3 px-3.5 font-mono text-xs uppercase tracking-tight border-b-2 cursor-pointer transition whitespace-nowrap flex items-center gap-1.5 ${
              abaAtiva === 'destinatarios'
                ? 'border-[#25D366] text-[#fafafa] font-medium'
                : 'border-transparent text-[#8a8380] hover:text-[#eeeeee]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Números Cadastrados ({config.destinatarios.length})</span>
          </button>

          <button
            onClick={() => setAbaAtiva('automacao')}
            className={`py-3 px-3.5 font-mono text-xs uppercase tracking-tight border-b-2 cursor-pointer transition whitespace-nowrap flex items-center gap-1.5 ${
              abaAtiva === 'automacao'
                ? 'border-[#25D366] text-[#fafafa] font-medium'
                : 'border-transparent text-[#8a8380] hover:text-[#eeeeee]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#ee6018]" />
            <span>Automação Diária</span>
          </button>
        </div>

        {/* Notificação / Feedback de Sucesso */}
        {feedbackMensagem && (
          <div className="bg-[#1d1a18] border-b border-[#a0ca92] px-6 py-2 text-xs font-mono text-[#a0ca92] flex items-center gap-2 animate-fadeIn">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{feedbackMensagem}</span>
          </div>
        )}

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
          {/* ======================================================== */}
          {/* ABA 1: CONTAS A VENCER & DISPARO                        */}
          {/* ======================================================== */}
          {abaAtiva === 'lembretes' && (
            <div className="flex flex-col gap-5">
              {/* KPIs de Vencimento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-[3px] bg-[#161413] border border-[#3d3a39] flex flex-col gap-1">
                  <span className="font-mono text-[10px] text-[#8a8380] uppercase">Vencem Hoje</span>
                  <span className="font-mono text-lg font-bold text-[#fafafa]">
                    {resumo.contasHoje.length}
                  </span>
                  <span className="font-mono text-[10px] text-[#ee6018]">
                    {resumo.contasHoje.length > 0 ? 'Prioridade imediata' : 'Nenhuma conta hoje'}
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
                    {resumo.todasNotificaveis.length} despesa(s)
                  </span>
                </div>
              </div>

              {/* Botão de Disparo em Lote para Todos os Números */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[3px] bg-[#161413] border border-[#3d3a39]">
                <div>
                  <h4 className="font-mono text-xs uppercase font-medium text-[#fafafa] flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-[#25D366]" />
                    DISPARAR PARA TODOS OS NÚMEROS CADASTRADOS
                  </h4>
                  <p className="text-xs text-[#8a8380] mt-0.5">
                    {destinatariosAtivos.length > 0 ? (
                      <>Enviará para <strong>{destinatariosAtivos.length} contato(s) ativo(s)</strong> ({destinatariosAtivos.map(d => d.nome).join(', ')}).</>
                    ) : (
                      <span className="text-[#ee6018]">Nenhum número ativo cadastrado. Cadastre na aba "Números Cadastrados"!</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setMostrarPreview(!mostrarPreview)}
                    className="px-3 py-1.5 rounded-[3px] bg-transparent border border-[#3d3a39] hover:border-[#8a8380] text-[#8a8380] hover:text-[#eeeeee] font-mono text-xs cursor-pointer transition"
                  >
                    {mostrarPreview ? 'Ocultar Texto' : 'Ver Mensagem'}
                  </button>

                  <button
                    onClick={() => handleDispararParaTodos(true)}
                    disabled={resumo.todasNotificaveis.length === 0 || destinatariosAtivos.length === 0 || disparandoLote}
                    className="px-4 py-2 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] disabled:opacity-40 text-[#101010] font-mono text-xs uppercase tracking-tight flex items-center gap-2 font-medium cursor-pointer transition"
                  >
                    <MessageSquare className="w-4 h-4 text-[#25D366]" />
                    <span>{disparandoLote ? 'Enviando...' : 'Disparar WhatsApp'}</span>
                  </button>
                </div>
              </div>

              {/* Preview Expansível da Mensagem */}
              {mostrarPreview && (
                <div className="p-4 rounded-[3px] bg-[#0c0c0c] border border-[#3d3a39] flex flex-col gap-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-[#1d1a18] pb-2">
                    <span className="font-mono text-[10px] text-[#8a8380] uppercase tracking-wider">
                      TEXTO FORMATADO PARA O WHATSAPP
                    </span>
                    <button
                      onClick={handleCopiarMensagem}
                      className="text-xs font-mono text-[#8a8380] hover:text-[#fafafa] flex items-center gap-1.5 transition cursor-pointer"
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

              {/* Lista Detalhada das Contas */}
              <div className="flex flex-col gap-2.5">
                <span className="font-mono text-xs uppercase tracking-tight text-[#fafafa]">
                  CONTAS PENDENTES A NOTIFICAR
                </span>

                {resumo.todasNotificaveis.length === 0 ? (
                  <div className="p-8 text-center rounded-[3px] border border-dashed border-[#3d3a39] text-[#8a8380] font-mono text-xs">
                    Excelente! Todas as contas com vencimento próximo estão quitadas.
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
                              {/* Botão Enviar Individual */}
                              <button
                                onClick={() => handleDispararIndividual(item, c.diasRestantes)}
                                className="px-2.5 py-1 rounded-[2px] bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] text-[10px] font-mono flex items-center gap-1 cursor-pointer transition"
                                title="Enviar lembrete desta conta no WhatsApp"
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

          {/* ======================================================== */}
          {/* ABA 2: CADASTRO DE MÚLTIPLOS NÚMEROS DE WHATSAPP         */}
          {/* ======================================================== */}
          {abaAtiva === 'destinatarios' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs uppercase tracking-tight text-[#fafafa] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#25D366]" />
                  NÚMEROS CADASTRADOS PARA ALERTA
                </span>
                <p className="text-xs text-[#8a8380]">
                  Cadastre os telefones dos responsáveis ou familiares (Titular, Cônjuge, Familiar) que devem receber os lembretes automáticos.
                </p>
              </div>

              {/* Formulário de Cadastro de Novo Número */}
              <form onSubmit={handleCadastrarDestinatario} className="p-4 rounded-[3px] bg-[#161413] border border-[#3d3a39] flex flex-col gap-3">
                <span className="font-mono text-xs uppercase text-[#eeeeee] flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#25D366]" />
                  Adicionar Novo Número de WhatsApp
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Identificação / Nome</label>
                    <input
                      type="text"
                      placeholder="Ex: Cônjuge, Meu WhatsApp..."
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2.5 py-1.5 text-xs text-[#eeeeee] focus:border-[#fafafa] focus:outline-none font-mono"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">WhatsApp (DDD + Número)</label>
                    <input
                      type="text"
                      placeholder="Ex: 11987654321"
                      value={novoNumero}
                      onChange={(e) => setNovoNumero(e.target.value)}
                      required
                      className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2.5 py-1.5 text-xs text-[#eeeeee] focus:border-[#fafafa] focus:outline-none font-mono"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Vínculo</label>
                    <select
                      value={novoTipo}
                      onChange={(e) => setNovoTipo(e.target.value as any)}
                      className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2 py-1.5 text-xs text-[#eeeeee] focus:border-[#fafafa] focus:outline-none font-mono"
                    >
                      <option value="titular">Titular</option>
                      <option value="conjuge">Cônjuge</option>
                      <option value="familiar">Familiar</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] font-mono text-xs uppercase tracking-tight font-medium flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Salvar Contato</span>
                  </button>
                </div>
              </form>

              {/* Lista de Contatos Cadastrados */}
              <div className="flex flex-col gap-2.5">
                <span className="font-mono text-xs uppercase tracking-tight text-[#fafafa]">
                  LISTA DE DESTINATÁRIOS ({config.destinatarios.length})
                </span>

                {config.destinatarios.length === 0 ? (
                  <div className="p-6 text-center rounded-[3px] border border-dashed border-[#3d3a39] text-[#8a8380] font-mono text-xs">
                    Nenhum número cadastrado ainda. Use o formulário acima para cadastrar o primeiro WhatsApp.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {config.destinatarios.map((dest) => (
                      <div
                        key={dest.id}
                        className={`p-3 rounded-[3px] bg-[#161413] border transition flex items-center justify-between gap-3 ${
                          dest.ativo ? 'border-[#3d3a39]' : 'border-[#242120] opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleAlternarAtivo(dest.id)}
                            className={`w-5 h-5 rounded-[2px] flex items-center justify-center cursor-pointer transition ${
                              dest.ativo
                                ? 'bg-[#25D366] text-[#101010]'
                                : 'border border-[#3d3a39] text-transparent'
                            }`}
                            title={dest.ativo ? 'Desativar alerta para este número' : 'Ativar alerta para este número'}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>

                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-medium text-[#fafafa]">
                                {dest.nome}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#101010] border border-[#3d3a39] text-[#8a8380] font-mono uppercase">
                                {dest.tipo || 'contato'}
                              </span>
                              {!dest.ativo && (
                                <span className="text-[9px] text-[#ee6018] font-mono">
                                  (DESATIVADO)
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-[#8a8380]">
                              {dest.numero}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Testar disparo individual */}
                          <button
                            onClick={() => handleTestarNumero(dest)}
                            className="px-2 py-1 rounded-[2px] bg-[#101010] hover:bg-[#1d1a18] border border-[#3d3a39] text-[#8a8380] hover:text-[#25D366] text-[10px] font-mono flex items-center gap-1 cursor-pointer transition"
                            title="Enviar mensagem de teste para este número"
                          >
                            <Send className="w-3 h-3" />
                            <span className="hidden sm:inline">Testar</span>
                          </button>

                          {/* Excluir número */}
                          <button
                            onClick={() => handleRemoverDestinatario(dest.id)}
                            className="p-1 text-[#8a8380] hover:text-[#ee6018] cursor-pointer transition"
                            title="Remover este número"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ABA 3: AUTOMAÇÃO DIÁRIA & WEBHOOK GATEWAY                */}
          {/* ======================================================== */}
          {abaAtiva === 'automacao' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs uppercase tracking-tight text-[#fafafa] flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#ee6018]" />
                  ROBÔ DE DISPARO AUTOMÁTICO DIÁRIO
                </span>
                <p className="text-xs text-[#8a8380]">
                  Quando ativado, o GestorLar verifica diariamente todas as contas com vencimento no dia ou próximas e dispara o alerta para os números cadastrados ativos.
                </p>
              </div>

              {/* Status do Disparo Hoje */}
              <div className="p-4 rounded-[3px] bg-[#161413] border border-[#3d3a39] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[3px] bg-[#1d1a18] border border-[#3d3a39] flex items-center justify-center">
                    {jaDisparouHoje ? (
                      <CheckCircle2 className="w-4 h-4 text-[#a0ca92]" />
                    ) : (
                      <Clock className="w-4 h-4 text-[#ee6018]" />
                    )}
                  </div>
                  <div>
                    <span className="font-mono text-xs font-semibold text-[#fafafa] block">
                      {jaDisparouHoje
                        ? 'STATUS DE HOJE: ALERTA DISPARADO COM SUCESSO'
                        : 'STATUS DE HOJE: DISPARO PENDENTE'}
                    </span>
                    <span className="text-[11px] font-mono text-[#8a8380]">
                      {config.ultimoDisparo
                        ? `Último envio registrado em: ${new Date(config.ultimoDisparo).toLocaleString('pt-BR')}`
                        : 'Nenhum disparo anterior registrado.'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDispararParaTodos(true)}
                  disabled={destinatariosAtivos.length === 0 || disparandoLote}
                  className="px-3.5 py-1.5 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] font-mono text-xs uppercase tracking-tight font-medium flex items-center gap-1.5 cursor-pointer transition shrink-0"
                >
                  <Zap className="w-3.5 h-3.5 text-[#ee6018]" />
                  <span>Forçar Disparo Agora</span>
                </button>
              </div>

              {/* Parâmetros de Disparo */}
              <div className="flex flex-col gap-4 p-4 rounded-[3px] bg-[#161413] border border-[#3d3a39]">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disparoAuto}
                    onChange={(e) => setDisparoAuto(e.target.checked)}
                    className="accent-[#25D366] w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-mono text-xs text-[#fafafa] block font-medium">
                      Ativar Disparo Automático Diário
                    </span>
                    <span className="text-[11px] text-[#8a8380]">
                      Dispara automaticamente para os números ativos ao acessar o painel ou detectar contas a vencer no dia.
                    </span>
                  </div>
                </label>

                <div className="border-t border-[#1d1a18] pt-3 flex flex-col gap-2">
                  <span className="font-mono text-[10px] text-[#8a8380] uppercase">
                    Janela de Antecedência do Alerta
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 5, 7].map((dias) => (
                      <button
                        key={dias}
                        type="button"
                        onClick={() => setDiasAntecedencia(dias)}
                        className={`px-3 py-1 rounded-[3px] font-mono text-xs cursor-pointer transition ${
                          diasAntecedencia === dias
                            ? 'bg-[#fafafa] text-[#101010] font-bold'
                            : 'bg-[#101010] border border-[#3d3a39] text-[#8a8380] hover:text-[#eeeeee]'
                        }`}
                      >
                        {dias === 1 ? '1 dia antes' : `${dias} dias antes`}
                        {dias === 3 && ' (Recomendado)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#1d1a18] pt-3 flex flex-col gap-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={incluirVencidas}
                      onChange={(e) => setIncluirVencidas(e.target.checked)}
                      className="accent-[#25D366] w-4 h-4 cursor-pointer"
                    />
                    <span className="font-mono text-xs text-[#eeeeee]">
                      Incluir no alerta contas que já venceram e continuam em aberto
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exibirBanner}
                      onChange={(e) => setExibirBanner(e.target.checked)}
                      className="accent-[#25D366] w-4 h-4 cursor-pointer"
                    />
                    <span className="font-mono text-xs text-[#eeeeee]">
                      Exibir banner persistente no topo do painel quando houver contas a vencer
                    </span>
                  </label>
                </div>
              </div>

              {/* Webhook / Gateway REST WhatsApp (Opcional) */}
              <div className="flex flex-col gap-3 p-4 rounded-[3px] bg-[#161413] border border-[#3d3a39]">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#a0ca92]" />
                  <span className="font-mono text-xs uppercase text-[#fafafa] font-medium">
                    Webhook / API WhatsApp Gateway (Opcional)
                  </span>
                </div>
                <p className="text-xs text-[#8a8380]">
                  Caso você use Z-API, Evolution API, Baileys ou uma Supabase Edge Function, configure a URL abaixo para que as mensagens sejam disparadas 100% em segundo plano (sem precisar abrir abas do navegador).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Endpoint POST Webhook</label>
                    <input
                      type="text"
                      placeholder="https://sua-api.com/send-message"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2.5 py-1.5 text-xs text-[#eeeeee] focus:border-[#fafafa] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-[10px] text-[#8a8380] block mb-1 uppercase">Bearer Token / API Key</label>
                    <input
                      type="password"
                      placeholder="Token secreto da API..."
                      value={webhookKey}
                      onChange={(e) => setWebhookKey(e.target.value)}
                      className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2.5 py-1.5 text-xs text-[#eeeeee] focus:border-[#fafafa] focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Botão Salvar Automação */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSalvarAutomacao}
                  className="px-5 py-2 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] font-mono text-xs uppercase tracking-tight font-medium cursor-pointer transition"
                >
                  Salvar Parâmetros de Automação
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div className="px-6 py-3 border-t border-[#3d3a39] bg-[#161413] flex items-center justify-between text-xs font-mono text-[#8a8380]">
          <span>SISTEMA DE ALERTA AUTOMÁTICO WHATSAPP // GESTORLAR</span>
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
