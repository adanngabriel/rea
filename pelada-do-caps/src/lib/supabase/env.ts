/** Configuração pública do Supabase. Ausente = site ainda não configurado. */
export function supabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function requireSupabaseEnv(): { url: string; anonKey: string } {
  const env = supabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (veja docs/GUIA.md).",
    );
  }
  return env;
}

export function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!url) return "http://localhost:3000";
  return (url.startsWith("http") ? url : `https://${url}`).replace(/\/$/, "");
}
