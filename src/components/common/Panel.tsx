import type {
  ReactNode,
} from "react";


type PanelProps = {
  title?: string;

  right?: ReactNode;

  children: ReactNode;

  className?: string;
};


export function Panel({
  title,
  right,
  children,
  className = "",
}: PanelProps) {
  return (
    <section
      className={[
        "overflow-hidden",

        "rounded-[9px]",

        "border border-[var(--border)]",

        "bg-[var(--surface-1)]",

        "text-[var(--foreground)]",

        "shadow-[0_12px_30px_rgba(0,0,0,0.18)]",

        className,
      ].join(" ")}
    >
      {title ||
      right ? (
        <div
          className={[
            "flex min-h-[52px] items-center justify-between gap-4",

            "border-b border-[var(--border-soft)]",

            "bg-[var(--surface-2)]",

            "px-4",
          ].join(" ")}
        >
          {title ? (
            <h2 className="text-[16px] font-semibold tracking-[-0.015em] text-[var(--foreground)]">
              {title}
            </h2>
          ) : (
            <span />
          )}

          {right}
        </div>
      ) : null}

      {children}
    </section>
  );
}