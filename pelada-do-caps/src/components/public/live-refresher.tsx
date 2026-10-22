"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { browserClient } from "@/lib/supabase/browser";

type Table = "matches" | "match_events" | "registrations" | "teams";

/**
 * Atualiza a página quando o administrador altera placar, súmula ou elencos,
 * sem F5. Usa Supabase Realtime; se o canal cair, faz uma verificação
 * periódica como reserva.
 */
export function LiveRefresher({
  tables,
  pollSeconds = 0,
}: {
  tables: Table[];
  /** Intervalo de reserva (0 = só realtime). */
  pollSeconds?: number;
}) {
  const router = useRouter();
  const key = tables.join(",");
  useEffect(() => {
    const supabase = browserClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Pequena espera agrupa rajadas de alterações e garante que o cache
    // do servidor já foi invalidado pela ação do painel.
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 900);
    };
    const channel = supabase?.channel(`live:${key}:${Math.random().toString(36).slice(2)}`);
    if (channel) {
      for (const table of key.split(",")) {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
      }
      channel.subscribe();
    }
    const poll = pollSeconds > 0 ? setInterval(() => router.refresh(), pollSeconds * 1000) : undefined;
    const onVisible = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      if (poll) clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [key, pollSeconds, router]);
  return null;
}
