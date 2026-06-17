import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAppStore } from "@/store";
import { useAuthStore } from "@/store/auth";
import { StoreProvider } from "@/store/context";
import NavigationBar from "@/components/NavigationBar";

function renderNav() {
  return render(
    <StoreProvider initialStoreId="store_1">
      <NavigationBar />
    </StoreProvider>,
  );
}

describe("NavigationBar — dashboard integration", () => {
  beforeEach(() => {
    useAppStore.setState({ page: "dashboard" });
  });

  it("shows Inicio button as a navigation item", () => {
    renderNav();
    expect(screen.getByText("Inicio")).toBeInTheDocument();
  });

  it("clicking Inicio navigates to dashboard page", async () => {
    const user = userEvent.setup();
    // Start on a different page
    useAppStore.setState({ page: "pos" });
    renderNav();

    await user.click(screen.getByText("Inicio"));
    expect(useAppStore.getState().page).toBe("dashboard");
  });
});

// ──────────────────────────────────────────────
// Permission-based navigation filtering (Task 3.3)
// ──────────────────────────────────────────────

describe("NavigationBar — permission filtering", () => {
  beforeEach(async () => {
    useAuthStore.setState({
      users: [],
      currentUser: null,
      _hydrated: false,
    });
    localStorage.removeItem("auth_users");
    localStorage.removeItem("auth_current_user_id");
    useAppStore.setState({ page: "dashboard" });
  });

  it("shows all pages for admin user with all permissions", async () => {
    await useAuthStore.getState().init();
    await useAuthStore.getState().login("admin", "admin");

    renderNav();

    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("POS")).toBeInTheDocument();
    expect(screen.getByText("Productos")).toBeInTheDocument();
    expect(screen.getByText("Caja")).toBeInTheDocument();
    expect(screen.getByText("Facturación")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Estadísticas")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("hides stats page when user lacks estadisticas permission", async () => {
    await useAuthStore.getState().init();
    await useAuthStore.getState().addUser({
      name: "limited",
      password: "pass",
      role: "custom",
      permissions: ["ventas", "clientes", "configuracion"],
      active: true,
    });
    await useAuthStore.getState().login("limited", "pass");

    renderNav();

    expect(screen.queryByText("Estadísticas")).toBeNull();
    // Other pages should still be visible
    expect(screen.getByText("Facturación")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("hides customers page when user lacks clientes permission", async () => {
    await useAuthStore.getState().init();
    await useAuthStore.getState().addUser({
      name: "limited",
      password: "pass",
      role: "custom",
      permissions: ["ventas", "estadisticas", "configuracion"],
      active: true,
    });
    await useAuthStore.getState().login("limited", "pass");

    renderNav();

    expect(screen.queryByText("Clientes")).toBeNull();
    expect(screen.getByText("Estadísticas")).toBeInTheDocument();
    expect(screen.getByText("Facturación")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("hides admin page when user lacks configuracion permission", async () => {
    await useAuthStore.getState().init();
    await useAuthStore.getState().addUser({
      name: "limited",
      password: "pass",
      role: "custom",
      permissions: ["ventas"],
      active: true,
    });
    await useAuthStore.getState().login("limited", "pass");

    renderNav();

    expect(screen.queryByText("Admin")).toBeNull();
  });

  it("always shows unconditional pages (dashboard, pos, products, cash-closing)", async () => {
    await useAuthStore.getState().init();
    await useAuthStore.getState().addUser({
      name: "limited",
      password: "pass",
      role: "custom",
      permissions: [],
      active: true,
    });
    await useAuthStore.getState().login("limited", "pass");

    renderNav();

    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("POS")).toBeInTheDocument();
    expect(screen.getByText("Productos")).toBeInTheDocument();
    expect(screen.getByText("Caja")).toBeInTheDocument();

    // Permission-gated pages should be hidden
    expect(screen.queryByText("Facturación")).toBeNull();
    expect(screen.queryByText("Clientes")).toBeNull();
    expect(screen.queryByText("Estadísticas")).toBeNull();
    expect(screen.queryByText("Admin")).toBeNull();
  });
});

// ──────────────────────────────────────────────
// User info display and logout (Task 3.3)
// ──────────────────────────────────────────────

describe("NavigationBar — user info", () => {
  beforeEach(async () => {
    useAuthStore.setState({
      users: [],
      currentUser: null,
      _hydrated: false,
    });
    localStorage.removeItem("auth_users");
    localStorage.removeItem("auth_current_user_id");
    useAppStore.setState({ page: "dashboard" });
  });

  it("shows current user name", async () => {
    await useAuthStore.getState().init();
    await useAuthStore.getState().login("admin", "admin");

    renderNav();

    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("shows logout button", async () => {
    await useAuthStore.getState().init();
    await useAuthStore.getState().login("admin", "admin");

    renderNav();

    expect(screen.getByText("Salir")).toBeInTheDocument();
  });

  it("logout button logs out and navigates to login page", async () => {
    const user = userEvent.setup();
    await useAuthStore.getState().init();
    await useAuthStore.getState().login("admin", "admin");

    renderNav();

    await user.click(screen.getByText("Salir"));

    expect(useAuthStore.getState().currentUser).toBeNull();
    expect(useAppStore.getState().page).toBe("login");
  });
});

