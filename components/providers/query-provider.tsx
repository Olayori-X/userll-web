"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data counts as fresh for 30 seconds, so moving between pages does not refetch everything.
        staleTime: 30_000,
        retry: (failureCount, error) => {
          // A 4xx answer means the request itself is wrong (not logged in, not found, rate limited).
          // Asking again cannot help, and for 429 it would make things worse.
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;

          // Dropped connections and server hiccups get two more tries.
          return failureCount < 2;
        },
      },
      mutations: {
        // Never repeat a write on our own: it could place an order twice or start a second payout.
        // If a write fails, the person sees the error and decides whether to try again.
        retry: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // Created once per browser tab. Creating it inside useState (not at the top of the file) also keeps
  // the server from sharing one cache between different visitors' requests.
  const [queryClient] = useState(makeQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}