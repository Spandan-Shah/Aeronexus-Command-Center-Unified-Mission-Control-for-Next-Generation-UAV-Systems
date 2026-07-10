import type { ReactNode } from "react";
import type { PageId } from "../../data/navigation";
import { AppSidebar } from "./AppSidebar";
import { StatusBar } from "./StatusBar";

type AppShellProps = {
  children: ReactNode;
  activePage: PageId;
  onPageChange: (page: PageId) => void;
};

export function AppShell({
  children,
  activePage,
  onPageChange,
}: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-(--background) text-(--foreground)">
      <AppSidebar activePage={activePage} onPageChange={onPageChange} />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <StatusBar />
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  );
}