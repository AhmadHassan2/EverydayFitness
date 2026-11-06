"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { DataProvider } from "@/lib/data/provider";
import { RepositoryError } from "@/lib/data/repository";
import { ThemeProvider } from "./theme";
import { ServiceWorker } from "./service-worker";

let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: true,
        retry: (count, err) => !(err instanceof RepositoryError && err.code === "unauthorized") && count < 2,
      },
      mutations: { retry: false },
    },
  });
}

function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ServiceWorker />
      <QueryClientProvider client={getQueryClient()}>
        <DataProvider>{children}</DataProvider>
      </QueryClientProvider>
      <Toaster
        position="top-center"
        offset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
        mobileOffset={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
        toastOptions={{
          classNames: {
            toast:
              "!rounded-xl !border !border-border !bg-surface !text-foreground !shadow-lg !text-[14px] !font-medium !gap-2",
            description: "!text-muted-foreground",
            actionButton: "!bg-surface-2 !text-foreground !font-medium !rounded-md",
          },
        }}
        style={{ zIndex: 100 }}
      />
    </ThemeProvider>
  );
}
