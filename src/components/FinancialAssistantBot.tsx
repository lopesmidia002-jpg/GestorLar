import { useState, useEffect, useRef } from 'react';
import type { EstadoFinanceiro, CategoriaOrcamentaria } from '../types/finance';
import type { PendingConfirmationProposal } from '../types/aiSchema';
import { 
  processarTextoComando, 
  gerarChaveIdempotente 
} from '../services/aiProcessingService';
import { executarConfirmacaoAprovada } from '../services/aiDomainHandlers';
import { 
  Bot, 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  Minimize2,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Clock,
  Loader2
} from 'lucide-react';

interface Props {
  estado: EstadoFinanceiro;
  onAdicionarItem: (item: { titulo: string; valor: number; categoria: CategoriaOrcamentaria; tipoDetalhado: string; vencimento: string; pago: boolean }) => void;
  onAtualizarItem: (id: string, updates: Record<string, any>) => void;
  onRemoverItem: (id: string) => void;
  onAlternarPago: (id: string) => void;
  onAtualizarRenda: (novaRenda: number) => void;
  onAtualizarMetas: (novasMetas: { fixas?: number; superfluos?: number; investimentos?: number }) => void;
  onZerarPainel?: (manterRenda?: boolean) => void;
}

interface MensagemChat {
  id: string;
  autor: 'usuario' | 'bot';
  texto: string;
  hora: string;
  sucesso?: boolean;
  acao?: string;
  proposta?: PendingConfirmationProposal;
  idempotencyKey?: string;
  permiteRepetir?: boolean;
  comandoRepetir?: string;
}

export const FinancialAssistantBot = ({
  estado,
  onAdicionarItem,
  onAtualizarItem,
  onRemoverItem,
  onAlternarPago,
  onAtualizarRenda,
  onAtualizarMetas,
  onZerarPainel,
}: Props) => {
  const [aberto, setAberto] = useState(false);
  const [inputTexto, setInputTexto] = useState('');
  const [falaAtiva, setFalaAtiva] = useState(true);
  const [processando, setProcessando] = useState(false);

  // Estados de Transcrição de Voz Direta (Fala em Tempo Real)
  const [ouvindoVoz, setOuvindoVoz] = useState(false);
  const [transcricaoAoVivo, setTranscricaoAoVivo] = useState('');
  const [suporteVoz, setSuporteVoz] = useState(true);

  const recognitionRef = useRef<any>(null);
  const ultimoComandoRef = useRef<string>('');
  const ouvindoVozRef = useRef(false);
  const silencioTimerRef = useRef<any>(null);
  const tratarEnvioTextoRef = useRef<(textoComando?: string, idempotencyKeyParam?: string) => Promise<void>>(() => Promise.resolve());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [mensagens, setMensagens] = useState<MensagemChat[]>(() => {
    try {
      const salvo = localStorage.getItem('gestorlar_chat_history');
      if (salvo) return JSON.parse(salvo);
    } catch {
      // fallback
    }
    return [
      {
        id: 'msg_welcome',
        autor: 'bot',
        texto: '👋 Olá! Sou o GestorLar IA, seu copiloto contábil e financeiro.\n\nPode falar pelo microfone ou digitar qualquer operação:\n• "Almoço 45"\n• "Paguei 500 da dívida com o banco"\n• "Emprestei 200 pro Carlos"\n• "Transferir 300 da Corrente para a Poupança"\n• "Investi 1000 em CDB"\n• "Qual meu saldo em contas?"',
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  // Salva histórico de mensagens no localStorage (mantém últimas 30)
  useEffect(() => {
    try {
      localStorage.setItem('gestorlar_chat_history', JSON.stringify(mensagens.slice(-30)));
    } catch {
      // quota handling
    }
  }, [mensagens]);

  // Foco no input ao abrir a janela
  useEffect(() => {
    if (aberto) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [aberto]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (aberto) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensagens, aberto, ouvindoVoz, processando]);

  // Inicializa o Reconhecimento de Voz Direta (Web Speech API)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSuporteVoz(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        ouvindoVozRef.current = true;
        setOuvindoVoz(true);
      };

      recognition.onresult = (event: any) => {
        let transcriptInterim = '';
        let transcriptFinal = '';

        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            transcriptFinal += res[0].transcript + ' ';
          } else {
            transcriptInterim += res[0].transcript;
          }
        }

        const textoDetectado = (transcriptFinal + transcriptInterim).trim();
        if (textoDetectado) {
          setTranscricaoAoVivo(textoDetectado);
          setInputTexto(textoDetectado);
          ultimoComandoRef.current = textoDetectado;

          // Se o usuário parar de falar por 1.8 segundos, envia automaticamente
          if (silencioTimerRef.current) {
            clearTimeout(silencioTimerRef.current);
          }
          silencioTimerRef.current = setTimeout(() => {
            if (ouvindoVozRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch (e) {
                console.warn('Erro ao finalizar gravação por silêncio:', e);
              }
            }
          }, 1800);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' || event.error === 'aborted') {
          // Pausa sem fala ou parada manual intencional: não abortar
          return;
        }
        console.warn('Evento no reconhecimento de fala:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          alert('Permissão de microfone negada. Conceda permissão no navegador para falar com o assistente.');
        }
        if (silencioTimerRef.current) {
          clearTimeout(silencioTimerRef.current);
          silencioTimerRef.current = null;
        }
        ouvindoVozRef.current = false;
        setOuvindoVoz(false);
      };

      recognition.onend = () => {
        if (silencioTimerRef.current) {
          clearTimeout(silencioTimerRef.current);
          silencioTimerRef.current = null;
        }

        const eraOuvindo = ouvindoVozRef.current;
        ouvindoVozRef.current = false;
        setOuvindoVoz(false);

        const textoDisparar = (ultimoComandoRef.current || '').trim();
        if (eraOuvindo && textoDisparar.length > 0) {
          tratarEnvioTextoRef.current(textoDisparar);
          ultimoComandoRef.current = '';
          setTranscricaoAoVivo('');
        }
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Falha ao inicializar SpeechRecognition:', e);
      setSuporteVoz(false);
    }

    return () => {
      if (silencioTimerRef.current) {
        clearTimeout(silencioTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const falarResposta = (texto: string) => {
    if (!falaAtiva || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const textoLimpo = texto
        .replace(/[*_#•💡🎉✅✔️✏️🗑️📊📋🔍📌📈🛒👋⚠️❌]/g, '')
        .replace(/R\$\s?/g, 'reais ')
        .replace(/%/g, ' por cento')
        .replace(/\n+/g, '. ');

      const utterance = new SpeechSynthesisUtterance(textoLimpo);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Falha na síntese de voz:', e);
    }
  };

  // Alterna ativação do microfone (inicia ou interrompe a fala direta)
  const alternarReconhecimentoVoz = () => {
    if (!suporteVoz || !recognitionRef.current) {
      alert('Seu navegador não oferece suporte à transcrição direta de voz. Digite seu comando pelo teclado.');
      return;
    }

    if (ouvindoVozRef.current) {
      if (silencioTimerRef.current) {
        clearTimeout(silencioTimerRef.current);
        silencioTimerRef.current = null;
      }
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Erro ao parar reconhecimento:', e);
      }
    } else {
      try {
        if (silencioTimerRef.current) {
          clearTimeout(silencioTimerRef.current);
          silencioTimerRef.current = null;
        }
        setInputTexto('');
        setTranscricaoAoVivo('');
        ultimoComandoRef.current = '';
        ouvindoVozRef.current = true;
        setOuvindoVoz(true);
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Erro ao iniciar reconhecimento:', e);
        ouvindoVozRef.current = false;
        setOuvindoVoz(false);
      }
    }
  };

  // ========================================================
  // PROCESSAMENTO DO COMANDO (TEXTO OU FALA DIRETA)
  // Coloca a mensagem exatamente com o texto falado
  // ========================================================
  const tratarEnvioTexto = async (textoComando?: string, idempotencyKeyParam?: string) => {
    const prompt = (textoComando || inputTexto).trim();
    if (!prompt || processando) return;

    const horaAtual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const idempotencyKey = idempotencyKeyParam || gerarChaveIdempotente();

    // Mensagem do usuário com a frase exatamente falada
    const novaMsgUsuario: MensagemChat = {
      id: `user_${Date.now()}`,
      autor: 'usuario',
      texto: prompt,
      hora: horaAtual,
      idempotencyKey
    };

    setMensagens((prev) => [...prev, novaMsgUsuario]);
    setInputTexto('');
    setTranscricaoAoVivo('');
    setProcessando(true);

    try {
      const resultado = await processarTextoComando(prompt, {
        idempotencyKey,
        estadoLocal: estado,
        onAdicionarItem,
        onAtualizarItem,
        onRemoverItem,
        onAlternarPago,
        onAtualizarRenda,
        onAtualizarMetas,
        onZerarPainel,
      });

      const novaMsgBot: MensagemChat = {
        id: `bot_${Date.now()}`,
        autor: 'bot',
        texto: resultado.mensagem,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sucesso: resultado.sucesso,
        acao: resultado.acaoExecutada,
        proposta: resultado.propostaConfirmacao,
        idempotencyKey,
        permiteRepetir: resultado.erro?.permiteRepetir,
        comandoRepetir: prompt
      };

      setMensagens((prev) => [...prev, novaMsgBot]);
      if (resultado.sucesso) {
        falarResposta(resultado.mensagem);
      }
    } catch (e: any) {
      setMensagens((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          autor: 'bot',
          texto: `⚠️ Falha ao processar comando: ${e.message || 'Erro inesperado'}.`,
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sucesso: false,
          idempotencyKey,
          permiteRepetir: true,
          comandoRepetir: prompt
        }
      ]);
    } finally {
      setProcessando(false);
    }
  };

  // Mantém a ref sincronizada para callbacks assíncronos de áudio/voz sem re-renderizar
  useEffect(() => {
    tratarEnvioTextoRef.current = tratarEnvioTexto;
  });

  // ========================================================
  // 13. EXECUÇÃO DE CONFIRMAÇÃO PROPOSTA
  // ========================================================
  const confirmarProposta = async (msgId: string, token: string) => {
    setProcessando(true);
    try {
      const resultado = await executarConfirmacaoAprovada(token, {
        idempotencyKey: `cnf_click_${token}`,
        estadoLocal: estado,
        onAdicionarItem,
        onAtualizarItem,
        onRemoverItem,
        onAlternarPago,
        onAtualizarRenda,
        onAtualizarMetas,
        onZerarPainel,
      });

      // Atualiza a proposta na mensagem original para que os botões fiquem desabilitados
      setMensagens((prev) =>
        prev.map((m) => {
          if (m.id === msgId && m.proposta) {
            return {
              ...m,
              proposta: { ...m.proposta, status: resultado.sucesso ? 'confirmado' : 'cancelado' }
            };
          }
          return m;
        })
      );

      // Adiciona mensagem com resultado da execução confirmada
      const novaMsgBot: MensagemChat = {
        id: `bot_cnf_res_${Date.now()}`,
        autor: 'bot',
        texto: resultado.mensagem,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sucesso: resultado.sucesso,
        acao: resultado.acaoExecutada
      };
      setMensagens((prev) => [...prev, novaMsgBot]);

      if (resultado.sucesso) {
        falarResposta(resultado.mensagem);
      }
    } finally {
      setProcessando(false);
    }
  };

  const cancelarProposta = (msgId: string) => {
    setMensagens((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.proposta) {
          return {
            ...m,
            proposta: { ...m.proposta, status: 'cancelado' }
          };
        }
        return m;
      })
    );
    setMensagens((prev) => [
      ...prev,
      {
        id: `bot_cnc_${Date.now()}`,
        autor: 'bot',
        texto: 'Operação cancelada pelo usuário. Nenhuma alteração foi efetuada.',
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sucesso: false
      }
    ]);
  };

  const limparHistoricoChat = () => {
    const msgPadrao: MensagemChat = {
      id: `msg_${Date.now()}`,
      autor: 'bot',
      texto: '🧹 Conversa reiniciada! Como posso te ajudar com o orçamento agora?',
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMensagens([msgPadrao]);
    try {
      localStorage.removeItem('gestorlar_chat_history');
    } catch {
      // ignore
    }
  };

  const comandosSugeridos = [
    'Qual meu saldo em contas?',
    'Gastos por categoria',
    'Dívidas pendentes',
    'Almoço 45',
    'Paguei 300 de dívida',
    'Emprestei 150 pro Pedro',
    'Transferir 200 da Corrente para Poupança',
    'Resumo financeiro',
  ];

  return (
    <>
      {/* Botão Flutuante de Ativação do Assistente: Factory Terminal Control Surface */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setAberto(!aberto)}
          className="p-3 rounded-[3px] bg-[#1d1a18] border border-[#3d3a39] hover:border-[#fafafa] text-[#eeeeee] flex items-center gap-3 cursor-pointer"
          title="Assistente Financeiro Factory"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-4 h-4 text-[#eeeeee]" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#ee6018]" />
          </div>

          <div className="text-left hidden sm:block pr-1 font-mono">
            <span className="text-xs uppercase tracking-tight text-[#eeeeee] block">
              FACTORY // IA
            </span>
            <span className="text-[10px] text-[#8a8380]">
              {ouvindoVoz ? '● OUVINDO...' : 'TERMINAL ATIVO'}
            </span>
          </div>
        </button>
      </div>

      {/* Janela Modal do Assistente Financeiro */}
      {aberto && (
        <div className="fixed inset-x-4 bottom-20 sm:right-6 sm:left-auto sm:w-[460px] max-h-[85vh] h-[600px] z-50 rounded-[10px] bg-[#101010] border border-[#3d3a39] flex flex-col overflow-hidden">
          {/* Header do Chatbot: macOS Terminal Chrome */}
          <div className="h-9 bg-[#161413] border-b border-[#3d3a39] px-4 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
              <span className="ml-2 font-mono text-[11px] uppercase tracking-[-0.24px] text-[#eeeeee]">
                FACTORY // COPILOT_TERMINAL.SYS
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={limparHistoricoChat}
                className="text-[#8a8380] hover:text-[#ee6018]"
                title="Limpar histórico"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setFalaAtiva(!falaAtiva)}
                className={`text-xs ${falaAtiva ? 'text-[#a0ca92]' : 'text-[#8a8380]'}`}
                title={falaAtiva ? 'Voz ativada' : 'Voz silenciada'}
              >
                {falaAtiva ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setAberto(false)}
                className="text-[#8a8380] hover:text-[#eeeeee]"
                title="Minimizar janela"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Feed de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs font-mono">
            {mensagens.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.autor === 'usuario' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-[3px] p-3 border ${
                    msg.autor === 'usuario'
                      ? 'bg-[#1d1a18] text-[#eeeeee] border-[#3d3a39]'
                      : 'bg-[#161413] text-[#eeeeee] border-[#1d1a18]'
                  }`}
                >
                  {msg.autor === 'bot' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-[#8a8380] mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92]" />
                      <span>FACTORY_AI</span>
                      {msg.sucesso && (
                        <span className="ml-auto text-[9px] text-[#a0ca92]">
                          [EXECUTADO]
                        </span>
                      )}
                    </div>
                  )}

                  <p className="whitespace-pre-line leading-relaxed font-sans">{msg.texto}</p>

                  {/* 13. CARD DE CONFIRMAÇÃO DE OPERAÇÃO PROPOSTA */}
                  {msg.proposta && (
                    <div className="mt-2.5 p-2.5 rounded-[3px] bg-[#101010] border border-[#3d3a39] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-[#ee6018] flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> {msg.proposta.titulo_resumo}
                        </span>
                        <span className="text-[9px] font-mono px-1 rounded uppercase border border-[#3d3a39] text-[#8a8380]">
                          {msg.proposta.impacto_financeiro}
                        </span>
                      </div>

                      <p className="text-[10px] text-[#9CA3AF] leading-normal">
                        {msg.proposta.descricao_detalhada}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-[#1f2638] text-[9px] font-mono text-[#6B7280]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Expira em 10 min
                        </span>
                        <span>Token: {msg.proposta.token.slice(0, 10)}...</span>
                      </div>

                      {msg.proposta.status === 'pendente' ? (
                        <div className="flex items-center gap-2 pt-1.5">
                          <button
                            onClick={() => confirmarProposta(msg.id, msg.proposta!.token)}
                            disabled={processando}
                            className="flex-1 py-1.5 px-3 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] font-mono text-xs uppercase tracking-tight flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" /> Confirmar
                          </button>
                          <button
                            onClick={() => cancelarProposta(msg.id)}
                            disabled={processando}
                            className="py-1.5 px-3 rounded-[3px] bg-transparent border border-[#3d3a39] hover:border-[#8a8380] text-[#eeeeee] font-mono text-xs uppercase tracking-tight flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" /> Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="pt-1 text-center">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[3px] ${
                            msg.proposta.status === 'confirmado' 
                              ? 'bg-[#a0ca92]/20 text-[#a0ca92] border border-[#a0ca92]/30' 
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            Proposta {msg.proposta.status}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botão de Repetir Operação (com Idempotência) em caso de erro */}
                  {msg.permiteRepetir && msg.comandoRepetir && (
                    <div className="mt-2 pt-2 border-t border-[#3d3a39] flex items-center justify-between">
                      <span className="text-[10px] text-[#8a8380] font-mono">Deseja tentar novamente?</span>
                      <button
                        onClick={() => tratarEnvioTexto(msg.comandoRepetir, msg.idempotencyKey)}
                        disabled={processando}
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-[#ee6018] hover:underline"
                      >
                        <RotateCcw className="w-3 h-3" /> Repetir comando
                      </button>
                    </div>
                  )}

                  <span className="text-[9px] font-mono text-[#8a8380] block text-right mt-1.5">
                    {msg.hora}
                  </span>
                </div>
              </div>
            ))}

            {/* Visualizador de Fala em Tempo Real (Transcreve enquanto fala sem gravar arquivo) */}
            {ouvindoVoz && (
              <div className="p-3 rounded-[3px] bg-[#1d1a18] border border-[#ee6018]/50 text-[#eeeeee] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-3.5 h-3.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#ee6018] animate-ping" />
                    <div className="absolute inset-0 w-3.5 h-3.5 rounded-full bg-[#ee6018]" />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono font-medium text-[#ee6018] uppercase tracking-wider block">
                      REC_AUDIO // ESCUTANDO EM TEMPO REAL...
                    </span>
                    <span className="text-xs text-[#fafafa] font-mono">
                      {transcricaoAoVivo ? `"${transcricaoAoVivo}"` : 'Fale agora seu comando (ex: "Almoço 45", "Coloque 50 de almoço")...'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={alternarReconhecimentoVoz}
                  className="px-2.5 py-1 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] text-[11px] font-mono tracking-tight uppercase cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            )}

            {/* Spinner de Processamento */}
            {processando && (
              <div className="flex items-center gap-2 p-3 rounded-[3px] bg-[#1d1a18] border border-[#3d3a39] text-[#ee6018]">
                <Loader2 className="w-4 h-4 animate-spin text-[#ee6018]" />
                <span className="text-xs font-mono uppercase tracking-wider text-[#eeeeee]">
                  INTERPRETANDO COMANDO E ATUALIZANDO LEDGER...
                </span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chips de Comandos Sugeridos */}
          <div className="px-4 py-2 border-t border-[#3d3a39] bg-[#101010] overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-thin">
            {comandosSugeridos.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => tratarEnvioTexto(cmd)}
                disabled={processando || ouvindoVoz}
                className="px-2.5 py-1 rounded-[3px] text-[11px] font-mono text-[#8a8380] hover:text-[#eeeeee] hover:border-[#8a8380] bg-[#1d1a18] border border-[#3d3a39] transition cursor-pointer disabled:opacity-40"
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* Input Bar com Microfone de Fala Direta e Envio */}
          <div className="p-3 border-t border-[#3d3a39] bg-[#161413]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (ouvindoVozRef.current && recognitionRef.current) {
                  if (silencioTimerRef.current) {
                    clearTimeout(silencioTimerRef.current);
                    silencioTimerRef.current = null;
                  }
                  try {
                    recognitionRef.current.stop();
                  } catch {}
                  ouvindoVozRef.current = false;
                  setOuvindoVoz(false);
                }
                tratarEnvioTexto();
              }}
              className="flex items-center gap-2"
            >
              {/* Botão de Fala Direta pelo Microfone */}
              <button
                type="button"
                onClick={alternarReconhecimentoVoz}
                disabled={processando}
                className={`p-2 rounded-[3px] border transition-colors cursor-pointer ${
                  ouvindoVoz
                    ? 'bg-[#ee6018] text-[#101010] border-[#ee6018]'
                    : 'bg-[#101010] border-[#3d3a39] hover:border-[#fafafa] text-[#eeeeee]'
                }`}
                title={
                  suporteVoz
                    ? ouvindoVoz
                      ? 'Parar de ouvir e enviar'
                      : 'Falar comando de voz'
                    : 'Reconhecimento de fala não suportado'
                }
              >
                {ouvindoVoz ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              {/* Campo de Texto com transcrição ao vivo em tempo real */}
              <input
                ref={inputRef}
                type="text"
                placeholder={ouvindoVoz ? 'Ouvindo sua fala em tempo real...' : 'Comando: "Gastei 50 no almoço", "Paguei a luz"...'}
                value={inputTexto}
                onChange={(e) => setInputTexto(e.target.value)}
                disabled={processando}
                className="flex-1 bg-[#101010] border border-[#3d3a39] hover:border-[#8a8380] focus:border-[#eeeeee] rounded-[3px] px-3 py-1.5 text-xs text-[#eeeeee] placeholder-[#8a8380] focus:outline-none transition disabled:opacity-50 font-mono"
              />

              {/* Botão de Enviar: Light Filled Button (#fafafa) */}
              <button
                type="submit"
                disabled={!inputTexto.trim() || processando}
                className="p-2 px-3 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Enviar comando"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
