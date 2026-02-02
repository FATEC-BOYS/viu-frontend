import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IdentityGate from "../IdentityGate";

// Mock supabase
vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from "@/lib/supabaseClient";

const defaultProps = {
  token: "tok_123",
  arteId: "arte_1",
  onIdentified: vi.fn(),
};

beforeEach(() => {
  defaultProps.onIdentified.mockReset();
  (supabase.rpc as ReturnType<typeof vi.fn>).mockReset();
  localStorage.clear();
});

describe("IdentityGate", () => {
  it("renders email and name inputs", () => {
    render(<IdentityGate {...defaultProps} />);
    expect(screen.getByPlaceholderText("voce@empresa.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Seu nome")).toBeInTheDocument();
  });

  it("renders the confirm button disabled without email", () => {
    render(<IdentityGate {...defaultProps} />);
    expect(screen.getByText("Confirmar")).toBeDisabled();
  });

  it("enables confirm button when email is provided", async () => {
    render(<IdentityGate {...defaultProps} />);
    await userEvent.type(screen.getByPlaceholderText("voce@empresa.com"), "test@email.com");
    expect(screen.getByText("Confirmar")).not.toBeDisabled();
  });

  it("calls supabase rpc and onIdentified on success", async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { email: "test@email.com", nome: "Test User" },
      error: null,
    });

    render(<IdentityGate {...defaultProps} />);
    await userEvent.type(screen.getByPlaceholderText("voce@empresa.com"), "test@email.com");
    await userEvent.type(screen.getByPlaceholderText("Seu nome"), "Test User");
    await userEvent.click(screen.getByText("Confirmar"));

    await waitFor(() => {
      expect(defaultProps.onIdentified).toHaveBeenCalledWith({
        email: "test@email.com",
        nome: "Test User",
      });
    });
  });

  it("shows error on rpc failure", async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: null,
      error: { message: "Token inválido" },
    });

    render(<IdentityGate {...defaultProps} />);
    await userEvent.type(screen.getByPlaceholderText("voce@empresa.com"), "test@email.com");
    await userEvent.click(screen.getByText("Confirmar"));

    await waitFor(() => {
      expect(screen.getByText("Token inválido")).toBeInTheDocument();
    });
  });

  it("auto-identifies from localStorage", () => {
    localStorage.setItem("viu.viewer", JSON.stringify({ email: "cached@test.com", nome: "Cache" }));
    render(<IdentityGate {...defaultProps} />);

    expect(defaultProps.onIdentified).toHaveBeenCalledWith({
      email: "cached@test.com",
      nome: "Cache",
    });
  });

  it("renders as a modal dialog", () => {
    render(<IdentityGate {...defaultProps} />);
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeInTheDocument();
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
  });

  it("saves to localStorage on successful identification", async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { email: "new@email.com", nome: "New" },
      error: null,
    });

    render(<IdentityGate {...defaultProps} />);
    await userEvent.type(screen.getByPlaceholderText("voce@empresa.com"), "new@email.com");
    await userEvent.click(screen.getByText("Confirmar"));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("viu.viewer") || "{}");
      expect(stored.email).toBe("new@email.com");
    });
  });
});
