import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ThemeToggle from "@/app/components/ThemeToggle";
import { ThemeProvider } from "@/context/ThemeContext";

function renderWithThemeProvider() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
}

describe("ThemeToggle", () => {
  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("defaults to light mode when no saved theme exists", async () => {
    renderWithThemeProvider();

    await waitFor(() => {
      expect(document.documentElement).not.toHaveClass("dark");
    });

    expect(
      screen.getByRole("button", { name: "ダークモードにする" })
    ).toBeInTheDocument();
  });

  it("restores saved dark mode on mount", async () => {
    window.localStorage.setItem("theme", "dark");

    renderWithThemeProvider();

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
    });

    expect(
      screen.getByRole("button", { name: "ライトモードにする" })
    ).toBeInTheDocument();
  });

  it("toggles theme and persists the next choice", async () => {
    renderWithThemeProvider();

    const button = await screen.findByRole("button", {
      name: "ダークモードにする",
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
      expect(window.localStorage.getItem("theme")).toBe("dark");
    });
  });
});
