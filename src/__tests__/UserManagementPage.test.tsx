import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAppStore } from "@/store";
import { useAuthStore } from "@/store/auth";
import UserManagementPage from "@/pages/UserManagementPage";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function resetAll() {
  useAuthStore.setState({
    users: [],
    currentUser: null,
    _hydrated: false,
  });
  useAppStore.setState({ page: "dashboard" });
  localStorage.removeItem("auth_users");
  localStorage.removeItem("auth_current_user_id");
}

async function loginAsAdmin() {
  await useAuthStore.getState().init();
  await useAuthStore.getState().login("admin", "admin");
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe("UserManagementPage", () => {
  beforeEach(() => {
    resetAll();
  });

  afterEach(() => {
    cleanup();
  });

  // ── Renders user table ──

  it("renders user table with existing users", async () => {
    await loginAsAdmin();

    render(<UserManagementPage />);

    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("Ventas")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Estadísticas")).toBeInTheDocument();
    expect(screen.getByText("Configuración")).toBeInTheDocument();
  });

  it("renders add user button", async () => {
    await loginAsAdmin();

    render(<UserManagementPage />);

    expect(screen.getByRole("button", { name: /agregar usuario/i })).toBeInTheDocument();
  });

  // ── Add User modal ──

  it("opens add user modal when clicking add button", async () => {
    await loginAsAdmin();

    render(<UserManagementPage />);

    await userEvent.click(screen.getByRole("button", { name: /agregar usuario/i }));

    expect(screen.getByText(/nuevo usuario/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/contraseña/i)).toBeInTheDocument();
  });

  it("adds a new user successfully", async () => {
    await loginAsAdmin();

    render(<UserManagementPage />);

    await userEvent.click(screen.getByRole("button", { name: /agregar usuario/i }));

    await userEvent.type(screen.getByPlaceholderText(/nombre/i), "nuevo");
    await userEvent.type(screen.getByPlaceholderText(/contraseña/i), "1234");

    // Toggle a permission checkbox
    const checkboxes = screen.getAllByRole("checkbox");
    // Click the first permission checkbox (Ventas)
    await userEvent.click(checkboxes[0]);

    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByText("nuevo")).toBeInTheDocument();
    });
  });

  it("shows validation error for empty name", async () => {
    await loginAsAdmin();

    render(<UserManagementPage />);

    await userEvent.click(screen.getByRole("button", { name: /agregar usuario/i }));

    await userEvent.type(screen.getByPlaceholderText(/contraseña/i), "1234");
    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(screen.getByText(/nombre.*obligatorio/i)).toBeInTheDocument();
  });

  it("shows validation error for empty password on new user", async () => {
    await loginAsAdmin();

    render(<UserManagementPage />);

    await userEvent.click(screen.getByRole("button", { name: /agregar usuario/i }));

    await userEvent.type(screen.getByPlaceholderText(/nombre/i), "nuevo");
    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(screen.getByText(/contraseña.*obligatoria/i)).toBeInTheDocument();
  });

  it("shows validation error for duplicate name", async () => {
    await loginAsAdmin();

    render(<UserManagementPage />);

    await userEvent.click(screen.getByRole("button", { name: /agregar usuario/i }));

    await userEvent.type(screen.getByPlaceholderText(/nombre/i), "admin");
    await userEvent.type(screen.getByPlaceholderText(/contraseña/i), "1234");
    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByText(/ya existe/i)).toBeInTheDocument();
    });
  });

  // ── Edit user ──

  it("opens edit modal when clicking edit button", async () => {
    await loginAsAdmin();

    render(<UserManagementPage />);

    await userEvent.click(screen.getByLabelText(/editar admin/i));

    expect(screen.getByText(/editar usuario/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("admin")).toBeInTheDocument();
  });

  it("edits user name successfully", async () => {
    await loginAsAdmin();

    render(<UserManagementPage />);

    await userEvent.click(screen.getByLabelText(/editar admin/i));

    const nameInput = screen.getByDisplayValue("admin");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "admin_mod");

    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByText("admin_mod")).toBeInTheDocument();
    });
  });

  it("edits user permissions successfully", async () => {
    await loginAsAdmin();
    await useAuthStore.getState().addUser({
      name: "limited",
      password: "pass",
      role: "custom",
      permissions: ["ventas"],
      active: true,
    });

    render(<UserManagementPage />);

    // Click edit on "limited" user
    await userEvent.click(screen.getByLabelText(/editar limited/i));

    // The edit modal should show checkboxes — find all of them
    const checkboxes = screen.getAllByRole("checkbox");

    // Uncheck Ventas (the first permission checkbox)
    // Find the checkbox labeled "Ventas" and uncheck it
    const ventasCheckbox = screen.getByLabelText("Ventas");
    await userEvent.click(ventasCheckbox);

    // Check "Clientes"
    const clientesCheckbox = screen.getByLabelText("Clientes");
    await userEvent.click(clientesCheckbox);

    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      // After saving, the "limited" user should not show "Ventas" badge in table
      // But admin still has Ventas — use within the limited row context
      const rows = screen.getAllByRole("row");
      const limitedRow = rows.find((r) => r.textContent?.includes("limited"));
      expect(limitedRow).toBeDefined();
      expect(limitedRow!.textContent).not.toContain("Ventas");
      expect(limitedRow!.textContent).toContain("Clientes");
    });
  });

  // ── Delete user ──

  it("deletes a non-admin user", async () => {
    const originalConfirm = window.confirm;
    window.confirm = () => true;

    await loginAsAdmin();
    await useAuthStore.getState().addUser({
      name: "deleteme",
      password: "pass",
      role: "custom",
      permissions: [],
      active: true,
    });

    render(<UserManagementPage />);

    expect(screen.getByText("deleteme")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/eliminar deleteme/i));

    await waitFor(() => {
      expect(screen.queryByText("deleteme")).toBeNull();
    });

    window.confirm = originalConfirm;
  });

  it("cannot delete the admin user", async () => {
    await loginAsAdmin();

    render(<UserManagementPage />);

    // Admin should have a lock icon or disabled delete button
    const adminRow = screen.getByText("admin").closest("tr")!;
    // The admin should not have a delete button with aria-label containing "eliminar admin"
    // Instead, there should be a lock icon
    expect(adminRow.querySelector('[aria-label*="Eliminar"]')).toBeNull();
    // Admin should show a lock indicator
    expect(screen.getByTitle(/admin.*no.*eliminar/i)).toBeInTheDocument();
  });

  // ── Permission checkboxes render ──

  it("renders permission checkboxes in add modal", async () => {
    await loginAsAdmin();

    render(<UserManagementPage />);

    await userEvent.click(screen.getByRole("button", { name: /agregar usuario/i }));

    // All four permissions should be available as checkboxes
    expect(screen.getByLabelText("Ventas")).toBeInTheDocument();
    expect(screen.getByLabelText("Clientes")).toBeInTheDocument();
    expect(screen.getByLabelText("Estadísticas")).toBeInTheDocument();
    expect(screen.getByLabelText("Configuración")).toBeInTheDocument();
  });

  // ── Cancel closes modal ──

  it("closes add modal on cancel", async () => {
    await loginAsAdmin();

    render(<UserManagementPage />);

    await userEvent.click(screen.getByRole("button", { name: /agregar usuario/i }));
    expect(screen.getByText(/nuevo usuario/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    await waitFor(() => {
      expect(screen.queryByText(/nuevo usuario/i)).toBeNull();
    });
  });
});

