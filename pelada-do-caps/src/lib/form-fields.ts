import { z } from "zod";

/** Caixa de seleção de formulário HTML: marcada envia "on"; desmarcada não
 * envia o campo. `.optional()` é necessário para o zod 4 aceitar a ausência. */
export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.null()])
  .optional()
  .transform((v) => v === "on" || v === "true");
