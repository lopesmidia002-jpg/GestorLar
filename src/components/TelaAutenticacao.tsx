import { useState, type FormEvent } from 'react';
import { fazerLogin, criarConta, type UsuarioLogado } from '../services/authService';
import { 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface Props {
  onAutenticado: (usuario: UsuarioLogado) => void;
}

export const TelaAutenticacao = ({ onAutenticado }: Props) => {
  const [modo, setModo] = useState<'login' | 'cadastro'>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [nome, setNome] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    if (modo === 'cadastro' && senha !== confirmarSenha) {
      setErro('As senhas não coincidem. Digite a mesma senha em ambos os campos.');
      return;
    }

    setCarregando(true);

    try {
      if (modo === 'login') {
        const usuario = await fazerLogin(email, senha);
        setSucesso(`Bem-vindo de volta, ${usuario.nome}!`);
        setTimeout(() => {
          onAutenticado(usuario);
        }, 600);
      } else {
        const usuario = await criarConta(email, senha, nome);
        setSucesso(`Conta criada com sucesso! Acessando ambiente de ${usuario.nome}...`);
        setTimeout(() => {
          onAutenticado(usuario);
        }, 700);
      }
    } catch (err: any) {
      setErro(err?.message || 'Falha na autenticação. Verifique os dados e tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101010] text-[#eeeeee] flex items-center justify-center p-4 selection:bg-[#ee6018] selection:text-[#101010]">
      {/* Background Decorativo Estilo Factory War Room */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#3d3a39_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="relative w-full max-w-md bg-[#161413] border border-[#3d3a39] rounded-[10px] overflow-hidden shadow-2xl animate-fadeIn">
        {/* Top Header estilo Janela de Terminal macOS */}
        <div className="h-10 bg-[#1d1a18] border-b border-[#3d3a39] px-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ee6018]" title="Factory Auth System" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
            </div>
            <span className="font-mono text-xs uppercase tracking-wider text-[#8a8380] sm:ml-2">
              FACTORY // AUTH.GATEWAY
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase text-[#a0ca92] bg-[#a0ca92]/10 border border-[#a0ca92]/30 px-2 py-0.5 rounded-[2px]">
            E2EE ACTIVE
          </span>
        </div>

        {/* Branding & Apresentação */}
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-[6px] bg-[#101010] border border-[#3d3a39] flex items-center justify-center text-[#fafafa] mb-1">
              <ShieldCheck className="w-6 h-6 text-[#ee6018]" />
            </div>
            <h1 className="font-mono text-base uppercase tracking-wider text-[#fafafa] font-medium">
              CONTROLADOR FINANCEIRO 50-30-20
            </h1>
            <p className="font-mono text-xs text-[#8a8380] max-w-xs">
              Acesso individual e seguro. Cada usuário gerencia seu próprio orçamento e lançamentos.
            </p>
          </div>

          {/* Seletor de Modo (Entrar vs Criar Conta) */}
          <div className="grid grid-cols-2 p-1 bg-[#101010] border border-[#3d3a39] rounded-[4px] font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                setModo('login');
                setErro(null);
                setSucesso(null);
              }}
              className={`py-2 rounded-[3px] uppercase transition cursor-pointer flex items-center justify-center gap-1.5 ${
                modo === 'login'
                  ? 'bg-[#fafafa] text-[#101010] font-medium'
                  : 'text-[#8a8380] hover:text-[#eeeeee]'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setModo('cadastro');
                setErro(null);
                setSucesso(null);
              }}
              className={`py-2 rounded-[3px] uppercase transition cursor-pointer flex items-center justify-center gap-1.5 ${
                modo === 'cadastro'
                  ? 'bg-[#fafafa] text-[#101010] font-medium'
                  : 'text-[#8a8380] hover:text-[#eeeeee]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Criar Conta</span>
            </button>
          </div>

          {/* Banners de Notificação (Erro / Sucesso) */}
          {erro && (
            <div className="bg-[#ee6018]/10 border border-[#ee6018]/50 p-3 rounded-[3px] text-xs font-mono text-[#ee6018] flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{erro}</span>
            </div>
          )}

          {sucesso && (
            <div className="bg-[#a0ca92]/10 border border-[#a0ca92]/50 p-3 rounded-[3px] text-xs font-mono text-[#a0ca92] flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{sucesso}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-mono text-xs">
            {modo === 'cadastro' && (
              <div>
                <label className="block text-[11px] uppercase text-[#8a8380] mb-1.5">
                  Seu Nome ou Identificador:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8a8380] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Silva"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] pl-9 pr-3 py-2.5 text-xs text-[#eeeeee] focus:border-[#eeeeee] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] uppercase text-[#8a8380] mb-1.5">
                Endereço de E-mail:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8a8380] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] pl-9 pr-3 py-2.5 text-xs text-[#eeeeee] focus:border-[#eeeeee] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase text-[#8a8380] mb-1.5">
                Senha de Acesso:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8a8380] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] pl-9 pr-10 py-2.5 text-xs text-[#eeeeee] focus:border-[#eeeeee] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8380] hover:text-[#eeeeee] cursor-pointer"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {modo === 'cadastro' && (
              <div>
                <label className="block text-[11px] uppercase text-[#8a8380] mb-1.5">
                  Confirmar Senha:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8a8380] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    placeholder="Repita sua senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="w-full bg-[#101010] border border-[#3d3a39] rounded-[3px] pl-9 pr-3 py-2.5 text-xs text-[#eeeeee] focus:border-[#eeeeee] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="mt-2 h-11 bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] font-medium rounded-[3px] uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer transition shadow-md disabled:opacity-50"
            >
              {carregando ? (
                <span>PROCESSANDO...</span>
              ) : modo === 'login' ? (
                <>
                  <span>ACESSAR MEU ORÇAMENTO</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>CRIAR CONTA E ENTRAR</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Rodapé Informativo */}
          <div className="pt-4 border-t border-[#3d3a39] text-center flex flex-col gap-2">
            <span className="font-mono text-[10px] text-[#8a8380] uppercase">
              {modo === 'login' ? 'Não possui uma conta cadastrada?' : 'Já possui uma conta registrada?'}
            </span>
            <button
              type="button"
              onClick={() => {
                setModo(modo === 'login' ? 'cadastro' : 'login');
                setErro(null);
                setSucesso(null);
              }}
              className="font-mono text-xs text-[#eeeeee] hover:underline cursor-pointer"
            >
              {modo === 'login' ? 'Criar nova conta agora →' : 'Fazer login com minha conta existente →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

