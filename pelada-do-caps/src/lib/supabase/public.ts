import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "./env";

/** Tag de cache de todos os dados públicos. Toda escrita no painel a expira. */
export const PUBLIC_DATA_TAG = "public-data";

let client: SupabaseClient | null = null;

/**
 * Cliente somente-leitura do público (chave anon, sem cookies). As respostas
 * ficam no cache do Next.js por até 60 s e são invalidadas imediatamente
 * quando o administrador salva algo.
 */
export function publicClient(): SupabaseClient {
  if (client) return client;
  const { url, anonKey } = requireSupabaseEnv();
  client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, next: { revalidate: 60, tags: [PUBLIC_DATA_TAG] } } as RequestInit),
    },
  });
  return client;
}
