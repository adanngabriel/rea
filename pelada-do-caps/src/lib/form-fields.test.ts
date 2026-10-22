import { describe, expect, it } from "vitest";
import { z } from "zod";
import { checkbox } from "./form-fields";

describe("checkbox de formulário", () => {
  const schema = z.object({ goleiro: checkbox, ativo: checkbox });
  it("campo ausente (desmarcado) vale false", () => {
    expect(schema.parse({ ativo: "on" })).toEqual({ goleiro: false, ativo: true });
  });
  it("aceita formulário sem nenhuma caixa marcada", () => {
    expect(schema.parse({})).toEqual({ goleiro: false, ativo: false });
  });
});
