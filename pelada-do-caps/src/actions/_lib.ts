import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import type { Edition } from "@/domain/types";
import { getAdmin, type AdminSession } from "@/lib/auth";
import { loadEdition } from "@/lib/data/tournament";
import { PUBLIC_DATA_TAG } from "@/lib/supabase/public";
import { serverClient } from "@/lib/supabase/server";

export type ActionResult =
  | { ok: true; message?: string; redirectTo?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export interface ActionContext {
  db: SupabaseClient;
  admin: AdminSession;
  edition: () => Promise<Edition>;
  audit: (entry: AuditEntry) => Promise<void>;
}

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | null;
  summary: string;
  before?: unknown;
  after?: unknown;
  editionId?: string | null;
}

/** Erro esperado, com mensagem pronta para o administrador. */
export class UserError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

const PG_MESSAGES: Record<string, string> = {
  "23505": "Já existe um registro com esses dados (nome, número ou endereço repetido).",
  "23503": "Este registro está ligado a outros dados e não pode ser alterado assim.",
  "23514": "Os dados não respeitam as regras do torneio.",
  "42501": "Sem permissão para esta operação.",
};

/** Converte o erro do banco em mensagem clara, preservando o detalhe. */
export function dbError(error: { code?: string; message: string; details?: string | null }): UserError {
  const base = (error.code && PG_MESSAGES[error.code]) ?? "Não foi possível salvar.";
  const detail = error.code === "23514" || error.code === "P0001" ? ` ${error.message}` : "";
  return new UserError(`${base}${detail}`.trim());
}

export function must<T>(result: { data: T; error: { code?: string; message: string } | null }): T {
  if (result.error) throw dbError(result.error);
  return result.data;
}

/**
 * Executa uma ação do painel: confere no servidor se o usuário é
 * administrador, roda a operação com a sessão dele (o RLS do banco é a
 * segunda barreira), converte erros e invalida o cache público.
 */
export async function adminAction(run: (ctx: ActionContext) => Promise<ActionResult | void>): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "Sua sessão expirou. Entre novamente." };
  const db = await serverClient();
  let edition: Edition | null = null;
  const ctx: ActionContext = {
    db,
    admin,
    edition: async () => {
      edition ??= await loadEdition(db);
      if (!edition) throw new UserError("Nenhuma edição marcada como atual. Configure em Campeonato → Edições.");
      return edition;
    },
    audit: async (entry) => {
      const editionId = entry.editionId === undefined ? (edition?.id ?? null) : entry.editionId;
      const { error } = await db.from("audit_logs").insert({
        edition_id: editionId,
        actor_id: admin.userId,
        actor_email: admin.email,
        action: entry.action,
        entity: entry.entity,
        entity_id: entry.entityId ?? null,
        summary: entry.summary,
        before: entry.before ?? null,
        after: entry.after ?? null,
      });
      if (error) console.error("Falha ao registrar auditoria", error);
    },
  };
  try {
    const result = (await run(ctx)) ?? { ok: true as const };
    if (result.ok) {
      updateTag(PUBLIC_DATA_TAG);
      revalidatePath("/admin", "layout");
    }
    return result;
  } catch (error) {
    if (error instanceof UserError) return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
    if (error instanceof z.ZodError) return { ok: false, ...zodToFields(error) };
    console.error(error);
    return { ok: false, error: "Erro inesperado. Tente novamente." };
  }
}

function zodToFields(error: z.ZodError): { error: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= issue.message;
  }
  return { error: "Confira os campos destacados.", fieldErrors };
}

// ---------------------------------------------------------------------
// Leitura de formulários
// ---------------------------------------------------------------------

const trimmed = z.string().transform((v) => v.trim());

/** Texto opcional: string vazia vira null. */
export const optionalText = (max = 500) =>
  trimmed.pipe(z.string().max(max, `Máximo de ${max} caracteres`)).transform((v) => (v === "" ? null : v));

export const requiredText = (max = 200, label = "Campo obrigatório") =>
  trimmed.pipe(z.string().min(1, label).max(max, `Máximo de ${max} caracteres`));

export const optionalInt = (min: number, max: number) =>
  trimmed.transform((v, ctx) => {
    if (v === "") return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) {
      ctx.addIssue({ code: "custom", message: `Informe um número entre ${min} e ${max}` });
      return z.NEVER;
    }
    return n;
  });

export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.undefined(), z.null()])
  .transform((v) => v === "on" || v === "true");

export const optionalUuid = trimmed.transform((v, ctx) => {
  if (v === "") return null;
  if (!z.uuid().safeParse(v).success) {
    ctx.addIssue({ code: "custom", message: "Seleção inválida" });
    return z.NEVER;
  }
  return v;
});

export const optionalDate = trimmed.transform((v, ctx) => {
  if (v === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    ctx.addIssue({ code: "custom", message: "Data inválida" });
    return z.NEVER;
  }
  return v;
});

export const optionalUrl = trimmed.transform((v, ctx) => {
  if (v === "") return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    return u.toString();
  } catch {
    ctx.addIssue({ code: "custom", message: "Informe um link completo, começando com https://" });
    return z.NEVER;
  }
});

/** Arquivo enviado ao Storage deste projeto (nunca um link qualquer). */
export const storageUrl = trimmed.transform((v, ctx) => {
  if (v === "") return null;
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`;
  if (!v.startsWith(base)) {
    ctx.addIssue({ code: "custom", message: "Envie o arquivo pelo botão de upload" });
    return z.NEVER;
  }
  return v;
});

export const color = trimmed.pipe(z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"));

/** Lê o FormData como objeto simples (último valor de cada campo). */
export function formObject(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

export function parseForm<S extends z.ZodType>(schema: S, form: FormData): z.output<S> {
  return schema.parse(formObject(form));
}

export const idSchema = z.uuid({ message: "Registro inválido" });

/** Gera um endereço único na tabela (joao-silva, joao-silva-2...). */
export async function uniqueSlug(
  db: SupabaseClient,
  table: string,
  base: string,
  excludeId: string | null,
  scope?: { column: string; value: string },
): Promise<string> {
  const root = base || "item";
  let query = db.from(table).select("id, slug").like("slug", `${root}%`);
  if (scope) query = query.eq(scope.column, scope.value);
  const { data } = await query;
  const taken = new Set((data ?? []).filter((r: { id: string }) => r.id !== excludeId).map((r: { slug: string }) => r.slug));
  if (!taken.has(root)) return root;
  for (let i = 2; ; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`;
}
