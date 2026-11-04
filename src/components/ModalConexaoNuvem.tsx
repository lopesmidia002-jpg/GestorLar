import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import {
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
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error(
              'Credenciais não encontradas. Como o banco de dados no Supabase foi recém-criado, você precisa criar seu cadastro antes de fazer o primeiro login.'
            );
          }
          if (error.message.includes('Email not confirmed')) {
            throw new Error(
              'E-mail ainda não confirmado. Verifique a caixa de entrada (ou spam) do seu e-mail para ativar sua conta.'
            );
          }
          throw error;
        }
        setMensagemSucesso('Login efetuado com sucesso! Sincronizando dados...');
      } else {
        const { data, error } = await signUpWithEmail(email, senha);
        if (error) {
          if (error.message.includes('User already registered')) {
            throw new Error('Este e-mail já está cadastrado. Alterne para a aba "Já tenho conta" para entrar.');
          }
          if (error.message.includes('Password should be at least')) {
            throw new Error('A senha deve conter no mínimo 6 caracteres.');
          }
          throw error;
        }
        
        if (data?.session) {
          setMensagemSucesso('Conta criada e conectada com sucesso! Sincronizando dados...');
        } else {
          setMensagemSucesso(
            'Conta criada com sucesso! Verifique a caixa de entrada do seu e-mail para confirmar a ativação (se "Confirm email" estiver ativo no Supabase).'
          );
        }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-[#101010] border border-[#3d3a39] rounded-[10px] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal: macOS Terminal Window Chrome */}
        <div className="h-9 bg-[#161413] border-b border-[#3d3a39] px-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#3d3a39]" />
            <span className="ml-2 font-mono text-[11px] uppercase tracking-[-0.24px] text-[#eeeeee]">
              FACTORY // CLOUD_SYNC_SUPABASE.CFG
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-[#8a8380] uppercase">
              STATUS: {statusSync}
            </span>
            <button
              onClick={onFechar}
              className="text-[#8a8380] hover:text-[#eeeeee] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Abas de Navegação: Factory Terminal Pills */}
        <div className="flex border-b border-[#3d3a39] bg-[#161413] text-xs font-mono">
          <button
            onClick={() => setAbaAtiva('status')}
            className={`flex-1 py-2.5 px-4 text-center transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              abaAtiva === 'status'
                ? 'bg-[#101010] text-[#eeeeee] border-b-2 border-[#eeeeee]'
                : 'text-[#8a8380] hover:text-[#eeeeee]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>CONTA & SYNC</span>
          </button>

          <button
            onClick={() => setAbaAtiva('config')}
            className={`flex-1 py-2.5 px-4 text-center transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              abaAtiva === 'config'
                ? 'bg-[#101010] text-[#eeeeee] border-b-2 border-[#eeeeee]'
                : 'text-[#8a8380] hover:text-[#eeeeee]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>CHAVES & API</span>
          </button>

          <button
            onClick={() => setAbaAtiva('sql')}
            className={`flex-1 py-2.5 px-4 text-center transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              abaAtiva === 'sql'
                ? 'bg-[#101010] text-[#eeeeee] border-b-2 border-[#eeeeee]'
                : 'text-[#8a8380] hover:text-[#eeeeee]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>SCRIPT SQL</span>
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
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex flex-col gap-2 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-relaxed">{mensagemErro}</span>
            </div>
            {modoAuth === 'login' && mensagemErro.includes('recém-criado') && (
              <button
                type="button"
                onClick={() => {
                  setModoAuth('cadastro');
                  setMensagemErro('');
                }}
                className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 mt-1 rounded-lg bg-[#00FF87] text-[#07080b] font-bold text-xs hover:bg-[#00FF87]/90 transition cursor-pointer shadow-md"
              >
                <span>Criar cadastro agora com {email || 'este e-mail'}</span>
              </button>
            )}
          </div>
        )}

        {/* Conteúdo das Abas */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* ABA 1: STATUS & CONTA */}
          {abaAtiva === 'status' && (
            <div className="space-y-5">
              {!configurado ? (
                <div className="p-4 rounded-[3px] bg-[#161413] border border-[#3d3a39] flex flex-col gap-3 font-mono">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-[#ee6018] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs uppercase text-[#eeeeee]">SUPABASE NÃO CONECTADO</h4>
                      <p className="text-xs text-[#8a8380] mt-1 leading-relaxed font-sans">
                        Seus dados estão sendo persistidos de forma segura no navegador via <strong>LocalStorage PWA</strong> (0ms latência). Para ativar backup em nuvem, insira suas credenciais na aba <strong>CHAVES & API</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAbaAtiva('config')}
                    className="self-start px-3.5 py-1.5 rounded-[3px] bg-[#fafafa] text-[#101010] text-xs font-mono uppercase"
                  >
                    CONFIGURAR SUPABASE
                  </button>
                </div>
              ) : usuario ? (
                <div className="p-4 rounded-[3px] bg-[#161413] border border-[#3d3a39] flex flex-col gap-4 font-mono">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[3px] bg-[#101010] border border-[#3d3a39] flex items-center justify-center text-[#a0ca92]">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[11px] text-[#8a8380]">CONECTADO COMO:</div>
                        <div className="text-xs text-[#eeeeee]">{usuario.email}</div>
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="px-3 py-1.5 rounded-[3px] bg-[#101010] border border-[#3d3a39] hover:border-[#ee6018] text-xs text-[#8a8380] hover:text-[#ee6018] flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>SAIR</span>
                    </button>
                  </div>

                  <div className="pt-3 border-t border-[#3d3a39] flex items-center justify-between">
                    <div className="text-xs text-[#8a8380] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92]" />
                      <span>SYNC EM TEMPO REAL ATIVO</span>
                    </div>

                    <button
                      onClick={() => {
                        onForcarSincronizacao();
                        setMensagemSucesso('Sincronização manual solicitada com sucesso!');
                      }}
                      className="px-3.5 py-1.5 rounded-[3px] bg-[#fafafa] text-[#101010] text-xs flex items-center gap-1.5 cursor-pointer font-mono"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>SINCRONIZAR AGORA</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAuth} className="p-4 rounded-[3px] bg-[#161413] border border-[#3d3a39] flex flex-col gap-4 font-mono">
                  {/* Abas Alternadoras de Autenticação */}
                  <div className="grid grid-cols-2 p-0.5 bg-[#101010] border border-[#3d3a39] rounded-[3px] text-xs">
                    <button
                      type="button"
                      onClick={() => { setModoAuth('login'); setMensagemErro(''); }}
                      className={`py-1.5 rounded-[2px] transition cursor-pointer text-center ${
                        modoAuth === 'login'
                          ? 'bg-[#fafafa] text-[#101010]'
                          : 'text-[#8a8380] hover:text-[#eeeeee]'
                      }`}
                    >
                      ENTRAR
                    </button>
                    <button
                      type="button"
                      onClick={() => { setModoAuth('cadastro'); setMensagemErro(''); }}
                      className={`py-1.5 rounded-[2px] transition cursor-pointer text-center ${
                        modoAuth === 'cadastro'
                          ? 'bg-[#fafafa] text-[#101010]'
                          : 'text-[#8a8380] hover:text-[#eeeeee]'
                      }`}
                    >
                      CRIAR CONTA
                    </button>
                  </div>

                  <div className="space-y-3 font-sans">
                    <div>
                      <label className="font-mono text-[11px] text-[#8a8380] block mb-1 uppercase">E-mail</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#8a8380] absolute left-3 top-2.5" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seuemail@exemplo.com"
                          className="w-full bg-[#101010] border border-[#3d3a39] focus:border-[#eeeeee] rounded-[3px] pl-9 pr-3 py-1.5 text-xs text-[#eeeeee] focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-mono text-[11px] text-[#8a8380] block mb-1 uppercase">Senha</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#8a8380] absolute left-3 top-2.5" />
                        <input
                          type="password"
                          required
                          value={senha}
                          onChange={(e) => setSenha(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#101010] border border-[#3d3a39] focus:border-[#eeeeee] rounded-[3px] pl-9 pr-3 py-1.5 text-xs text-[#eeeeee] focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={carregando}
                    className="w-full py-2 rounded-[3px] bg-[#fafafa] hover:bg-[#eeeeee] text-[#101010] font-mono text-xs uppercase transition disabled:opacity-50 cursor-pointer"
                  >
                    {carregando ? 'PROCESSANDO...' : modoAuth === 'login' ? 'ENTRAR E SINCRONIZAR' : 'CRIAR CONTA E SINCRONIZAR'}
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
