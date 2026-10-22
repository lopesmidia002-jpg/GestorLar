import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  X,
  ExternalLink,
  Shield,
  KeyRound,
  Mail,
  Lock,
  LogOut,
  AlertCircle,
  Database
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveCustomSupabaseConfig,
  clearCustomSupabaseConfig,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  isSupabaseConfigured
} from '../lib/supabase';
import type { StatusSyncNuvem } from '../hooks/useFinanceStorage';

interface ModalConexaoNuvemProps {
  aberto: boolean;
  onFechar: () => void;
  statusSync: StatusSyncNuvem;
  usuario: User | null;
  onForcarSincronizacao: () => void;
}

const SQL_SCHEMA_SNIPPET = `-- GESTORLAR: TABELAS E RLS NO SUPABASE
CREATE TABLE IF NOT EXISTS public.perfis_orcamento (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  renda_familiar NUMERIC(12, 2) NOT NULL DEFAULT 6000.00,
  meta_fixas NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
  meta_superfluos NUMERIC(5, 2) NOT NULL DEFAULT 30.00,
  meta_investimentos NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.itens_lancamento (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('fixas', 'superfluos', 'investimentos')),
  tipo_detalhado TEXT NOT NULL DEFAULT 'Geral',
  valor NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  vencimento TEXT NOT NULL DEFAULT 'Dia 10',
  pago BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.perfis_orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_lancamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso proprio perfil" ON public.perfis_orcamento FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Acesso proprios itens" ON public.itens_lancamento FOR ALL USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.perfis_orcamento, public.itens_lancamento;`;

export function ModalConexaoNuvem({
  aberto,
  onFechar,
  statusSync,
  usuario,
  onForcarSincronizacao,
}: ModalConexaoNuvemProps) {
  const [config, setConfig] = useState(getSupabaseConfig());
  const [urlInput, setUrlInput] = useState('');
  const [anonKeyInput, setAnonKeyInput] = useState('');

  const [abaAtiva, setAbaAtiva] = useState<'status' | 'sql' | 'config'>('status');
  const [modoAuth, setModoAuth] = useState<'login' | 'cadastro'>('login');

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [mensagemErro, setMensagemErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (aberto) {
      const cfg = getSupabaseConfig();
      setConfig(cfg);
      setUrlInput(cfg.url);
      setAnonKeyInput(cfg.anonKey);
      setMensagemErro('');
      setMensagemSucesso('');
    }
  }, [aberto]);

  if (!aberto) return null;

  const handleSalvarConfig = () => {
    if (!urlInput.trim() || !anonKeyInput.trim()) {
      setMensagemErro('Preencha a URL e a Chave Anon do projeto Supabase.');
      return;
    }
    if (!urlInput.startsWith('http')) {
      setMensagemErro('A URL do Supabase deve iniciar com https://');
      return;
    }

    saveCustomSupabaseConfig(urlInput.trim(), anonKeyInput.trim());
    setConfig(getSupabaseConfig());
    setMensagemSucesso('Configurações salvas com sucesso!');
    setMensagemErro('');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleLimparConfig = () => {
    if (window.confirm('Deseja remover as configurações personalizadas do Supabase?')) {
      clearCustomSupabaseConfig();
      setConfig(getSupabaseConfig());
      setUrlInput('');
      setAnonKeyInput('');
      window.location.reload();
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro('');
    setMensagemSucesso('');
    setCarregando(true);

    try {
      if (modoAuth === 'login') {
        const { error } = await signInWithEmail(email, senha);
        if (error) throw error;
        setMensagemSucesso('Login efetuado com sucesso! Sincronizando dados...');
      } else {
        const { error } = await signUpWithEmail(email, senha);
        if (error) throw error;
        setMensagemSucesso('Conta criada com sucesso! Verifique seu e-mail se a confirmação estiver ativa.');
      }
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro ao autenticar no Supabase.');
    } finally {
      setCarregando(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      setMensagemSucesso('Desconectado com sucesso.');
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro ao sair.');
    }
  };

  const handleCopiarSQL = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_SNIPPET);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const configurado = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-[#0a0c12] border border-[#1e2333] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between p-5 border-b border-[#161924] bg-[#0c0e16]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00FF87]/10 border border-[#00FF87]/30 flex items-center justify-center text-[#00FF87]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Persistência & Nuvem Supabase
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  statusSync === 'conectado'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-[#00FF87]'
                    : statusSync === 'sincronizando'
                    ? 'bg-blue-950/60 border-blue-500/40 text-blue-400 animate-pulse'
                    : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
                }`}>
                  {statusSync === 'conectado' && '🟢 Nuvem Ativa'}
                  {statusSync === 'sincronizando' && '🔄 Sincronizando'}
                  {statusSync === 'local_only' && '💻 Somente Local'}
                  {statusSync === 'offline' && '🟡 Offline'}
                  {statusSync === 'erro' && '🔴 Erro'}
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                Multi-dispositivo com funcionamento 100% offline-first e sincronização em tempo real
              </p>
            </div>
          </div>

          <button
            onClick={onFechar}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#161924] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-[#161924] bg-[#08090d] text-xs font-medium">
          <button
            onClick={() => setAbaAtiva('status')}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
              abaAtiva === 'status'
                ? 'border-[#00FF87] text-[#00FF87] bg-[#00FF87]/5 font-semibold'
                : 'border-transparent text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Conta & Sincronização</span>
          </button>

          <button
            onClick={() => setAbaAtiva('config')}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
              abaAtiva === 'config'
                ? 'border-[#00FF87] text-[#00FF87] bg-[#00FF87]/5 font-semibold'
                : 'border-transparent text-[#9CA3AF] hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Chaves & Conexão</span>
          </button>

          <button
            onClick={() => setAbaAtiva('sql')}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
              abaAtiva === 'sql'
                ? 'border-[#00FF87] text-[#00FF87] bg-[#00FF87]/5 font-semibold'
                : 'border-transparent text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Script SQL (1-Clique)</span>
          </button>
        </div>

        {/* Mensagens de Feedback */}
        {mensagemSucesso && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}

        {mensagemErro && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{mensagemErro}</span>
          </div>
        )}

        {/* Conteúdo das Abas */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* ABA 1: STATUS & CONTA */}
          {abaAtiva === 'status' && (
            <div className="space-y-5">
              {!configurado ? (
                <div className="p-4 rounded-xl bg-[#0e111a] border border-[#1e2333] flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">Supabase ainda não configurado</h4>
                      <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
                        Seus dados estão sendo persistidos de forma segura no navegador via <strong>LocalStorage/Cache PWA</strong>. Para ativar backup em nuvem e sincronizar com seu celular, insira suas credenciais na aba <strong>Chaves & Conexão</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAbaAtiva('config')}
                    className="self-start px-3 py-1.5 rounded-lg bg-[#00FF87] text-[#07080b] font-semibold text-xs hover:bg-[#00FF87]/90 transition"
                  >
                    Configurar Supabase Agora
                  </button>
                </div>
              ) : usuario ? (
                <div className="p-4 rounded-xl bg-[#0e111a] border border-[#1e2333] flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#00FF87]/15 border border-[#00FF87]/30 flex items-center justify-center text-[#00FF87]">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-[#9CA3AF]">Conectado como:</div>
                        <div className="text-sm font-semibold text-white font-mono">{usuario.email}</div>
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161924] hover:bg-rose-950/40 hover:text-rose-400 border border-[#262c3e] text-xs text-[#9CA3AF] transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair da Conta</span>
                    </button>
                  </div>

                  <div className="pt-3 border-t border-[#1a1e2b] flex items-center justify-between">
                    <div className="text-xs text-[#9CA3AF] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00FF87] animate-pulse" />
                      <span>Sincronização bidirecional em tempo real ativa</span>
                    </div>

                    <button
                      onClick={() => {
                        onForcarSincronizacao();
                        setMensagemSucesso('Sincronização manual solicitada com sucesso!');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00FF87]/15 hover:bg-[#00FF87]/25 border border-[#00FF87]/40 text-[#00FF87] text-xs font-medium transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sincronizar Agora</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAuth} className="p-4 rounded-xl bg-[#0e111a] border border-[#1e2333] flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1a1e2b]">
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">
                      {modoAuth === 'login' ? 'Acessar com sua conta' : 'Criar nova conta de família'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setModoAuth(modoAuth === 'login' ? 'cadastro' : 'login')}
                      className="text-xs text-[#00FF87] hover:underline cursor-pointer"
                    >
                      {modoAuth === 'login' ? 'Não tem conta? Cadastrar' : 'Já tem conta? Entrar'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-[#9CA3AF] block mb-1">E-mail</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seuemail@exemplo.com"
                          className="w-full bg-[#07080b] border border-[#1e2333] focus:border-[#00FF87] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-[#9CA3AF] block mb-1">Senha</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
                        <input
                          type="password"
                          required
                          value={senha}
                          onChange={(e) => setSenha(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#07080b] border border-[#1e2333] focus:border-[#00FF87] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={carregando}
                    className="w-full py-2.5 rounded-lg bg-[#00FF87] hover:bg-[#00FF87]/90 text-[#07080b] font-bold text-xs shadow-lg shadow-[#00FF87]/20 transition disabled:opacity-50 cursor-pointer"
                  >
                    {carregando ? 'Processando...' : modoAuth === 'login' ? 'Entrar e Sincronizar' : 'Criar Conta e Sincronizar'}
                  </button>
                </form>
              )}

              {/* Informações da Arquitetura Híbrida */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#090b10] border border-[#161924]">
                  <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00FF87]" />
                    <span>Latência Zero (Offline-First)</span>
                  </div>
                  <p className="text-[#9CA3AF] text-[11px] leading-relaxed">
                    Toda edição de conta, valor ou categoria reflete em 0ms no dispositivo local. Você nunca fica travado esperando a rede.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#090b10] border border-[#161924]">
                  <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00D2FF]" />
                    <span>Multi-Dispositivo</span>
                  </div>
                  <p className="text-[#9CA3AF] text-[11px] leading-relaxed">
                    Acesse de qualquer smartphone, tablet ou PC. As atualizações sincronizam instantaneamente entre os aparelhos conectados.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: CHAVES & CONEXÃO */}
          {abaAtiva === 'config' && (
            <div className="space-y-4">
              <div className="text-xs text-[#9CA3AF] leading-relaxed">
                Você pode conectar o GestorLar a qualquer projeto Supabase gratuito. Caso tenha configurado no arquivo <code>.env</code>, ele terá prioridade automática.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#9CA3AF] block mb-1">Supabase Project URL</label>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full bg-[#07080b] border border-[#1e2333] focus:border-[#00FF87] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#9CA3AF] block mb-1">Supabase Anon Key (Public)</label>
                  <input
                    type="password"
                    value={anonKeyInput}
                    onChange={(e) => setAnonKeyInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-[#07080b] border border-[#1e2333] focus:border-[#00FF87] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#00D2FF] hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Obter credenciais no painel do Supabase</span>
                </a>

                <div className="flex items-center gap-2">
                  {config.url && !config.isFromEnv && (
                    <button
                      type="button"
                      onClick={handleLimparConfig}
                      className="px-3 py-1.5 rounded-lg bg-[#161924] hover:bg-rose-950/40 hover:text-rose-400 text-xs text-[#9CA3AF] transition"
                    >
                      Remover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSalvarConfig}
                    className="px-4 py-2 rounded-lg bg-[#00FF87] hover:bg-[#00FF87]/90 text-[#07080b] font-bold text-xs transition cursor-pointer"
                  >
                    Salvar e Conectar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: SCRIPT SQL */}
          {abaAtiva === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#9CA3AF]">
                  Cole este script no <strong>SQL Editor</strong> do painel Supabase para criar as tabelas e políticas de segurança:
                </span>
                <button
                  onClick={handleCopiarSQL}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#00FF87]/15 hover:bg-[#00FF87]/25 text-[#00FF87] text-xs font-mono transition cursor-pointer"
                >
                  {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiado ? 'Copiado!' : 'Copiar SQL'}</span>
                </button>
              </div>

              <pre className="p-3 bg-[#06070a] border border-[#1e2333] rounded-xl text-[11px] font-mono text-[#9CA3AF] overflow-x-auto max-h-60 leading-relaxed selection:bg-[#00FF87] selection:text-black">
                {SQL_SCHEMA_SNIPPET}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
