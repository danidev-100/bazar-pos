import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useAppStore } from "@/store";
import { useAuthStore } from "@/store/auth";
import App from "@/App";

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

beforeEach(() => {
  resetAll();
});

describe("App — auth gate", () => {
  it("renders LoginPage when not authenticated", async () => {
    // Init store but don't login
    await useAuthStore.getState().init();

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Iniciar Sesión")).toBeInTheDocument();
    });
  });

  it("renders dashboard when authenticated", async () => {
    await useAuthStore.getState().init();
    await useAuthStore.getState().login("admin", "admin");

    render(<App />);

    await waitFor(() => {
      // Navigation bar should be visible
      expect(screen.getByText("Inicio")).toBeInTheDocument();
    });
  });

  it("redirects to dashboard when page lacks permission", async () => {
    await useAuthStore.getState().init();
    // Create a user without "estadisticas" permission
    await useAuthStore.getState().addUser({
      name: "limited",
      password: "pass",
      permissions: ["ventas"],
      active: true,
    });
    await useAuthStore.getState().login("limited", "pass");

    // Try to navigate to stats page without permission
    useAppStore.getState().setPage("stats");

    render(<App />);

    // Should redirect to dashboard
    await waitFor(() => {
      expect(useAppStore.getState().page).toBe("dashboard");
    });
  });

  it("does not render NavigationBar on LoginPage", async () => {
    // Not authenticated, on login page
    useAppStore.getState().setPage("login");
    await useAuthStore.getState().init();

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Iniciar Sesión")).toBeInTheDocument();
    });

    // NavBar should not be present
    expect(screen.queryByText("Inicio")).toBeNull();
  });
});
