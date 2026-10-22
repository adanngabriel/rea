import { NextResponse } from "next/server";

/** Converte ?secao=a&secao=b em ?secoes=a,b e volta para Exportações. */
export function GET(request: Request) {
  const url = new URL(request.url);
  const secoes = url.searchParams.getAll("secao").join(",");
  return NextResponse.redirect(new URL(`/admin/exportacoes?secoes=${encodeURIComponent(secoes)}`, request.url));
}
