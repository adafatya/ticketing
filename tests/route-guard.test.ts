import { describe, it, expect } from "vitest";
import { determineRouteAccess } from "@/lib/route-guard";

describe("Route Guard / Middleware Decision", () => {
  it("allows public routes without authentication", () => {
    expect(determineRouteAccess({ pathname: "/login", isAuthenticated: false })).toEqual({
      action: "allow",
    });
    expect(determineRouteAccess({ pathname: "/unauthorized", isAuthenticated: false })).toEqual({
      action: "allow",
    });
    expect(determineRouteAccess({ pathname: "/api/auth/signin", isAuthenticated: false })).toEqual({
      action: "allow",
    });
    expect(determineRouteAccess({ pathname: "/api/discord/interactions", isAuthenticated: false })).toEqual({
      action: "allow",
    });
  });

  it("redirects unauthenticated user on protected route to /login", () => {
    expect(determineRouteAccess({ pathname: "/", isAuthenticated: false })).toEqual({
      action: "redirect",
      destination: "/login",
    });
    expect(determineRouteAccess({ pathname: "/tickets", isAuthenticated: false })).toEqual({
      action: "redirect",
      destination: "/login",
    });
  });

  it("redirects inactive user on protected route to /waiting-activation", () => {
    expect(
      determineRouteAccess({
        pathname: "/tickets",
        isAuthenticated: true,
        role: "inactive",
      }),
    ).toEqual({
      action: "redirect",
      destination: "/waiting-activation",
    });

    expect(
      determineRouteAccess({
        pathname: "/",
        isAuthenticated: true,
        role: "inactive",
      }),
    ).toEqual({
      action: "redirect",
      destination: "/waiting-activation",
    });
  });

  it("allows inactive user to access /waiting-activation", () => {
    expect(
      determineRouteAccess({
        pathname: "/waiting-activation",
        isAuthenticated: true,
        role: "inactive",
      }),
    ).toEqual({
      action: "allow",
    });
  });

  it("redirects active user accessing /waiting-activation back to /", () => {
    expect(
      determineRouteAccess({
        pathname: "/waiting-activation",
        isAuthenticated: true,
        role: "be",
      }),
    ).toEqual({
      action: "redirect",
      destination: "/",
    });
  });

  it("blocks non-admin from accessing /admin routes", () => {
    expect(
      determineRouteAccess({
        pathname: "/admin/users",
        isAuthenticated: true,
        role: "fe",
      }),
    ).toEqual({
      action: "redirect",
      destination: "/",
    });
  });

  it("allows admin to access /admin routes", () => {
    expect(
      determineRouteAccess({
        pathname: "/admin/users",
        isAuthenticated: true,
        role: "admin",
      }),
    ).toEqual({
      action: "allow",
    });
  });

  it("allows active user to access general protected routes", () => {
    expect(
      determineRouteAccess({
        pathname: "/tickets",
        isAuthenticated: true,
        role: "pm",
      }),
    ).toEqual({
      action: "allow",
    });
  });
});
