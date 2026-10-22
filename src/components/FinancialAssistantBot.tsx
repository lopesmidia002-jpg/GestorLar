import { useState, useEffect, useRef } from 'react';
import type { EstadoFinanceiro, CategoriaOrcamentaria } from '../types/finance';
import { processarComandoAssistente } from '../utils/aiAssistantParser';
import { 
  Bot, 
  Mic, 
  MicOff, 
  Send, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Minimize2
} from 'lucide-react';

interface Props {
  estado: EstadoFinanceiro;
  onAdicionarItem: (item: { titulo: string; valor: number; categoria: CategoriaOrcamentaria; tipoDetalhado: string; vencimento: string; pago: boolean }) => void;
  onAtualizarItem: (id: string, updates: Record<string, any>) => void;
  onRemoverItem: (id: string) => void;
  onAlternarPago: (id: string) => void;
  onAtualizarRenda: (novaRenda: number) => void;
  onAtualizarMetas: (novasMetas: { fixas?: number; superfluos?: number; investimentos?: number }) => void;
}

interface MensagemChat {
  id: string;
  autor: 'usuario' | 'bot';
  texto: string;
  hora: string;
  sucesso?: boolean;
  acao?: string;
}

export const FinancialAssistantBot = ({
  estado,
  onAdicionarItem,
  onAtualizarItem,
  onRemoverItem,
  onAlternarPago,
  onAtualizarRenda,
  onAtualizarMetas,
}: Props) => {
  const [aberto, setAberto] = useState(false);
  const [inputTexto, setInputTexto] = useState('');
  const [ouvindoVoz, setOuvindoVoz] = useState(false);
  const [falaAtiva, setFalaAtiva] = useState(true);
  const [suporteVoz, setSuporteVoz] = useState(false);

  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [mensagens, setMensagens] = useState<MensagemChat[]>([
    {
      id: 'msg_welcome',
      autor: 'bot',
      texto: 'Olá! Sou seu assistente financeiro do GestorLar. Você pode me dar comandos por texto ou voz para lançar despesas, alterar sua renda, mudar metas e conferir seu saldo livre!',
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Inicialização da Web Speech API para comando de voz
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSuporteVoz(true);
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setOuvindoVoz(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputTexto(transcript);
          // Executa automaticamente o comando de voz recebido
          tratarEnvioComando(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Erro no reconhecimento de voz:', event.error);
        setOuvindoVoz(false);
      };

      recognition.onend = () => {
        setOuvindoVoz(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSuporteVoz(false);
    }
  }, [estado]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (aberto) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensagens, aberto]);

  const falarResposta = (texto: string) => {
    if (!falaAtiva || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Falha na síntese de voz:', e);
    }
  };

  const alternarReconhecimentoVoz = () => {
    if (!recognitionRef.current) {
      alert('Seu navegador não possui suporte ao microfone via Web Speech API. Use o teclado para digitar comandos.');
      return;
    }

    if (ouvindoVoz) {
      recognitionRef.current.stop();
      setOuvindoVoz(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Erro ao iniciar reconhecimento:', e);
      }
    }
  };

  const tratarEnvioComando = (textoComando?: string) => {
    const prompt = (textoComando || inputTexto).trim();
    if (!prompt) return;

    const horaAtual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Mensagem do usuário
    const novaMsgUsuario: MensagemChat = {
      id: `user_${Date.now()}`,
      autor: 'usuario',
      texto: prompt,
      hora: horaAtual,
    };

    // Processamento do comando através do motor inteligente de NLP
    const resultado = processarComandoAssistente(prompt, estado, {
      adicionarItem: onAdicionarItem,
      atualizarItem: onAtualizarItem,
      removerItem: onRemoverItem,
      alternarPago: onAlternarPago,
      atualizarRenda: onAtualizarRenda,
      atualizarMetas: onAtualizarMetas,
    });

    const novaMsgBot: MensagemChat = {
      id: `bot_${Date.now()}`,
      autor: 'bot',
      texto: resultado.mensagemResposta,
      hora: horaAtual,
      sucesso: resultado.sucesso,
      acao: resultado.acaoExecutada,
    };

    setMensagens((prev) => [...prev, novaMsgUsuario, novaMsgBot]);
    setInputTexto('');

    if (resultado.sucesso) {
      falarResposta(resultado.mensagemResposta);
    }
  };

  const comandosSugeridos = [
    'Gastei 85 reais em Restaurante',
    'Mudar aluguel para 3400',
    'Minha renda é 14000',
    'Pagar aluguel',
    'Qual é o meu saldo?',
  ];

  return (
    <>
      {/* Botão Flutuante de Ativação do Assistente no Canto Inferior Direito */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setAberto(!aberto)}
          className="relative group p-3.5 rounded-2xl bg-[#0a0c12] border border-[#00FF87]/50 hover:border-[#00FF87] text-white shadow-2xl shadow-[#00FF87]/20 transition-all duration-300 hover:scale-105 flex items-center gap-3 cursor-pointer"
          title="Assistente Financeiro com Comando de Voz & Chat"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-[#00FF87]/15 border border-[#00FF87]/40 flex items-center justify-center text-[#00FF87]">
              <Bot className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#00FF87] ring-2 ring-[#0a0c12] animate-ping" />
          </div>

          <div className="text-left hidden sm:block pr-1">
            <span className="text-xs font-bold text-white block leading-tight">
              Assistente IA
            </span>
            <span className="text-[10px] text-[#00FF87] font-mono">
              {ouvindoVoz ? '● Ouvindo voz...' : 'Comando de Voz & Chat'}
            </span>
          </div>
        </button>
      </div>

      {/* Janela Modal do Assistente Financeiro */}
      {aberto && (
        <div className="fixed inset-x-4 bottom-24 sm:right-6 sm:left-auto sm:w-[440px] max-h-[80vh] h-[580px] z-50 rounded-3xl bg-[#090b10] border border-[#1e2333] shadow-2xl flex flex-col overflow-hidden animate-fadeIn backdrop-blur-xl">
          {/* Header do Chatbot */}
          <div className="p-4 border-b border-[#161924] bg-[#0c0e14] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00FF87]/20 to-[#00D2FF]/20 border border-[#00FF87]/40 flex items-center justify-center text-[#00FF87]">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white leading-none">
                    GestorLar Bot
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/30">
                    Voz & NLP
                  </span>
                </div>
                <span className="text-[11px] text-[#9CA3AF]">
                  Edição automática de orçamento por comandos
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setFalaAtiva(!falaAtiva)}
                className={`p-2 rounded-lg text-xs transition ${
                  falaAtiva ? 'text-[#00FF87] hover:bg-[#00FF87]/10' : 'text-[#4B5563] hover:text-[#9CA3AF]'
                }`}
                title={falaAtiva ? 'Voz de resposta ativada' : 'Voz de resposta silenciada'}
              >
                {falaAtiva ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setAberto(false)}
                className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#161924] transition"
                title="Fechar"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Feed de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {mensagens.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.autor === 'usuario' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed shadow-sm ${
                    msg.autor === 'usuario'
                      ? 'bg-[#181d2a] text-white border border-[#2d354d] rounded-tr-none'
                      : 'bg-[#0f121a] text-[#E5E7EB] border border-[#1a1e2b] rounded-tl-none'
                  }`}
                >
                  {msg.autor === 'bot' && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#00FF87] mb-1">
                      <Sparkles className="w-3 h-3" />
                      <span>GestorLar IA</span>
                      {msg.sucesso && (
                        <span className="ml-auto inline-flex items-center gap-1 text-[9px] text-[#00FF87] bg-[#00FF87]/10 px-1.5 py-0.2 rounded">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Executado
                        </span>
                      )}
                    </div>
                  )}

                  <p className="whitespace-pre-line">{msg.texto}</p>

                  <span className="text-[9px] font-mono text-[#4B5563] block text-right mt-1.5">
                    {msg.hora}
                  </span>
                </div>
              </div>
            ))}

            {/* Onda Animada quando estiver ouvindo a voz */}
            {ouvindoVoz && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#00FF87]/10 border border-[#00FF87]/30 text-white animate-pulse">
                <div className="w-3 h-3 rounded-full bg-[#00FF87] animate-ping" />
                <span className="text-xs font-mono text-[#00FF87]">
                  Ouvindo sua voz... Fale seu comando agora!
                </span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chips de Comandos Sugeridos */}
          <div className="px-4 py-2 border-t border-[#161924] bg-[#0c0e14] overflow-x-auto whitespace-nowrap flex gap-1.5">
            {comandosSugeridos.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => tratarEnvioComando(cmd)}
                className="px-2.5 py-1 rounded-full text-[11px] font-mono text-[#9CA3AF] hover:text-white bg-[#141722] hover:bg-[#1a1e2d] border border-[#222738] transition cursor-pointer"
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* Input Bar com Microfone e Envio */}
          <div className="p-3 border-t border-[#161924] bg-[#0a0c12]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                tratarEnvioComando();
              }}
              className="flex items-center gap-2"
            >
              {/* Botão de Voz */}
              <button
                type="button"
                onClick={alternarReconhecimentoVoz}
                className={`p-2.5 rounded-xl border transition-all duration-300 relative ${
                  ouvindoVoz
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                    : 'bg-[#141724] border-[#222738] hover:border-[#00FF87]/50 text-[#00FF87]'
                }`}
                title={suporteVoz ? (ouvindoVoz ? 'Parar gravação' : 'Falar comando de voz') : 'Reconhecimento de voz não suportado neste navegador'}
              >
                {ouvindoVoz ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Campo de Texto */}
              <input
                type="text"
                placeholder={ouvindoVoz ? 'Ouvindo...' : 'Fale ou digite: "Gastei 80 no mercado"...'}
                value={inputTexto}
                onChange={(e) => setInputTexto(e.target.value)}
                className="flex-1 bg-[#121520] border border-[#1e2333] hover:border-[#2d354d] focus:border-[#00FF87] rounded-xl px-3 py-2 text-xs text-white placeholder-[#4B5563] focus:outline-none transition"
              />

              {/* Botão de Enviar */}
              <button
                type="submit"
                disabled={!inputTexto.trim()}
                className="p-2.5 rounded-xl bg-[#00FF87] hover:bg-[#00FF87]/90 text-[#07080b] disabled:opacity-30 disabled:cursor-not-allowed transition font-semibold"
                title="Enviar comando"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
