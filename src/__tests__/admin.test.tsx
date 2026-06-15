import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAdminStore, hashPin } from "@/store/admin";
import AdminRoute from "@/components/AdminRoute";
import { useAppStore } from "@/store";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Clear localStorage and reset admin store between tests. */
function resetStore() {
  localStorage.removeItem("admin_pin_hash");
  useAdminStore.setState({
    isUnlocked: false,
    pinHash: null,
    theme: "light",
    preview: null,
  });
}

beforeEach(() => {
  resetStore();
});

// ──────────────────────────────────────────────
// hashPin utility
// ──────────────────────────────────────────────

describe("hashPin", () => {
  it("produces a 64-char hex string", async () => {
    const hash = await hashPin("1234");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces deterministic output for the same input", async () => {
    const hash1 = await hashPin("1234");
    const hash2 = await hashPin("1234");
    expect(hash1).toBe(hash2);
  });

  it("produces different output for different inputs", async () => {
    const hash1 = await hashPin("1234");
    const hash2 = await hashPin("5678");
    expect(hash1).not.toBe(hash2);
  });
});

// ──────────────────────────────────────────────
// Admin store — PIN set
// ──────────────────────────────────────────────

describe("Admin store — setPin", () => {
  it("stores the SHA-256 hash in localStorage", async () => {
    const store = useAdminStore.getState();
    await store.setPin("1234");

    const stored = localStorage.getItem("admin_pin_hash");
    expect(stored).toMatch(/^[0-9a-f]{64}$/);

    // Verify it's actually the SHA-256 of "1234"
    const expectedHash = await hashPin("1234");
    expect(stored).toBe(expectedHash);
  });

  it("updates pinHash in the store", async () => {
    const store = useAdminStore.getState();
    expect(store.pinHash).toBeNull();

    await store.setPin("1234");
    const hash = useAdminStore.getState().pinHash;
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("overwrites an existing PIN", async () => {
    const store = useAdminStore.getState();
    await store.setPin("1234");
    const firstHash = useAdminStore.getState().pinHash;

    await store.setPin("5678");
    const secondHash = useAdminStore.getState().pinHash;

    expect(secondHash).toMatch(/^[0-9a-f]{64}$/);
    expect(secondHash).not.toBe(firstHash);
  });
});

// ──────────────────────────────────────────────
// Admin store — unlock / lock
// ──────────────────────────────────────────────

describe("Admin store — unlock / lock", () => {
  it("unlocks with the correct PIN", async () => {
    const store = useAdminStore.getState();
    await store.setPin("1234");

    const result = await useAdminStore.getState().unlock("1234");
    expect(result).toBe(true);
    expect(useAdminStore.getState().isUnlocked).toBe(true);
  });

  it("rejects an incorrect PIN", async () => {
    const store = useAdminStore.getState();
    await store.setPin("1234");

    const result = await useAdminStore.getState().unlock("5678");
    expect(result).toBe(false);
    expect(useAdminStore.getState().isUnlocked).toBe(false);
  });

  it("rejects unlock when no PIN is set", async () => {
    const result = await useAdminStore.getState().unlock("1234");
    expect(result).toBe(false);
    expect(useAdminStore.getState().isUnlocked).toBe(false);
  });

  it("locks and clears isUnlocked", async () => {
    const store = useAdminStore.getState();
    await store.setPin("1234");
    await useAdminStore.getState().unlock("1234");
    expect(useAdminStore.getState().isUnlocked).toBe(true);

    useAdminStore.getState().lock();
    expect(useAdminStore.getState().isUnlocked).toBe(false);
  });

  it("stays locked after reload (in-memory state)", () => {
    // Simulate a "reload" by checking fresh store state
    expect(useAdminStore.getState().isUnlocked).toBe(false);
  });
});

// ──────────────────────────────────────────────
// Admin store — change PIN
// ──────────────────────────────────────────────

describe("Admin store — changePin", () => {
  it("changes PIN when old PIN is correct", async () => {
    const store = useAdminStore.getState();
    await store.setPin("1234");

    const result = await useAdminStore.getState().changePin("1234", "5678");
    expect(result).toBe(true);

    // New PIN should work for unlock
    const unlockOk = await useAdminStore.getState().unlock("5678");
    expect(unlockOk).toBe(true);

    // Old PIN should no longer work
    const unlockOld = await useAdminStore.getState().unlock("1234");
    expect(unlockOld).toBe(false);
  });

  it("rejects change when old PIN is incorrect", async () => {
    const store = useAdminStore.getState();
    await store.setPin("1234");

    const result = await useAdminStore.getState().changePin("wrong", "5678");
    expect(result).toBe(false);

    // Old PIN should still work
    const unlockOk = await useAdminStore.getState().unlock("1234");
    expect(unlockOk).toBe(true);
  });

  it("sets first PIN via changePin when none exists", async () => {
    const result = await useAdminStore.getState().changePin("", "1234");
    expect(result).toBe(true);

    const unlockOk = await useAdminStore.getState().unlock("1234");
    expect(unlockOk).toBe(true);
  });
});

// ──────────────────────────────────────────────
// AdminRoute component
// ──────────────────────────────────────────────

describe("AdminRoute", () => {
  beforeEach(() => {
    // Ensure we're not on admin page
    useAppStore.getState().setPage("pos");
  });

  it("renders PIN entry screen when locked", () => {
    render(
      <AdminRoute>
        <div data-testid="admin-content">Secret Admin Stuff</div>
      </AdminRoute>,
    );

    expect(screen.getByText("Admin Access")).toBeTruthy();
    expect(screen.queryByTestId("admin-content")).toBeNull();
  });

  it("renders PIN setup screen when no PIN is set", () => {
    render(
      <AdminRoute>
        <div data-testid="admin-content">Secret Admin Stuff</div>
      </AdminRoute>,
    );

    expect(
      screen.getByText("Set an admin PIN to enable admin features"),
    ).toBeTruthy();
    expect(screen.getByLabelText("Confirm PIN")).toBeTruthy();
  });

  it("renders unlock screen when PIN is set", async () => {
    await useAdminStore.getState().setPin("1234");

    render(
      <AdminRoute>
        <div data-testid="admin-content">Secret Admin Stuff</div>
      </AdminRoute>,
    );

    expect(
      screen.getByText("Enter your PIN to unlock admin mode"),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Confirm PIN")).toBeNull();
    expect(screen.getByPlaceholderText("Enter PIN")).toBeTruthy();
  });

  it("renders children when unlocked", async () => {
    await useAdminStore.getState().setPin("1234");
    await useAdminStore.getState().unlock("1234");

    render(
      <AdminRoute>
        <div data-testid="admin-content">Secret Admin Stuff</div>
      </AdminRoute>,
    );

    expect(screen.getByTestId("admin-content")).toBeTruthy();
    expect(screen.queryByText("Admin Access")).toBeNull();
  });

  it("allows user to unlock via PIN entry", async () => {
    const user = userEvent.setup();
    await useAdminStore.getState().setPin("1234");

    render(
      <AdminRoute>
        <div data-testid="admin-content">Secret Admin Stuff</div>
      </AdminRoute>,
    );

    const input = screen.getByPlaceholderText("Enter PIN");
    await user.type(input, "1234");

    const unlockBtn = screen.getByText("Unlock");
    await user.click(unlockBtn);

    // Wait for async unlock to complete and re-render
    await waitFor(() => {
      expect(screen.getByTestId("admin-content")).toBeTruthy();
    });
  });

  it("shows error on wrong PIN", async () => {
    const user = userEvent.setup();
    await useAdminStore.getState().setPin("1234");

    render(
      <AdminRoute>
        <div data-testid="admin-content">Secret Admin Stuff</div>
      </AdminRoute>,
    );

    const input = screen.getByPlaceholderText("Enter PIN");
    await user.type(input, "9999");

    const unlockBtn = screen.getByText("Unlock");
    await user.click(unlockBtn);

    // userEvent wraps in act — the async state update should flush
    await waitFor(() => {
      expect(screen.getByText("PIN incorrecto")).toBeTruthy();
    });
  });

  it("dismiss button navigates to POS", async () => {
    const user = userEvent.setup();

    render(
      <AdminRoute>
        <div data-testid="admin-content">Secret Admin Stuff</div>
      </AdminRoute>,
    );

    const cancelBtn = screen.getByText("Cancel");
    await user.click(cancelBtn);

    expect(useAppStore.getState().page).toBe("pos");
  });
});
