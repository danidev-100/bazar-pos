import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useAppStore } from "@/store";
import App from "@/App";

describe("App — dashboard integration", () => {
  it("renders DashboardPage when page is dashboard (PAGE_COMPONENTS)", () => {
    // Reset to dashboard default
    useAppStore.setState({ page: "dashboard" });
    render(<App />);

    // DashboardPage renders "Panel Principal" as its header
    expect(screen.getByText("Panel Principal")).toBeInTheDocument();
  });
});
