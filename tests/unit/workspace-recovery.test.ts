import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ membership: vi.fn(), user: vi.fn(), session: vi.fn(), cookie: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: state.session }));
vi.mock("@/lib/prisma", () => ({ prisma: { membership: { findFirst: state.membership }, user: { findUnique: state.user } } }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: state.cookie }) }));
import { requireOrg } from "@/lib/require-auth";
beforeEach(() => { vi.resetAllMocks(); state.session.mockResolvedValue({ user: { id: "user-a", sessionVersion: 3 } }); state.user.mockResolvedValue({ sessionVersion: 3 }); state.cookie.mockReturnValue({ value: "removed-org" }); });
describe("workspace recovery", () => {
  it("falls back only to a membership belonging to the authenticated account", async () => {
    state.membership.mockResolvedValueOnce(null).mockResolvedValueOnce({ organizationId: "own-org", role: "OWNER" });
    expect(await requireOrg()).toEqual({ userId: "user-a", organizationId: "own-org", role: "OWNER" });
    expect(state.membership.mock.calls[1][0].where).toEqual({ userId: "user-a" });
  });
  it("does not trust a selected workspace after session revocation", async () => {
    state.user.mockResolvedValue({ sessionVersion: 4 });
    expect(await requireOrg()).toBeNull(); expect(state.membership).not.toHaveBeenCalled();
  });
  it("does not invent membership when an account has no workspace", async () => {
    state.membership.mockResolvedValue(null);
    expect(await requireOrg()).toBeNull();
  });
});
