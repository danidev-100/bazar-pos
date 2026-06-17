import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Store — dashboard default page", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("1.1 — default page should be dashboard", async () => {
    // Use dynamic import to get a fresh store instance with the current default
    const { useAppStore } = await import("@/store");
    expect(useAppStore.getState().page).toBe("dashboard");
  });

  it("1.1 — setPage works with dashboard target", async () => {
    const { useAppStore } = await import("@/store");
    useAppStore.getState().setPage("dashboard");
    expect(useAppStore.getState().page).toBe("dashboard");
  });
});
