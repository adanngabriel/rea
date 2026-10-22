import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessão do Supabase nos cookies das rotas do painel e faz um
 * redirecionamento otimista para o login. A autorização de verdade acontece
 * no servidor (layout do painel, Server Actions) e no banco (RLS).
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const isLogin = request.nextUrl.pathname === "/admin/login" || request.nextUrl.pathname === "/admin/primeiro-acesso";
  if (!data.user && !isLogin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
