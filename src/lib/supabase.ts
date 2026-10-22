import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'gestorlar_supabase_url';
const STORAGE_ANON_KEY = 'gestorlar_supabase_anon_key';

export function getSupabaseConfig(): { url: string; anonKey: string; isFromEnv: boolean } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (
    envUrl &&
    envKey &&
    envUrl.startsWith('http') &&
    !envUrl.includes('seu-projeto') &&
    envKey.trim().length > 15 &&
    !envKey.includes('sua-chave')
  ) {
    return { url: envUrl.trim(), anonKey: envKey.trim(), isFromEnv: true };
  }

  const localUrl = localStorage.getItem(STORAGE_URL_KEY) || '';
  const localKey = localStorage.getItem(STORAGE_ANON_KEY) || '';

  return {
    url: localUrl.trim(),
    anonKey: localKey.trim(),
    isFromEnv: false,
  };
}

let supabaseInstance: SupabaseClient | null = null;
let currentConfigKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey || !url.startsWith('http')) {
    supabaseInstance = null;
    currentConfigKey = '';
    return null;
  }

  const key = `${url}_${anonKey}`;
  if (supabaseInstance && currentConfigKey === key) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    currentConfigKey = key;
    return supabaseInstance;
  } catch (error) {
    console.warn('Falha ao inicializar cliente Supabase:', error);
    supabaseInstance = null;
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}

export function saveCustomSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem(STORAGE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_ANON_KEY, anonKey.trim());
  supabaseInstance = null;
  currentConfigKey = '';
}

export function clearCustomSupabaseConfig() {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_ANON_KEY);
  supabaseInstance = null;
  currentConfigKey = '';
}

// ==========================================
// Funções Auxiliares de Autenticação
// ==========================================

export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data: { user } } = await client.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function signInWithEmail(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não configurado');
  return await client.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não configurado');
  return await client.auth.signUp({ email, password });
}

export async function signOutUser() {
  const client = getSupabaseClient();
  if (!client) return;
  await client.auth.signOut();
}
