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

export const MISSION_TONE_CLASSES: Record<
  MissionTone,
  MissionToneClasses
> = {
  default: {
    text: "text-[var(--foreground)]",
    border: "border-[var(--border-soft)]",
    background: "bg-white/[0.025]",
    dot: "bg-white/35",
    ring: "ring-white/10",
  },

  primary: {
    text: "text-[var(--primary)]",
    border: "border-[rgba(246,178,60,0.28)]",
    background: "bg-[rgba(246,178,60,0.075)]",
    dot: "bg-[var(--primary)]",
    ring: "ring-[rgba(246,178,60,0.18)]",
  },

  info: {
    text: "text-[var(--info)]",
    border: "border-[rgba(90,169,255,0.28)]",
    background: "bg-[rgba(90,169,255,0.07)]",
    dot: "bg-[var(--info)]",
    ring: "ring-[rgba(90,169,255,0.16)]",
  },

  nominal: {
    text: "text-[var(--nominal)]",
    border: "border-[rgba(89,217,154,0.28)]",
    background: "bg-[rgba(89,217,154,0.07)]",
    dot: "bg-[var(--nominal)]",
    ring: "ring-[rgba(89,217,154,0.16)]",
  },

  caution: {
    text: "text-[var(--caution)]",
    border: "border-[rgba(246,178,60,0.32)]",
    background: "bg-[rgba(246,178,60,0.08)]",
    dot: "bg-[var(--caution)]",
    ring: "ring-[rgba(246,178,60,0.18)]",
  },

  critical: {
    text: "text-[var(--critical)]",
    border: "border-[rgba(255,90,99,0.32)]",
    background: "bg-[rgba(255,90,99,0.075)]",
    dot: "bg-[var(--critical)]",
    ring: "ring-[rgba(255,90,99,0.18)]",
  },

  muted: {
    text: "text-[var(--muted)]",
    border: "border-[var(--border-soft)]",
    background: "bg-[var(--surface-0)]",
    dot: "bg-[var(--muted-soft)]",
    ring: "ring-white/5",
  },
};

export function joinMissionClasses(
  ...classes: Array<
    string | false | null | undefined
  >
) {
  return classes
    .filter(Boolean)
    .join(" ");
}