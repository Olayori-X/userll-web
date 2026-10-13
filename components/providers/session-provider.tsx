"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { setUnauthenticatedHandler } from "@/lib/api";
import { getCurrentUser, logout } from "@/lib/api/auth";
import type { User } from "@/lib/types/user";

const SESSION_KEY = ["session"] as const;

export type SessionStatus = "loading" | "authenticated" | "unauthenticated" | "error";

type SessionState = {
  /** The logged-in user, or null when nobody is (or while it is still loading). */
  user: User | null;
  /** "error" means we could not find out (offline, API down). That is different from being logged out. */
  status: SessionStatus;
  /** Call this with the user a successful login or register returned. */
  signIn: (user: User) => void;
  /** Ends the session and wipes everything private from the cache. */
  signOut: () => Promise<void>;
  /** Re-reads the user from the API, for example after they verify their email or open a shop. */
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

type Props = {
  children: ReactNode;
  /**
   * The user, when the server already knows them. Passing it (even null for "not logged in") avoids a
   * moment of "logged out" on first load. Leave it out and the user is loaded in the browser instead.
   */
  initialUser?: User | null;
};

export function SessionProvider({ children, initialUser }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const query = useQuery({
    queryKey: SESSION_KEY,
    queryFn: getCurrentUser,
    initialData: initialUser,
    staleTime: 5 * 60_000, // coming back to the tab after 5 minutes re-checks, which notices a suspended account
  });

  /** Everything cached except the session itself: orders, cart, chats and so on. */
  const forgetPrivateData = useCallback(() => {
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_KEY[0] });
  }, [queryClient]);

  // The API said "401" on a call that needed a login: the session ended (expired, revoked, or suspended).
  useEffect(() => {
    setUnauthenticatedHandler(() => {
      // Only react if we believed someone was logged in. A stray 401 for a visitor changes nothing.
      if (!queryClient.getQueryData<User | null>(SESSION_KEY)) return;

      forgetPrivateData();
      queryClient.setQueryData(SESSION_KEY, null);

      if (window.location.pathname !== "/login") {
        const here = window.location.pathname + window.location.search;

        router.replace(`/login?expired=1&next=${encodeURIComponent(here)}`);
      }
    });

    return () => setUnauthenticatedHandler(null);
  }, [queryClient, router, forgetPrivateData]);

  const signIn = useCallback(
    (user: User) => {
      queryClient.setQueryData(SESSION_KEY, user);
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      // The proxy clears the cookie whether or not the API answered, so we sign out on this side regardless.
    }

    forgetPrivateData();
    queryClient.setQueryData(SESSION_KEY, null);

    router.replace("/");
    router.refresh();
  }, [queryClient, router, forgetPrivateData]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: SESSION_KEY });
  }, [queryClient]);

  const value = useMemo<SessionState>(() => {
    const data = query.data; // User, null (logged out), or undefined (not loaded yet)

    let status: SessionStatus;

    if (data !== undefined) status = data ? "authenticated" : "unauthenticated";
    else if (query.isError) status = "error";
    else status = "loading";

    return { user: data ?? null, status, signIn, signOut, refresh };
  }, [query.data, query.isError, signIn, signOut, refresh]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);

  if (!value) throw new Error("useSession must be used inside <SessionProvider>.");

  return value;
}