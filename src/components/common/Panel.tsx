import type {
  ReactNode,
} from "react";


type PanelProps = {
  title?:
    string;

  right?:
    ReactNode;

  children:
    ReactNode;

  className?:
    string;
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

        "rounded-[8px]",

        "border border-[var(--border)]",

        "bg-white",

        "shadow-[0_8px_24px_rgba(25,35,45,0.055)]",

        className,
      ].join(" ")}
    >
      {title ||
      right ? (
        <div
          className={[
            "flex min-h-[50px] items-center justify-between gap-4",

            "border-b border-[var(--border-soft)]",

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