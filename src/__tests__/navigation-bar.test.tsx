import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAppStore } from "@/store";
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
