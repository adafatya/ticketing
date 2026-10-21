import { type UserRole } from "@/lib/auth-helpers";

export interface RouteAccessParams {
  pathname: string;
  isAuthenticated: boolean;
  role?: UserRole;
}

export type RouteAccessResult =
  | { action: "allow" }
  | { action: "redirect"; destination: string };

const PUBLIC_PREFIXES = [
  "/login",
  "/unauthorized",
  "/api/auth",
  "/api/discord",
];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function determineRouteAccess({
  pathname,
  isAuthenticated,
  role,
}: RouteAccessParams): RouteAccessResult {
  // Public routes are always accessible
  if (isPublicRoute(pathname)) {
    return { action: "allow" };
  }

  // Unauthenticated users must log in
  if (!isAuthenticated) {
    return { action: "redirect", destination: "/login" };
  }

  // Inactive users: only allowed on /waiting-activation
  if (role === "inactive") {
    if (pathname === "/waiting-activation") {
      return { action: "allow" };
    }
    return { action: "redirect", destination: "/waiting-activation" };
  }

  // Active users: do not let them visit /waiting-activation
  if (pathname === "/waiting-activation") {
    return { action: "redirect", destination: "/" };
  }

  // Admin routes: only admin can access
  if (pathname.startsWith("/admin") && role !== "admin") {
    return { action: "redirect", destination: "/" };
  }

  return { action: "allow" };
}
