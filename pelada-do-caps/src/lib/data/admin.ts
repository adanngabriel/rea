import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Snapshot } from "@/domain/snapshot";
import type { Player } from "@/domain/types";
import { requireAdminPage } from "../auth";
import { serverClient } from "../supabase/server";
import { DataError, loadSnapshot } from "./tournament";

/** Retrato da edição atual para o painel (sempre fresco, sem cache), ou
 * null quando nenhuma edição está marcada como atual. */
export const adminSnapshotOrNull = cache(async (): Promise<Snapshot | null> => {
  await requireAdminPage();
  const db = await serverClient();
  return loadSnapshot(db);
});

export async function adminSnapshot(): Promise<Snapshot> {
  const s = await adminSnapshotOrNull();
  if (!s) redirect("/admin/campeonato");
  return s;
}

/** Todos os jogadores cadastrados (inscritos ou não na edição atual). */
export const adminAllPlayers = cache(async (): Promise<Player[]> => {
  const db = await serverClient();
  const { data, error } = await db.from("players").select("*").order("name");
  if (error) throw new DataError("jogadores", error);
  return data as Player[];
});

export async function adminRows<T>(table: string, order: { column: string; ascending?: boolean }[] = [], limit = 1000): Promise<T[]> {
  await requireAdminPage();
  const db = await serverClient();
  let query = db.from(table).select("*");
  for (const o of order) query = query.order(o.column, { ascending: o.ascending ?? true });
  const { data, error } = await query.limit(limit);
  if (error) throw new DataError(table, error);
  return data as T[];
}

export async function adminRow<T>(table: string, id: string): Promise<T | null> {
  await requireAdminPage();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await serverClient();
  const { data, error } = await db.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw new DataError(table, error);
  return data as T | null;
}
