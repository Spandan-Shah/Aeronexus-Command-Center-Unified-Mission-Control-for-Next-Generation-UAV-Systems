import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";

import {
  joinMissionClasses,
  type MissionTone,
} from "./missionTheme";

export type MissionButtonVariant =
  | "solid"
  | "soft"
  | "outline"
  | "ghost";

export type MissionButtonSize =
  | "sm"
  | "md"
  | "lg"
  | "icon";

export type MissionButtonProps =
  Omit<
    ComponentPropsWithoutRef<"button">,
    "children"
  > & {
    children?: ReactNode;

    tone?: MissionTone;

    variant?: MissionButtonVariant;

    size?: MissionButtonSize;

    leadingIcon?: ReactNode;

    trailingIcon?: ReactNode;

    loading?: boolean;

    fullWidth?: boolean;
  };

const sizeClasses: Record<
  MissionButtonSize,
  string
> = {
  sm:
    "min-h-8 px-3 text-[9px]",

  md:
    "min-h-9 px-4 text-[9px]",

  lg:
    "min-h-10 px-4 text-[10px]",

  icon:
    "h-9 w-9 p-0",
};

const solidToneClasses: Record<
  MissionTone,
  string
> = {
  default:
    "border-white bg-white text-black hover:bg-white/90",

  primary:
    "border-[var(--primary)] bg-[var(--primary)] text-black hover:bg-[var(--primary-hover)]",

  info:
    "border-[var(--info)] bg-[var(--info)] text-black hover:brightness-110",

  nominal:
    "border-[var(--nominal)] bg-[var(--nominal)] text-black hover:brightness-110",

  caution:
    "border-[var(--caution)] bg-[var(--caution)] text-black hover:brightness-110",

  critical:
    "border-[var(--critical)] bg-[var(--critical)] text-white hover:brightness-110",

  muted:
    "border-[var(--muted-soft)] bg-[var(--muted-soft)] text-black hover:brightness-110",
};

const softToneClasses: Record<
  MissionTone,
  string
> = {
  default:
    "border-white/10 bg-white/[0.035] text-white/75 hover:border-white/20 hover:bg-white/[0.055] hover:text-white",

  primary:
    "border-[rgba(246,178,60,0.28)] bg-[rgba(246,178,60,0.075)] text-[var(--primary)] hover:border-[rgba(246,178,60,0.5)] hover:bg-[rgba(246,178,60,0.12)]",

  info:
    "border-[rgba(90,169,255,0.28)] bg-[rgba(90,169,255,0.07)] text-[var(--info)] hover:border-[rgba(90,169,255,0.48)] hover:bg-[rgba(90,169,255,0.11)]",

  nominal:
    "border-[rgba(89,217,154,0.28)] bg-[rgba(89,217,154,0.07)] text-[var(--nominal)] hover:border-[rgba(89,217,154,0.48)] hover:bg-[rgba(89,217,154,0.11)]",

  caution:
    "border-[rgba(246,178,60,0.32)] bg-[rgba(246,178,60,0.08)] text-[var(--caution)] hover:border-[rgba(246,178,60,0.52)] hover:bg-[rgba(246,178,60,0.13)]",

  critical:
    "border-[rgba(255,90,99,0.32)] bg-[rgba(255,90,99,0.075)] text-[var(--critical)] hover:border-[rgba(255,90,99,0.5)] hover:bg-[rgba(255,90,99,0.12)]",

  muted:
    "border-white/[0.07] bg-white/[0.02] text-[var(--muted)] hover:border-white/15 hover:text-white/75",
};

const outlineToneClasses: Record<
  MissionTone,
  string
> = {
  default:
    "border-white/12 bg-transparent text-white/70 hover:border-white/25 hover:bg-white/[0.035] hover:text-white",

  primary:
    "border-[rgba(246,178,60,0.34)] bg-transparent text-[var(--primary)] hover:bg-[rgba(246,178,60,0.07)]",

  info:
    "border-[rgba(90,169,255,0.34)] bg-transparent text-[var(--info)] hover:bg-[rgba(90,169,255,0.07)]",

  nominal:
    "border-[rgba(89,217,154,0.34)] bg-transparent text-[var(--nominal)] hover:bg-[rgba(89,217,154,0.07)]",

  caution:
    "border-[rgba(246,178,60,0.36)] bg-transparent text-[var(--caution)] hover:bg-[rgba(246,178,60,0.07)]",

  critical:
    "border-[rgba(255,90,99,0.36)] bg-transparent text-[var(--critical)] hover:bg-[rgba(255,90,99,0.07)]",

  muted:
    "border-white/[0.07] bg-transparent text-[var(--muted)] hover:border-white/15 hover:text-white/70",
};

const ghostToneClasses: Record<
  MissionTone,
  string
> = {
  default:
    "border-transparent bg-transparent text-white/60 hover:bg-white/[0.04] hover:text-white",

  primary:
    "border-transparent bg-transparent text-[var(--primary)] hover:bg-[rgba(246,178,60,0.07)]",

  info:
    "border-transparent bg-transparent text-[var(--info)] hover:bg-[rgba(90,169,255,0.07)]",

  nominal:
    "border-transparent bg-transparent text-[var(--nominal)] hover:bg-[rgba(89,217,154,0.07)]",

  caution:
    "border-transparent bg-transparent text-[var(--caution)] hover:bg-[rgba(246,178,60,0.07)]",

  critical:
    "border-transparent bg-transparent text-[var(--critical)] hover:bg-[rgba(255,90,99,0.07)]",

  muted:
    "border-transparent bg-transparent text-[var(--muted)] hover:bg-white/[0.035] hover:text-white/70",
};

function getVariantClasses(
  variant: MissionButtonVariant,
  tone: MissionTone,
) {
  if (
    variant === "solid"
  ) {
    return solidToneClasses[
      tone
    ];
  }

  if (
    variant === "outline"
  ) {
    return outlineToneClasses[
      tone
    ];
  }

  if (
    variant === "ghost"
  ) {
    return ghostToneClasses[
      tone
    ];
  }

  return softToneClasses[
    tone
  ];
}

export function MissionButton({
  children,
  tone = "default",
  variant = "soft",
  size = "md",
  leadingIcon,
  trailingIcon,
  loading = false,
  fullWidth = false,
  disabled,
  type = "button",
  className,
  ...buttonProps
}: MissionButtonProps) {
  const isDisabled =
    disabled ||
    loading;

  return (
    <button
      {...buttonProps}
      type={type}
      disabled={
        isDisabled
      }
      aria-busy={
        loading ||
        undefined
      }
      className={joinMissionClasses(
        "inline-flex items-center justify-center gap-2 rounded-md border",

        "font-mono font-semibold uppercase tracking-[0.1em]",

        "transition-[background-color,border-color,color,transform,opacity]",

        "duration-150 ease-out",

        "active:translate-y-px",

        "disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0",

        sizeClasses[
          size
        ],

        getVariantClasses(
          variant,
          tone,
        ),

        fullWidth &&
          "w-full",

        className,
      )}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent opacity-80"
        />
      ) : (
        leadingIcon
      )}

      {children}

      {!loading
        ? trailingIcon
        : null}
    </button>
  );
}