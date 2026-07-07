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
    <div className="min-h-screen bg-(--background) text-(--foreground) flex">
      <AppSidebar activePage={activePage} onPageChange={onPageChange} />

      <main className="flex-1 min-w-0 flex flex-col">
        <StatusBar />
        <div className="flex-1 min-h-0">{children}</div>
      </main>
    </div>
  );
}