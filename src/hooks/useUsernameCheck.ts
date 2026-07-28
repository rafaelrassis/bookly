import { useEffect, useState } from "react";

type State = "idle" | "checking" | "available" | "taken" | "invalid";

export function useUsernameCheck(username: string, currentUsername?: string) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const value = username.trim().toLowerCase();
    if (!value || value === currentUsername?.toLowerCase()) {
      setState("idle");
      setError(null);
      return;
    }
    setState("checking");
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/check-username?u=${encodeURIComponent(value)}`,
          { signal: controller.signal }
        );
        const json = await res.json();
        if (json.error) {
          setState("invalid");
          setError(json.error);
        } else {
          setState(json.available ? "available" : "taken");
          setError(null);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState("idle");
      }
    }, 400);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [username, currentUsername]);

  return { state, error };
}
