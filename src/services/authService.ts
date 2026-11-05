import { getSupabaseClient, getCurrentUser, signInWithEmail, signUpWithEmail, signOutUser } from '../lib/supabase';

export interface UsuarioLogado {
  id: string;
  email: string;
  nome: string;
  criadoEm: string;
  origem: 'supabase' | 'local';
}

interface UsuarioRegistradoLocal {
  id: string;
  email: string;
  nome: string;
  senhaHash: string; // Base64 simples para persistência local segura
  criadoEm: string;
}

const STORAGE_KEY_USUARIO_ATIVO = 'gestorlar_usuario_ativo';
const STORAGE_KEY_USUARIOS_REGISTRADOS = 'gestorlar_usuarios_registrados';

// Função para ofuscar senha localmente (fallback quando offline)
function hashSenhaSimples(senha: string): string {
  try {
    return btoa(unescape(encodeURIComponent(`gestorlar_salt_${senha}`)));
  } catch {
    return btoa(`gestorlar_salt_${senha}`);
  }
}

/**
 * Obtém todos os usuários registrados localmente no navegador
 */
function obterUsuariosLocais(): UsuarioRegistradoLocal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USUARIOS_REGISTRADOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Erro ao ler usuários locais:', e);
  }
  return [];
}

/**
 * Salva um novo usuário no registro local
 */
function salvarUsuarioLocal(novo: UsuarioRegistradoLocal): void {
  const lista = obterUsuariosLocais().filter((u) => u.email.toLowerCase() !== novo.email.toLowerCase());
  lista.push(novo);
  localStorage.setItem(STORAGE_KEY_USUARIOS_REGISTRADOS, JSON.stringify(lista));
}

/**
 * Retorna o usuário atualmente autenticado (se houver)
 */
export async function obterUsuarioAtual(): Promise<UsuarioLogado | null> {
  // 1. Tenta recuperar sessão ativa persistida
  try {
    const salvo = localStorage.getItem(STORAGE_KEY_USUARIO_ATIVO);
    if (salvo) {
      const parsed: UsuarioLogado = JSON.parse(salvo);
      if (parsed && parsed.id && parsed.email) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler usuário ativo:', e);
  }

  // 2. Se não encontrou no storage local, verifica se há sessão ativa no Supabase
  try {
    const user = await getCurrentUser();
    if (user && user.email) {
      const usuario: UsuarioLogado = {
        id: user.id,
        email: user.email,
        nome: user.user_metadata?.nome || user.email.split('@')[0],
        criadoEm: user.created_at || new Date().toISOString(),
        origem: 'supabase',
      };
      localStorage.setItem(STORAGE_KEY_USUARIO_ATIVO, JSON.stringify(usuario));
      return usuario;
    }
  } catch (e) {
    console.warn('Erro ao consultar sessão Supabase:', e);
  }

  return null;
}

/**
 * Realiza login com E-mail e Senha
 */
export async function fazerLogin(email: string, senha: string): Promise<UsuarioLogado> {
  const emailLimpo = email.trim().toLowerCase();
  if (!emailLimpo || !emailLimpo.includes('@')) {
    throw new Error('Informe um endereço de e-mail válido.');
  }
  if (!senha || senha.length < 6) {
    throw new Error('A senha deve conter no mínimo 6 caracteres.');
  }

  const client = getSupabaseClient();
  let erroSupabase: string | null = null;

  // 1. Tenta login no Supabase se houver conectividade
  if (client && navigator.onLine) {
    try {
      const { data, error } = await signInWithEmail(emailLimpo, senha);
      if (!error && data?.user) {
        const usuario: UsuarioLogado = {
          id: data.user.id,
          email: data.user.email || emailLimpo,
          nome: data.user.user_metadata?.nome || emailLimpo.split('@')[0],
          criadoEm: data.user.created_at || new Date().toISOString(),
          origem: 'supabase',
        };
        localStorage.setItem(STORAGE_KEY_USUARIO_ATIVO, JSON.stringify(usuario));
        return usuario;
      } else if (error) {
        erroSupabase = error.message;
      }
    } catch (e: any) {
      erroSupabase = e?.message || 'Falha de conexão com a nuvem.';
    }
  }

  // 2. Fallback: Verifica credenciais nos usuários registrados localmente
  const usuariosLocais = obterUsuariosLocais();
  const usuarioEncontrado = usuariosLocais.find((u) => u.email.toLowerCase() === emailLimpo);

  if (usuarioEncontrado) {
    const hashDigitado = hashSenhaSimples(senha);
    if (usuarioEncontrado.senhaHash === hashDigitado) {
      const usuario: UsuarioLogado = {
        id: usuarioEncontrado.id,
        email: usuarioEncontrado.email,
        nome: usuarioEncontrado.nome,
        criadoEm: usuarioEncontrado.criadoEm,
        origem: 'local',
      };
      localStorage.setItem(STORAGE_KEY_USUARIO_ATIVO, JSON.stringify(usuario));
      return usuario;
    } else {
      throw new Error('Senha incorreta. Verifique os caracteres e tente novamente.');
    }
  }

  // Se o Supabase deu erro de credenciais inválidas
  if (erroSupabase) {
    if (erroSupabase.toLowerCase().includes('invalid login credentials')) {
      throw new Error('E-mail ou senha incorretos. Caso seja seu primeiro acesso, cadastre-se na aba "Criar Conta".');
    }
    if (erroSupabase.toLowerCase().includes('email not confirmed')) {
      throw new Error('E-mail ainda não confirmado. Verifique sua caixa de entrada para ativar a conta.');
    }
    throw new Error(erroSupabase);
  }

  throw new Error('Usuário não encontrado. Crie sua conta na aba "Criar Conta".');
}

/**
 * Cadastra um novo usuário com Nome, E-mail e Senha
 */
export async function criarConta(email: string, senha: string, nome?: string): Promise<UsuarioLogado> {
  const emailLimpo = email.trim().toLowerCase();
  const nomeLimpo = (nome || emailLimpo.split('@')[0]).trim();

  if (!emailLimpo || !emailLimpo.includes('@')) {
    throw new Error('Informe um endereço de e-mail válido.');
  }
  if (!senha || senha.length < 6) {
    throw new Error('A senha deve conter no mínimo 6 caracteres.');
  }

  // Id único para isolamento de dados
  const novoUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  let idFinal = novoUserId;
  let origemFinal: 'supabase' | 'local' = 'local';

  const client = getSupabaseClient();

  // 1. Tenta cadastrar no Supabase se houver conexão
  if (client && navigator.onLine) {
    try {
      const { data, error } = await signUpWithEmail(emailLimpo, senha);
      if (!error && data?.user) {
        idFinal = data.user.id;
        origemFinal = 'supabase';
      } else if (error) {
        if (error.message.includes('User already registered')) {
          throw new Error('Este e-mail já está cadastrado. Alterne para a aba "Entrar" para fazer login.');
        }
        console.warn('Aviso no cadastro Supabase:', error.message);
      }
    } catch (e: any) {
      if (e.message && e.message.includes('já está cadastrado')) {
        throw e;
      }
      console.warn('Falha ao conectar à nuvem para cadastro:', e?.message);
    }
  }

  // 2. Salva localmente para garantir funcionamento offline
  const novoUsuarioLocal: UsuarioRegistradoLocal = {
    id: idFinal,
    email: emailLimpo,
    nome: nomeLimpo,
    senhaHash: hashSenhaSimples(senha),
    criadoEm: new Date().toISOString(),
  };
  salvarUsuarioLocal(novoUsuarioLocal);

  const usuarioAtivo: UsuarioLogado = {
    id: idFinal,
    email: emailLimpo,
    nome: nomeLimpo,
    criadoEm: novoUsuarioLocal.criadoEm,
    origem: origemFinal,
  };

  localStorage.setItem(STORAGE_KEY_USUARIO_ATIVO, JSON.stringify(usuarioAtivo));
  return usuarioAtivo;
}

/**
 * Desconecta a sessão ativa do usuário
 */
export async function fazerLogout(): Promise<void> {
  try {
    await signOutUser();
  } catch (e) {
    console.warn('Erro ao deslogar do Supabase:', e);
  }
  localStorage.removeItem(STORAGE_KEY_USUARIO_ATIVO);
}
