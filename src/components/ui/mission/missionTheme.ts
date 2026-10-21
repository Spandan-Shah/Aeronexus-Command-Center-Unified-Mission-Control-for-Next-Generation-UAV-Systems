export type MissionTone =
  | "default"
  | "primary"
  | "info"
  | "nominal"
  | "caution"
  | "critical"
  | "muted";


export type MissionToneClasses = {
  text: string;

  border: string;

  background: string;

  dot: string;

  ring: string;
};


export const MISSION_TONE_CLASSES:
  Record<
    MissionTone,
    MissionToneClasses
  > = {
  default: {
    text:
      "text-[var(--foreground)]",

    border:
      "border-[var(--border)]",

    background:
      "bg-[var(--surface-2)]",

    dot:
      "bg-[var(--muted)]",

    ring:
      "ring-[rgba(185,194,202,0.12)]",
  },

  primary: {
    text:
      "text-[var(--primary)]",

    border:
      "border-[rgba(176,138,88,0.30)]",

    background:
      "bg-[rgba(176,138,88,0.10)]",

    dot:
      "bg-[var(--primary)]",

    ring:
      "ring-[rgba(176,138,88,0.18)]",
  },

  info: {
    text:
      "text-[var(--info)]",

    border:
      "border-[rgba(93,135,163,0.30)]",

    background:
      "bg-[rgba(93,135,163,0.10)]",

    dot:
      "bg-[var(--info)]",

    ring:
      "ring-[rgba(93,135,163,0.18)]",
  },

  nominal: {
    text:
      "text-[var(--nominal)]",

    border:
      "border-[rgba(100,142,120,0.30)]",

    background:
      "bg-[rgba(100,142,120,0.10)]",

    dot:
      "bg-[var(--nominal)]",

    ring:
      "ring-[rgba(100,142,120,0.18)]",
  },

  caution: {
    text:
      "text-[var(--caution)]",

    border:
      "border-[rgba(199,155,89,0.30)]",

    background:
      "bg-[rgba(199,155,89,0.10)]",

    dot:
      "bg-[var(--caution)]",

    ring:
      "ring-[rgba(199,155,89,0.18)]",
  },

  critical: {
    text:
      "text-[var(--critical)]",

    border:
      "border-[rgba(201,105,114,0.30)]",

    background:
      "bg-[rgba(201,105,114,0.10)]",

    dot:
      "bg-[var(--critical)]",

    ring:
      "ring-[rgba(201,105,114,0.18)]",
  },

  muted: {
    text:
      "text-[var(--muted-soft)]",

    border:
      "border-[var(--border-soft)]",

    background:
      "bg-[var(--surface-1)]",

    dot:
      "bg-[var(--muted-soft)]",

    ring:
      "ring-[rgba(126,137,147,0.12)]",
  },
};


export function joinMissionClasses(
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