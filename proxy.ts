import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

// Barreira rápida do painel: sem cookie de sessão, vai para o login.
// A validação de verdade (sessão no banco e dono do casamento) acontece em cada página e ação do servidor.
export function proxy(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE)) {
    const login = request.nextUrl.clone();
    login.pathname = "/entrar";
    login.search = "";
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/painel/:path*"] };
