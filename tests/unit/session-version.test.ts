import { describe, expect, it, vi } from "vitest";
import type { NextAuthConfig } from "next-auth";
const state = vi.hoisted(() => ({ configuration: null as NextAuthConfig | null, lookup: vi.fn() }));
vi.mock("next-auth", () => ({ default: (configuration: NextAuthConfig) => { state.configuration = configuration; return {}; } }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: state.lookup } } }));
vi.mock("@/lib/credentials", () => ({ authorizeCredentials: vi.fn() }));
import "@/lib/auth";

describe("sign-in and password-reset race", () => {
  it("binds a new JWT to the version that actually authenticated", async () => {
    state.lookup.mockResolvedValue({ sessionVersion: 6 });
    const callback = state.configuration!.callbacks!.jwt!;
    const input = { token: {}, user: { id: "user", sessionVersion: 5 }, account: null, trigger: "signIn" };
    const token = await callback(input as Parameters<typeof callback>[0]);
    expect(token).toMatchObject({ id: "user", sessionVersion: 5 });
    expect(state.lookup).not.toHaveBeenCalled();
  });
});
