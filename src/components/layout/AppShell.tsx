import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { StatusBar } from "./StatusBar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex">
      <AppSidebar />

      <main className="flex-1 min-w-0 flex flex-col">
        <StatusBar />
        <div className="flex-1 min-h-0">{children}</div>
      </main>
    </div>
  );
}