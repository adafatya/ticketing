import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { determineRouteAccess } from "@/lib/route-guard";
import { getFreshUserRole } from "@/lib/auth-helpers";

export default auth(async (req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const isAuthenticated = !!req.auth?.user;
  const discordId = req.auth?.user?.discordId;

  let role = req.auth?.user?.role;
  if (discordId) {
    const freshRole = await getFreshUserRole(discordId);
    if (freshRole) {
      role = freshRole;
    }
  }

  const decision = determineRouteAccess({
    pathname,
    isAuthenticated,
    role,
  });

  if (decision.action === "redirect") {
    const redirectUrl = new URL(decision.destination, req.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
