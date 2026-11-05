import { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  X, 
  Copy, 
  Check, 
  Send, 
  ShieldCheck, 
  Calendar,
  CreditCard,
  PieChart,
  TrendingUp
} from 'lucide-react';
import { 
  obterStatusNotificacoes, 
  solicitarPermissaoNotificacoes, 
  dispararNotificacaoLocal,
  gerarAlertasDoMomento,
  obterPreferenciasNotificacao,
  salvarPreferenciasNotificacao,
  type NotificationStatus,
  type PreferenciasNotificacao
} from '../services/firebaseNotificationService';
import type { EstadoFinanceiro, CalculoOrcamentario } from '../types/finance';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  estado: EstadoFinanceiro;
  calculos: CalculoOrcamentario;
  onAlternarPago?: (id: string) => void;
}

export const ModalNotificacoesFirebase = ({
  aberto,
  onFechar,
  estado,
  calculos,
  onAlternarPago,
}: Props) => {
  const [status, setStatus] = useState<NotificationStatus>(obterStatusNotificacoes);
  const [preferencias, setPreferencias] = useState<PreferenciasNotificacao>(obterPreferenciasNotificacao);
  const [carregando, setCarregando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'alertas' | 'config' | 'testes'>('alertas');

  useEffect(() => {
    if (aberto) {
      setStatus(obterStatusNotificacoes());
      setPreferencias(obterPreferenciasNotificacao());
    }
  }, [aberto]);

  if (!aberto) return null;

  const alertasAtivos = gerarAlertasDoMomento(estado, calculos);

  const handleSolicitarPermissao = async () => {
    setCarregando(true);
    setMensagemSucesso(null);
    setMensagemErro(null);

    try {
      const res = await solicitarPermissaoNotificacoes();
      setStatus(obterStatusNotificacoes());

      if (res.sucesso) {
        setMensagemSucesso(res.mensagem);
      } else {
        setMensagemErro(res.mensagem);
      }
    } catch (e: any) {
      setMensagemErro(`Falha ao ativar: ${e?.message || 'Erro inesperado'}`);
    } finally {
      setCarregando(false);
    }
  };

  const handleTogglePreferencia = (chave: keyof PreferenciasNotificacao) => {
    const novasPrefs = {
      ...preferencias,
      [chave]: !preferencias[chave],
    };
    setPreferencias(novasPrefs);
    salvarPreferenciasNotificacao(novasPrefs);
  };

  const dispararTesteEspecifico = async (tipo: 'vencimento' | 'saldo_negativo' | 'regra_503020' | 'investimento') => {
    let titulo = '';
    let corpo = '';

    if (tipo === 'vencimento') {
      titulo = '🚨 Conta Vence HOJE: "Energia Elétrica"';
      corpo = 'O pagamento de R$ 380,00 vence hoje! Evite encargos e marque como quitado.';
    } else if (tipo === 'saldo_negativo') {
      titulo = '🔴 Orçamento no Vermelho! Saldo Negativo';
      corpo = 'Alerta: Seus gastos ultrapassaram sua renda em R$ 420,00 (103% comprometido).';
    } else if (tipo === 'regra_503020') {
      titulo = '📌 Teto de Contas Fixas Ultrapassado';
      corpo = 'Suas contas essenciais atingiram 54% da renda (Teto recomendado: 50%). Excesso de R$ 500,00.';
    } else if (tipo === 'investimento') {
      titulo = '🎯 Parabéns! Meta de Investimentos Atingida';
      corpo = 'Você guardou 20% da sua renda em aportes este mês (R$ 2.500,00). Excelente progresso!';
    }

    const ok = await dispararNotificacaoLocal(titulo, corpo);
    if (ok) {
      setMensagemSucesso(`Notificação push de teste enviada: "${titulo}"`);
      setTimeout(() => setMensagemSucesso(null), 4000);
    } else {
      setMensagemErro('Permissão de notificação não concedida no navegador.');
    }
  };

  const handleCopiarToken = () => {
    if (status.tokenFCM) {
      navigator.clipboard.writeText(status.tokenFCM);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fadeIn">
      <div 
        className="w-full max-w-xl bg-[#101010] border border-[#3d3a39] rounded-[10px] p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal: macOS Terminal Chrome */}
        <div className="flex items-center justify-between border-b border-[#3d3a39] pb-3">
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
            </div>
            <span className="sm:ml-2 font-mono text-[11px] uppercase tracking-[-0.24px] text-[#eeeeee]">
              FACTORY // PUSH_NOTIFICATIONS.SYS
            </span>
          </div>

          <button
            onClick={onFechar}
            className="text-[#8a8380] hover:text-[#eeeeee] cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensagens de Feedback */}
        {mensagemSucesso && (
          <div className="p-3 rounded-[3px] bg-[#161413] border border-[#a0ca92] text-[#a0ca92] text-xs flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#a0ca92]" />
            <span>{mensagemSucesso}</span>
          </div>
        )}

        {mensagemErro && (
          <div className="p-3 rounded-[3px] bg-[#161413] border border-[#ee6018] text-[#ee6018] text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#ee6018]" />
            <span>{mensagemErro}</span>
          </div>
        )}

        {/* Status Geral de Permissão */}
        <div className="p-4 rounded-[3px] bg-[#161413] border border-[#3d3a39] flex items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-[3px] flex items-center justify-center border border-[#3d3a39] ${
              status.permissao === 'granted'
                ? 'bg-[#101010] text-[#a0ca92]'
                : status.permissao === 'denied'
                ? 'bg-[#101010] text-[#ee6018]'
                : 'bg-[#101010] text-[#8a8380]'
            }`}>
              {status.permissao === 'granted' ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-xs uppercase text-[#eeeeee] block">
                {status.permissao === 'granted' && 'PUSH ATIVO NO DISPOSITIVO'}
                {status.permissao === 'denied' && 'BLOQUEADO NO NAVEGADOR'}
                {status.permissao === 'default' && 'PERMISSÃO PENDENTE'}
              </span>
              <span className="text-[11px] text-[#8a8380] font-sans">
                {status.permissao === 'granted' && 'Alertas em tempo real com tela fechada.'}
                {status.permissao === 'denied' && 'Altere no cadeado da barra de navegação.'}
                {status.permissao === 'default' && 'Clique para autorizar notificações.'}
              </span>
            </div>
          </div>

          {status.permissao !== 'granted' ? (
            <button
              onClick={handleSolicitarPermissao}
              disabled={carregando}
              className="px-3.5 py-1.5 rounded-[3px] text-xs font-mono uppercase bg-[#fafafa] text-[#101010] hover:bg-[#eeeeee] transition cursor-pointer disabled:opacity-50 shrink-0"
            >
              {carregando ? 'ATIVANDO...' : 'ATIVAR AGORA'}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] text-[11px] font-mono text-[#a0ca92] border border-[#3d3a39]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92]" />
              ATIVO
            </span>
          )}
        </div>

        {/* Abas de Navegação Interna: Factory Terminal */}
        <div className="flex border-b border-[#3d3a39] gap-2 font-mono text-xs">
          <button
            onClick={() => setAbaAtiva('alertas')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              abaAtiva === 'alertas'
                ? 'border-[#eeeeee] text-[#eeeeee]'
                : 'border-transparent text-[#8a8380] hover:text-[#eeeeee]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>ALERTAS ({alertasAtivos.length})</span>
          </button>

          <button
            onClick={() => setAbaAtiva('config')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              abaAtiva === 'config'
                ? 'border-[#eeeeee] text-[#eeeeee]'
                : 'border-transparent text-[#8a8380] hover:text-[#eeeeee]'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>PREFERÊNCIAS</span>
          </button>

          <button
            onClick={() => setAbaAtiva('testes')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              abaAtiva === 'testes'
                ? 'border-[#eeeeee] text-[#eeeeee]'
                : 'border-transparent text-[#8a8380] hover:text-[#eeeeee]'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>SIMULADOR</span>
          </button>
        </div>

        {/* CONTEÚDO DA ABA 1: ALERTAS DO MOMENTO */}
        {abaAtiva === 'alertas' && (
          <div className="space-y-3 font-mono">
            {alertasAtivos.length === 0 ? (
              <div className="p-6 rounded-[3px] bg-[#161413] border border-[#3d3a39] text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-[#a0ca92] mx-auto" />
                <h4 className="text-xs uppercase text-[#eeeeee]">Orçamento 100% em dia</h4>
                <p className="text-[11px] text-[#8a8380] max-w-sm mx-auto font-sans">
                  Não há contas vencendo hoje, o saldo livre está positivo e os pilares 50-30-20 estão controlados.
                </p>
              </div>
            ) : (
              alertasAtivos.map((alerta) => (
                <div
                  key={alerta.id}
                  className={`p-3 rounded-[3px] border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                    alerta.nivel === 'urgente'
                      ? 'bg-[#161413] border-[#ee6018] text-[#eeeeee]'
                      : alerta.nivel === 'alerta'
                      ? 'bg-[#161413] border-[#ee6018] text-[#eeeeee]'
                      : 'bg-[#161413] border-[#a0ca92] text-[#eeeeee]'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-xs text-[#eeeeee] block font-medium">
                      {alerta.titulo}
                    </span>
                    <p className="text-[11px] text-[#8a8380] font-sans leading-relaxed">
                      {alerta.mensagem}
                    </p>
                  </div>

                  {alerta.itemRelacionadoId && onAlternarPago && (
                    <button
                      onClick={() => onAlternarPago(alerta.itemRelacionadoId!)}
                      className="px-3 py-1 rounded-[3px] text-[11px] font-mono uppercase bg-[#fafafa] text-[#101010] hover:bg-[#eeeeee] shrink-0 transition cursor-pointer"
                    >
                      Marcar Pago
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* CONTEÚDO DA ABA 2: REGRAS E PREFERÊNCIAS */}
        {abaAtiva === 'config' && (
          <div className="space-y-3">
            <span className="text-[11px] text-[#9CA3AF] block mb-2">
              Selecione quais tipos de notificação push você deseja receber automaticamente:
            </span>

            <div className="space-y-2.5">
              {/* Opção 1: Contas a Vencer */}
              <div className="p-3 rounded-2xl bg-[#0f121d] border border-[#1a1f2e] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-orange-400" />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Contas a Vencer e Atrasadas
                    </span>
                    <span className="text-[10px] text-[#9CA3AF]">
                      Avisa no dia do vencimento, com 3 dias de antecedência e se atrasar.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleTogglePreferencia('contasVencendo')}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                    preferencias.contasVencendo ? 'bg-[#00FF87]' : 'bg-[#2a3147]'
                  }`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-[#0a0c14] transition-transform absolute top-0.5 ${
                    preferencias.contasVencendo ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>

              {/* Opção 2: Renda Chegando ao Negativo */}
              <div className="p-3 rounded-2xl bg-[#0f121d] border border-[#1a1f2e] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-rose-400" />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Renda Chegando ao Negativo / Déficit
                    </span>
                    <span className="text-[10px] text-[#9CA3AF]">
                      Alerta urgente se o saldo livre ficar menor que 10% ou no vermelho.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleTogglePreferencia('saldoNegativo')}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                    preferencias.saldoNegativo ? 'bg-[#00FF87]' : 'bg-[#2a3147]'
                  }`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-[#0a0c14] transition-transform absolute top-0.5 ${
                    preferencias.saldoNegativo ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>

              {/* Opção 3: Estouro 50-30-20 */}
              <div className="p-3 rounded-2xl bg-[#0f121d] border border-[#1a1f2e] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PieChart className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Estouro dos Tetos da Regra 50-30-20
                    </span>
                    <span className="text-[10px] text-[#9CA3AF]">
                      Avisa se Contas Fixas passarem de 50% ou Supérfluos passarem de 30%.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleTogglePreferencia('estouroMetas503020')}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                    preferencias.estouroMetas503020 ? 'bg-[#00FF87]' : 'bg-[#2a3147]'
                  }`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-[#0a0c14] transition-transform absolute top-0.5 ${
                    preferencias.estouroMetas503020 ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>

              {/* Opção 4: Investimentos */}
              <div className="p-3 rounded-2xl bg-[#0f121d] border border-[#1a1f2e] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Metas de Investimentos & Aportes
                    </span>
                    <span className="text-[10px] text-[#9CA3AF]">
                      Parabéns ao atingir 20% e lembrete caso termine o mês sem investir.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleTogglePreferencia('investimentos')}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                    preferencias.investimentos ? 'bg-[#00FF87]' : 'bg-[#2a3147]'
                  }`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-[#0a0c14] transition-transform absolute top-0.5 ${
                    preferencias.investimentos ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 3: SIMULADOR DE NOTIFICAÇÕES */}
        {abaAtiva === 'testes' && (
          <div className="space-y-3">
            <span className="text-[11px] text-[#9CA3AF] block">
              Clique em qualquer botão abaixo para disparar um alerta nativo imediato no seu sistema operacional:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => dispararTesteEspecifico('vencimento')}
                className="p-3 rounded-2xl bg-[#141824] hover:bg-[#1a2030] border border-[#23293d] hover:border-orange-400/50 text-white text-xs text-left flex flex-col gap-1 transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-orange-400 font-bold">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Simular Conta Vencendo</span>
                </div>
                <span className="text-[10px] text-[#9CA3AF]">
                  "Energia Elétrica vence HOJE (R$ 380,00)"
                </span>
              </button>

              <button
                onClick={() => dispararTesteEspecifico('saldo_negativo')}
                className="p-3 rounded-2xl bg-[#141824] hover:bg-[#1a2030] border border-[#23293d] hover:border-rose-400/50 text-white text-xs text-left flex flex-col gap-1 transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Simular Saldo Negativo</span>
                </div>
                <span className="text-[10px] text-[#9CA3AF]">
                  "Orçamento no Vermelho (-R$ 420,00)"
                </span>
              </button>

              <button
                onClick={() => dispararTesteEspecifico('regra_503020')}
                className="p-3 rounded-2xl bg-[#141824] hover:bg-[#1a2030] border border-[#23293d] hover:border-amber-400/50 text-white text-xs text-left flex flex-col gap-1 transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <PieChart className="w-3.5 h-3.5" />
                  <span>Simular Estouro 50-30-20</span>
                </div>
                <span className="text-[10px] text-[#9CA3AF]">
                  "Contas Fixas ultrapassaram 50% da renda"
                </span>
              </button>

              <button
                onClick={() => dispararTesteEspecifico('investimento')}
                className="p-3 rounded-2xl bg-[#141824] hover:bg-[#1a2030] border border-[#23293d] hover:border-emerald-400/50 text-white text-xs text-left flex flex-col gap-1 transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-[#00FF87] font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Simular Meta de Aporte</span>
                </div>
                <span className="text-[10px] text-[#9CA3AF]">
                  "Parabéns! Meta de investimentos concluída"
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Visualizador de Token FCM */}
        <div className="p-3.5 rounded-2xl bg-[#090b12] border border-[#161a26] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00FF87]" />
              Token de Dispositivo FCM (Web Push)
            </span>
            {status.tokenFCM && (
              <button
                onClick={handleCopiarToken}
                className="text-[11px] text-[#00FF87] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiado ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiado ? 'Copiado!' : 'Copiar'}
              </button>
            )}
          </div>

          <div className="p-2 rounded-xl bg-[#0e111a] border border-[#1a1f2e] font-mono text-[10px] text-[#9CA3AF] break-all select-all">
            {status.tokenFCM || (
              <span className="text-[#4B5563] italic">
                {status.firebaseConfigurado
                  ? 'Permissão concedida. Token será gerado na próxima conexão FCM.'
                  : 'Token será gerado assim que as credenciais forem adicionadas no .env'}
              </span>
            )}
          </div>
        </div>

        {/* Rodapé com botão de fechar */}
        <div className="flex justify-end pt-2 border-t border-[#161a26]">
          <button
            onClick={onFechar}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#161924] hover:bg-[#1e2333] text-white transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
