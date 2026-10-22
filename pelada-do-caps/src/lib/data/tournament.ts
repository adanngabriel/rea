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

/** Carrega o retrato completo de uma edição (ver domain/snapshot.ts). */
export async function loadSnapshot(client: SupabaseClient, edition: Edition): Promise<Snapshot> {
  const [rounds, teams, registrations, matches, suspensions, awards] = await Promise.all([
    client.from("rounds").select("*").eq("edition_id", edition.id).order("sort_order"),
    client.from("teams").select("*").eq("edition_id", edition.id).order("sort_order").order("name"),
    client.from("registrations").select("*").eq("edition_id", edition.id),
    client.from("matches").select("*").eq("edition_id", edition.id),
    client.from("suspensions").select("*").eq("edition_id", edition.id).order("created_at"),
    client.from("awards").select("*").eq("edition_id", edition.id).order("sort_order"),
  ]);
  const regs = rows<Registration>("inscrições", registrations);
  const matchRows = rows<Match>("partidas", matches);
  const matchIds = matchRows.map((m) => m.id);
  const playerIds = [...new Set(regs.map((r) => r.player_id))];
  const [players, events, lineups] = await Promise.all([
    playerIds.length ? client.from("players").select("*").in("id", playerIds) : { data: [], error: null },
    matchIds.length
      ? client.from("match_events").select("*").in("match_id", matchIds).order("minute", { nullsFirst: false }).order("created_at")
      : { data: [], error: null },
    matchIds.length ? client.from("match_lineups").select("*").in("match_id", matchIds) : { data: [], error: null },
  ]);
  const parsedRules = parseRules(edition.rules);
  return {
    edition,
    rules: parsedRules.rules,
    rulesIssues: parsedRules.ok ? [] : parsedRules.issues,
    rounds: rows<Round>("rodadas", rounds),
    teams: rows<Team>("times", teams),
    players: rows<Player>("jogadores", players),
    registrations: regs,
    matches: matchRows,
    events: rows<MatchEvent>("eventos", events),
    lineups: rows<MatchLineup>("escalações", lineups),
    suspensions: rows<Suspension>("suspensões", suspensions),
    awards: rows<Award>("premiações", awards),
  };
}

/** Retrato público da edição atual (cacheado e deduplicado por requisição). */
export const getPublicSnapshot = cache(async (): Promise<Snapshot | null> => {
  const client = publicClient();
  const edition = await loadEdition(client);
  return edition ? loadSnapshot(client, edition) : null;
});

export const getPublicEditionSnapshot = cache(async (slug: string): Promise<Snapshot | null> => {
  const client = publicClient();
  const edition = await loadEdition(client, slug);
  return edition ? loadSnapshot(client, edition) : null;
});

export const getAllEditions = cache(async (): Promise<Edition[]> => {
  const result = await publicClient().from("editions").select("*").order("starts_on", { ascending: false });
  return rows<Edition>("edições", result);
});
