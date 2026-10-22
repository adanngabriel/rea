import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { parseRules } from "@/domain/rules";
import type { Snapshot } from "@/domain/snapshot";
import type {
  Award,
  Edition,
  Match,
  MatchEvent,
  MatchLineup,
  Player,
  Registration,
  Round,
  Suspension,
  Team,
} from "@/domain/types";
import { supabaseEnv } from "../supabase/env";
import { publicClient } from "../supabase/public";

export class DataError extends Error {
  constructor(what: string, cause: { message: string }) {
    super(`Falha ao carregar ${what}: ${cause.message}`);
  }
}

function rows<T>(what: string, result: { data: unknown; error: { message: string } | null }): T[] {
  if (result.error) throw new DataError(what, result.error);
  return (result.data ?? []) as T[];
}

export async function loadEdition(client: SupabaseClient, slug?: string): Promise<Edition | null> {
  const query = client.from("editions").select("*");
  const { data, error } = await (slug ? query.eq("slug", slug) : query.eq("is_current", true)).maybeSingle();
  if (error) throw new DataError("edição", error);
  return (data as Edition | null) ?? null;
}

interface SnapshotRow {
  edition: Edition;
  rounds: Round[];
  teams: Team[];
  registrations: Registration[];
  players: Player[];
  matches: Match[];
  events: MatchEvent[];
  lineups: MatchLineup[];
  suspensions: Suspension[];
  awards: Award[];
}

/**
 * Carrega o retrato completo de uma edição (ver domain/snapshot.ts) numa
 * única chamada ao banco (função edition_snapshot): o servidor do site e o
 * banco ficam em regiões diferentes, e cada ida ao banco custa caro.
 * Sem `slug`, usa a edição atual. Retorna null se a edição não existe.
 */
export async function loadSnapshot(client: SupabaseClient, slug?: string): Promise<Snapshot | null> {
  const { data, error } = await client.rpc("edition_snapshot", { p_slug: slug ?? null });
  if (error) throw new DataError("campeonato", error);
  if (!data) return null;
  const row = data as SnapshotRow;
  const parsedRules = parseRules(row.edition.rules);
  return {
    ...row,
    rules: parsedRules.rules,
    rulesIssues: parsedRules.ok ? [] : parsedRules.issues,
  };
}

/** Retrato público da edição atual (cacheado e deduplicado por requisição). */
export const getPublicSnapshot = cache(async (): Promise<Snapshot | null> => {
  if (!supabaseEnv()) return null;
  return loadSnapshot(publicClient());
});

export const getPublicEditionSnapshot = cache(async (slug: string): Promise<Snapshot | null> => {
  if (!supabaseEnv()) return null;
  return loadSnapshot(publicClient(), slug);
});

export const getAllEditions = cache(async (): Promise<Edition[]> => {
  if (!supabaseEnv()) return [];
  const result = await publicClient().from("editions").select("*").order("starts_on", { ascending: false });
  return rows<Edition>("edições", result);
});
