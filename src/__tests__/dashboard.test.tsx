import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "@/pages/DashboardPage";
import { useAppStore } from "@/store";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function resetStore() {
  useAppStore.setState({
    page: "dashboard",
    items: [],
    lastCompletedSale: null,
    completedSales: [],
    busy: false,
    notification: null,
    selectedCustomer: null,
    selectedCartItemId: null,
  });
}

beforeEach(() => {
  resetStore();
});

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe("DashboardPage", () => {
  it("2.1/2.2 — renders 8 module cards as buttons", () => {
    render(<DashboardPage />);
    const cards = screen.getAllByRole("button");
    expect(cards).toHaveLength(8);
  });

  it("2.1 — each card displays its label text", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Ventas")).toBeInTheDocument();
    expect(screen.getByText("Inventario")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Proveedores")).toBeInTheDocument();
    expect(screen.getByText("Pedidos")).toBeInTheDocument();
    expect(screen.getByText("Estadísticas")).toBeInTheDocument();
    expect(screen.getByText("Configuración")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
  });

  it("2.1 — clicking Ventas navigates to pos page", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    await user.click(screen.getByText("Ventas"));
    expect(useAppStore.getState().page).toBe("pos");
  });

  it("2.1 — clicking Inventario navigates to products page", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    await user.click(screen.getByText("Inventario"));
    expect(useAppStore.getState().page).toBe("products");
  });

  it("2.1 — clicking Clientes navigates to customers page", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    await user.click(screen.getByText("Clientes"));
    expect(useAppStore.getState().page).toBe("customers");
  });

  it("2.1 — clicking Estadísticas navigates to stats page", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    await user.click(screen.getByText("Estadísticas"));
    expect(useAppStore.getState().page).toBe("stats");
  });

  it("2.1 — clicking Configuración navigates to admin page", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    await user.click(screen.getByText("Configuración"));
    expect(useAppStore.getState().page).toBe("admin");
  });

  it("2.1 — clicking Usuarios navigates to admin page", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    await user.click(screen.getByText("Usuarios"));
    expect(useAppStore.getState().page).toBe("admin");
  });

  it("2.1 — disabled Proveedores card does NOT navigate", async () => {
    const user = userEvent.setup();
    resetStore();
    render(<DashboardPage />);

    // Verify the page stays at "dashboard" after clicking Proveedores
    await user.click(screen.getByText("Proveedores"));
    expect(useAppStore.getState().page).toBe("dashboard");
  });

  it("2.1 — disabled Pedidos card does NOT navigate", async () => {
    const user = userEvent.setup();
    resetStore();
    render(<DashboardPage />);

    await user.click(screen.getByText("Pedidos"));
    expect(useAppStore.getState().page).toBe("dashboard");
  });

  it("2.1 — disabled cards show Próximamente badge", () => {
    render(<DashboardPage />);
    const badges = screen.getAllByText("Próximamente");
    expect(badges).toHaveLength(2);
  });

  it("2.1 — disabled cards are disabled (not clickable)", () => {
    render(<DashboardPage />);
    const buttons = screen.getAllByRole("button");

    // Proveedores and Pedidos should be disabled
    const proveedores = buttons.find(
      (b) => b.textContent && b.textContent.includes("Proveedores"),
    );
    const pedidos = buttons.find(
      (b) => b.textContent && b.textContent.includes("Pedidos"),
    );

    expect(proveedores).toBeDisabled();
    expect(pedidos).toBeDisabled();
  });

  it("2.1 — active cards are NOT disabled (all 6 are enabled)", () => {
    render(<DashboardPage />);
    const buttons = screen.getAllByRole("button");
    const activeLabels = ["Ventas", "Inventario", "Clientes", "Estadísticas", "Configuración", "Usuarios"];

    for (const label of activeLabels) {
      const btn = buttons.find((b) => b.textContent?.includes(label));
      expect(btn).not.toBeNull();
      expect(btn).toBeEnabled();
    }
  });

  it("2.2 — page renders header title Panel Principal", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Panel Principal")).toBeInTheDocument();
  });

  it("2.1 — setPage is NOT called when clicking disabled cards (vi spy)", async () => {
    const user = userEvent.setup();
    const setPageSpy = vi.spyOn(useAppStore.getState(), "setPage");
    render(<DashboardPage />);

    await user.click(screen.getByText("Proveedores"));
    expect(setPageSpy).not.toHaveBeenCalled();

    await user.click(screen.getByText("Pedidos"));
    expect(setPageSpy).not.toHaveBeenCalled();

    setPageSpy.mockRestore();
  });
});
