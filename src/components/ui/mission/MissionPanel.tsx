import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";

/* =========================================================
   MissionNexus V2
   Mission Panel

   Shared structural surface for operational workspaces,
   telemetry groups, mission systems and analytical panels.
   ========================================================= */

export type MissionPanelTone =
  | "default"
  | "primary"
  | "info"
  | "nominal"
  | "caution"
  | "critical";

export type MissionPanelSurface =
  | "base"
  | "raised"
  | "glass";

export type MissionPanelPadding =
  | "none"
  | "sm"
  | "md"
  | "lg";

export type MissionPanelProps =
  Omit<
    ComponentPropsWithoutRef<"section">,
    "children"
  > & {
    children: ReactNode;

    /**
     * Semantic panel border/accent state.
     *
     * This is intentionally separate from surface styling.
     */
    tone?: MissionPanelTone;

    /**
     * Determines the physical depth of the panel.
     */
    surface?: MissionPanelSurface;

    /**
     * Standardized internal spacing.
     */
    padding?: MissionPanelPadding;

    /**
     * Adds the thin Aeronexus technical accent line.
     */
    accent?: boolean;

    /**
     * Adds restrained hover behaviour for clickable panels.
     */
    interactive?: boolean;
  };

/* =========================================================
   Style Maps
   ========================================================= */

const toneClasses:
  Record<
    MissionPanelTone,
    string
  > = {
    default:
      "border-[var(--border-soft)]",

    primary:
      "border-[rgba(246,178,60,0.24)]",

    info:
      "border-[rgba(90,169,255,0.24)]",

    nominal:
      "border-[rgba(89,217,154,0.24)]",

    caution:
      "border-[rgba(246,178,60,0.3)]",

    critical:
      "border-[rgba(255,90,99,0.3)]",
  };

const accentClasses:
  Record<
    MissionPanelTone,
    string
  > = {
    default:
      "bg-white/20",

    primary:
      "bg-[var(--primary)]",

    info:
      "bg-[var(--info)]",

    nominal:
      "bg-[var(--nominal)]",

    caution:
      "bg-[var(--caution)]",

    critical:
      "bg-[var(--critical)]",
  };

const surfaceClasses:
  Record<
    MissionPanelSurface,
    string
  > = {
    base:
      [
        "bg-[var(--surface-1)]",
        "shadow-[0_12px_40px_rgba(0,0,0,0.18)]",
      ].join(" "),

    raised:
      [
        "bg-[var(--surface-2)]",
        "shadow-[0_20px_65px_rgba(0,0,0,0.34)]",
      ].join(" "),

    glass:
      [
        "bg-[rgba(5,7,9,0.78)]",
        "shadow-[0_18px_55px_rgba(0,0,0,0.3)]",
        "backdrop-blur-xl",
      ].join(" "),
  };

const paddingClasses:
  Record<
    MissionPanelPadding,
    string
  > = {
    none:
      "",

    sm:
      "p-3",

    md:
      "p-4",

    lg:
      "p-5",
  };

/* =========================================================
   Helpers
   ========================================================= */

function joinClasses(
  ...classes:
    Array<
      string |
      false |
      null |
      undefined
    >
) {
  return classes
    .filter(Boolean)
    .join(" ");
}

/* =========================================================
   Component
   ========================================================= */

export function MissionPanel({
  children,

  tone = "default",

  surface = "base",

  padding = "none",

  accent = false,

  interactive = false,

  className,

  ...sectionProps
}: MissionPanelProps) {
  return (
    <section
      {...sectionProps}
      data-mission-panel
      data-tone={tone}
      data-surface={surface}
      className={joinClasses(
        /**
         * Geometry
         */
        "relative overflow-hidden rounded-md border",

        /**
         * Aeronexus structural border.
         */
        toneClasses[
          tone
        ],

        /**
         * Surface depth.
         */
        surfaceClasses[
          surface
        ],

        /**
         * Standardized internal spacing.
         */
        paddingClasses[
          padding
        ],

        /**
         * Optional interaction.
         *
         * MissionNexus panels should move very little.
         * This is deliberate — it avoids the floating-card
         * feel common in generic dashboards.
         */
        interactive &&
          [
            "transition-[border-color,background-color,transform]",
            "duration-150",
            "ease-out",
            "hover:-translate-y-px",
            "hover:border-white/15",
            "hover:bg-[var(--surface-2)]",
          ].join(" "),

        className,
      )}
    >
      {/* ===================================================
          Technical Accent

          This is intentionally short rather than spanning
          the entire panel. It behaves more like aerospace
          instrument chrome than a decorative gradient.
          =================================================== */}

      {accent ? (
        <span
          aria-hidden="true"
          className={joinClasses(
            "pointer-events-none absolute left-0 top-0 h-px w-12",

            accentClasses[
              tone
            ],
          )}
        />
      ) : null}

      {children}
    </section>
  );
}