import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { AuthSync } from "./AuthSync";
import { useStore } from "@/lib/store";

const mockUseSession = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

const FAKE_PROFILE = {
  name: "Fulana",
  username: "fulana",
  bio: "bio de teste",
  genres: ["ficção"],
  avatar: 2,
  avatarUrl: null,
  city: "São Paulo",
  state: "SP",
  top4: ["book-1"],
  top4Books: [],
  progressUnit: "pages",
  followers: 4,
  following: 7,
};

describe("AuthSync", () => {
  beforeEach(() => {
    useStore.setState({
      hasHydrated: true,
      user: { ...useStore.getState().user, loggedIn: false, email: "" },
    });
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: {
        user: { name: "Fulana", username: "fulana", email: "fulana@example.com" },
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => FAKE_PROFILE,
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sincroniza followers e following do perfil vindo de /api/users/me", async () => {
    render(<AuthSync />);

    await waitFor(() => {
      expect(useStore.getState().user.followers).toBe(4);
    });
    expect(useStore.getState().user.following).toBe(7);
  });
});
