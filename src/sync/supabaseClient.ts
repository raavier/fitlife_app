// Cliente Supabase opcional (spec seção 0: "sincronização opcional com
// Supabase se SUPABASE_URL estiver configurado").
// Config por env de build (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY) ou em
// runtime via Ajustes → Conta (localStorage, para não exigir rebuild).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const LS_URL = 'fitlife_supabase_url';
const LS_KEY = 'fitlife_supabase_anon_key';

export function supabaseConfig(): { url: string; anonKey: string } | null {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || localStorage.getItem(LS_URL) || '';
  const anonKey =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || localStorage.getItem(LS_KEY) || '';
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function salvarSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(LS_URL, url.trim());
  localStorage.setItem(LS_KEY, anonKey.trim());
}

export function limparSupabaseConfig(): void {
  localStorage.removeItem(LS_URL);
  localStorage.removeItem(LS_KEY);
}

let cliente: SupabaseClient | null | undefined;

/** Retorna o cliente (singleton) ou null se o Supabase não está configurado. */
export function supabase(): SupabaseClient | null {
  if (cliente !== undefined) return cliente;
  const cfg = supabaseConfig();
  cliente = cfg
    ? createClient(cfg.url, cfg.anonKey, {
        auth: {
          // PKCE usa ?code= na URL de retorno — não conflita com o HashRouter
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
  return cliente;
}
