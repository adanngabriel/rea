import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseEnv } from "./env";

/** Cliente com a sessão do usuário (painel). Nunca é cacheado. */
export async function serverClient() {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components não podem gravar cookies; o proxy renova a sessão.
        }
      },
    },
  });
}
