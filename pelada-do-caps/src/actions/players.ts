"use server";

import { z } from "zod";
import { slugify } from "@/lib/format";
import {
  adminAction,
  checkbox,
  idSchema,
  must,
  optionalInt,
  optionalText,
  optionalUuid,
  parseForm,
  requiredText,
  storageUrl,
  uniqueSlug,
  UserError,
  type ActionResult,
} from "./_lib";

const POSITIONS = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"] as const;

const playerSchema = z.object({
  name: requiredText(80, "Informe o nome"),
  nickname: optionalText(40),
  photo_url: storageUrl,
  position: z.union([z.enum(POSITIONS), z.literal("")]).transform((v) => (v === "" ? null : v)),
  is_goalkeeper: checkbox,
  active: checkbox,
  notes: optionalText(2000),
  registered: checkbox,
  team_id: optionalUuid,
  shirt_number: optionalInt(0, 999),
  pot: optionalText(20),
  is_captain: checkbox,
});

export async function savePlayer(id: string | null, form: FormData): Promise<ActionResult> {
  return adminAction(async ({ db, edition, audit }) => {
    const ed = await edition();
    const data = parseForm(playerSchema, form);
    if (id) idSchema.parse(id);
    // O endereço da página é definido no cadastro e não muda depois (links compartilhados continuam válidos).
    const slug = id ? null : await uniqueSlug(db, "players", slugify(data.name), null);
    const playerRow = {
      name: data.name,
      nickname: data.nickname,
      photo_url: data.photo_url,
      position: data.position,
      is_goalkeeper: data.is_goalkeeper || data.position === "GOL",
      active: data.active,
      ...(slug ? { slug } : {}),
    };
    const saved = must(
      id
        ? await db.from("players").update(playerRow).eq("id", id).select("id").single()
        : await db.from("players").insert(playerRow).select("id").single(),
    ) as { id: string };

    if (data.notes) must(await db.from("player_admin_notes").upsert({ player_id: saved.id, notes: data.notes, updated_at: new Date().toISOString() }));
    else must(await db.from("player_admin_notes").delete().eq("player_id", saved.id));

    if (data.registered) {
      if (data.is_captain && !data.team_id) throw new UserError("Para ser capitão, o jogador precisa ter um time.", { is_captain: "Escolha um time" });
      if (data.is_captain) {
        must(await db.from("registrations").update({ is_captain: false }).eq("team_id", data.team_id).neq("player_id", saved.id));
      }
      must(
        await db.from("registrations").upsert(
          {
            edition_id: ed.id,
            player_id: saved.id,
            team_id: data.team_id,
            shirt_number: data.shirt_number,
            pot: data.pot,
            is_captain: data.is_captain,
          },
          { onConflict: "edition_id,player_id" },
        ),
      );
    } else {
      must(await db.from("registrations").delete().eq("edition_id", ed.id).eq("player_id", saved.id));
    }
    await audit({
      action: id ? "player.update" : "player.create",
      entity: "player",
      entityId: saved.id,
      summary: `Jogador ${data.name} ${id ? "atualizado" : "cadastrado"}`,
      after: { ...playerRow, team_id: data.team_id, shirt_number: data.shirt_number },
    });
    return { ok: true, message: "Jogador salvo.", redirectTo: id ? undefined : "/admin/jogadores" };
  });
}

export async function deletePlayer(id: string): Promise<ActionResult> {
  return adminAction(async ({ db, audit }) => {
    idSchema.parse(id);
    const player = must(await db.from("players").select("name").eq("id", id).single()) as { name: string };
    const { count } = await db.from("match_events").select("id", { count: "exact", head: true }).or(`player_id.eq.${id},assist_player_id.eq.${id}`);
    if (count) {
      throw new UserError("Este jogador tem gols, cartões ou prêmios registrados. Marque como inativo em vez de excluir, ou remova os eventos primeiro.");
    }
    must(await db.from("players").delete().eq("id", id));
    await audit({ action: "player.delete", entity: "player", entityId: id, summary: `Jogador ${player.name} excluído`, before: player });
    return { ok: true, message: "Jogador excluído.", redirectTo: "/admin/jogadores" };
  });
}

const bulkSchema = z.object({ lines: requiredText(20000, "Cole ao menos um nome") });
const POSITION_ALIASES: Record<string, (typeof POSITIONS)[number]> = {
  gol: "GOL", goleiro: "GOL", zag: "ZAG", zagueiro: "ZAG", lat: "LAT", lateral: "LAT",
  vol: "VOL", volante: "VOL", mei: "MEI", meia: "MEI", ata: "ATA", atacante: "ATA",
};

/** Cadastro em lote: uma linha por jogador — "Nome; Apelido; Posição; Pote". */
export async function bulkAddPlayers(form: FormData): Promise<ActionResult> {
  return adminAction(async ({ db, edition, audit }) => {
    const ed = await edition();
    const { lines } = parseForm(bulkSchema, form);
    const rows = lines
      .split(/\r?\n/)
      .map((l) => l.split(/[;\t]/).map((c) => c.trim()))
      .filter((cols) => cols[0]);
    if (rows.length > 300) throw new UserError("Envie no máximo 300 jogadores por vez.");
    let created = 0;
    for (const [name, nickname, position, pot] of rows) {
      if (name.length > 80) throw new UserError(`Nome muito longo: ${name.slice(0, 30)}…`);
      const pos = position ? (POSITION_ALIASES[position.toLowerCase()] ?? null) : null;
      const slug = await uniqueSlug(db, "players", slugify(name), null);
      const player = must(
        await db
          .from("players")
          .insert({ name, nickname: nickname || null, slug, position: pos, is_goalkeeper: pos === "GOL" })
          .select("id")
          .single(),
      ) as { id: string };
      must(await db.from("registrations").insert({ edition_id: ed.id, player_id: player.id, pot: pot || null }));
      created++;
    }
    await audit({ action: "player.bulk", entity: "player", summary: `${created} jogadores cadastrados em lote` });
    return { ok: true, message: `${created} jogadores cadastrados.` };
  });
}
