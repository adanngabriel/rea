import "server-only";
import { notFound } from "next/navigation";
import type { Snapshot } from "@/domain/snapshot";
import { getPublicSnapshot } from "./tournament";

/** Para páginas públicas: o layout já trata a ausência de edição. */
export async function currentSnapshot(): Promise<Snapshot> {
  const s = await getPublicSnapshot();
  if (!s) notFound();
  return s;
}
