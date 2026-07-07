import type { ReactNode } from "react";

type PanelProps = {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, right, children, className = "" }: PanelProps) {
  return (
    <section
      className={`rounded border border-[var(--border)] bg-[var(--panel)] ${className}`}
    >
      {(title || right) && (
        <div className="h-9 border-b border-[var(--border)] px-3 flex items-center justify-between">
          {title && (
            <h2 className="text-hud text-xs text-[var(--foreground)]">
              {title}
            </h2>
          )}
          {right}
        </div>
      )}

      {children}
    </section>
  );
}