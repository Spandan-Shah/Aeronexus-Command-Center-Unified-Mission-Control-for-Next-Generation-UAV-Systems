import type {
  ReactNode,
} from "react";

import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Cpu,
  Database,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Network,
  Radio,
  RotateCcw,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  TimerReset,
  UserCheck,
  Wifi,
  Zap,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";


/* =========================================================
   Types
   ========================================================= */

type Tone =
  | "nominal"
  | "caution"
  | "critical"
  | "info"
  | "muted";


type SummaryMetric = {
  label: string;

  value: string;

  helper: string;

  icon: LucideIcon;

  tone: Tone;
};


type ProtocolStep = {
  step: string;

  title: string;

  description: string;

  tone: Tone;

  icon: LucideIcon;
};


type ThreatItem = {
  title: string;

  status: string;

  description: string;

  tone: Tone;

  icon: LucideIcon;
};


type AuditItem = {
  time: string;

  command: string;

  actor: string;

  direction: string;

  signature: string;

  status: Tone;
};


type AccessRole = {
  role: string;

  command: string;

  telemetry: string;

  camera: string;

  security: string;
};


type SessionNode = {
  name: string;

  role: string;

  identity: string;

  state: string;

  tone: Tone;

  icon: LucideIcon;
};


/* =========================================================
   Aerospace Graphite Tone System
   ========================================================= */

const toneClass:
  Record<
    Tone,
    {
      text: string;
      border: string;
      bg: string;
      dot: string;
    }
  > = {
  nominal: {
    text:
      "text-[var(--nominal)]",

    border:
      "border-[rgba(100,142,120,0.30)]",

    bg:
      "bg-[rgba(100,142,120,0.11)]",

    dot:
      "bg-[var(--nominal)]",
  },

  caution: {
    text:
      "text-[var(--caution)]",

    border:
      "border-[rgba(199,155,89,0.30)]",

    bg:
      "bg-[rgba(199,155,89,0.11)]",

    dot:
      "bg-[var(--caution)]",
  },

  critical: {
    text:
      "text-[var(--critical)]",

    border:
      "border-[rgba(201,105,114,0.32)]",

    bg:
      "bg-[rgba(201,105,114,0.11)]",

    dot:
      "bg-[var(--critical)]",
  },

  info: {
    text:
      "text-[var(--info)]",

    border:
      "border-[rgba(93,135,163,0.30)]",

    bg:
      "bg-[rgba(93,135,163,0.11)]",

    dot:
      "bg-[var(--info)]",
  },

  muted: {
    text:
      "text-[var(--muted-soft)]",

    border:
      "border-[var(--border)]",

    bg:
      "bg-[var(--surface-2)]",

    dot:
      "bg-[var(--muted-soft)]",
  },
};


/* =========================================================
   Summary Data
   ========================================================= */

const summaryMetrics:
  SummaryMetric[] = [
  {
    label:
      "Secure Link",

    value:
      "Active",

    helper:
      "Authenticated command channel",

    icon:
      ShieldCheck,

    tone:
      "nominal",
  },

  {
    label:
      "Session Mode",

    value:
      "GW-Proto",

    helper:
      "GoblinWisp prototype console",

    icon:
      LockKeyhole,

    tone:
      "info",
  },

  {
    label:
      "Blocked Attempts",

    value:
      "02",

    helper:
      "Replay and unsigned command blocks",

    icon:
      ShieldAlert,

    tone:
      "caution",
  },

  {
    label:
      "Active Peers",

    value:
      "03",

    helper:
      "Controller, gateway, UAV node",

    icon:
      UserCheck,

    tone:
      "nominal",
  },
];


/* =========================================================
   Secure Session Nodes
   ========================================================= */

const sessionNodes:
  SessionNode[] = [
  {
    name:
      "Ground Controller",

    role:
      "Operator command origin",

    identity:
      "GC-9F2A",

    state:
      "Trusted",

    tone:
      "nominal",

    icon:
      UserCheck,
  },

  {
    name:
      "Secure Gateway",

    role:
      "Telemetry relay + verifier",

    identity:
      "GW-21C8",

    state:
      "Verified",

    tone:
      "info",

    icon:
      ServerCog,
  },

  {
    name:
      "UAV Node",

    role:
      "Aircraft telemetry endpoint",

    identity:
      "UAV-01",

    state:
      "Bound",

    tone:
      "nominal",

    icon:
      Radio,
  },
];


/* =========================================================
   Protocol Steps
   ========================================================= */

const protocolSteps:
  ProtocolStep[] = [
  {
    step:
      "01",

    title:
      "Peer Identity",

    description:
      "Persistent peer identity is checked before accepting a secure session.",

    tone:
      "nominal",

    icon:
      Fingerprint,
  },

  {
    step:
      "02",

    title:
      "Trusted Fingerprint",

    description:
      "Previously trusted peer fingerprint continuity is compared before command exchange.",

    tone:
      "info",

    icon:
      ShieldCheck,
  },

  {
    step:
      "03",

    title:
      "Fresh Session Material",

    description:
      "Fresh session-specific material is used to derive command and telemetry contexts.",

    tone:
      "caution",

    icon:
      KeyRound,
  },

  {
    step:
      "04",

    title:
      "Directional Isolation",

    description:
      "Ground-to-UAV commands and UAV-to-ground telemetry use separate directional contexts.",

    tone:
      "nominal",

    icon:
      ArrowRightLeft,
  },

  {
    step:
      "05",

    title:
      "Replay Gate",

    description:
      "Monotonic counters and ordered validation reject stale or repeated packets.",

    tone:
      "info",

    icon:
      TimerReset,
  },

  {
    step:
      "06",

    title:
      "Rekey / Reset Safety",

    description:
      "Old state is invalidated after reset or rekey to avoid stale-session reuse.",

    tone:
      "nominal",

    icon:
      RotateCcw,
  },
];


/* =========================================================
   Threat Coverage
   ========================================================= */

const threats:
  ThreatItem[] = [
  {
    title:
      "Unsigned Command",

    status:
      "Blocked",

    description:
      "Command frame rejected because it was not marked as signed by the secure session layer.",

    tone:
      "nominal",

    icon:
      ShieldCheck,
  },

  {
    title:
      "Replay Attempt",

    status:
      "Rejected",

    description:
      "Repeated sequence counter detected. Packet is not allowed to update command state.",

    tone:
      "nominal",

    icon:
      TimerReset,
  },

  {
    title:
      "Identity Mismatch",

    status:
      "Review",

    description:
      "Unknown peer identity would require operator verification before trust continuity.",

    tone:
      "caution",

    icon:
      Fingerprint,
  },

  {
    title:
      "Link Degradation",

    status:
      "Watched",

    description:
      "Telemetry is still active, but low link quality can trigger safe command restrictions.",

    tone:
      "info",

    icon:
      Wifi,
  },
];


/* =========================================================
   Command Audit
   ========================================================= */

const auditItems:
  AuditItem[] = [
  {
    time:
      "14:24:12",

    command:
      "ARM",

    actor:
      "Operator",

    direction:
      "GC → UAV",

    signature:
      "SIG-7FA2",

    status:
      "nominal",
  },

  {
    time:
      "14:24:19",

    command:
      "TAKEOFF",

    actor:
      "Operator",

    direction:
      "GC → UAV",

    signature:
      "SIG-81C0",

    status:
      "nominal",
  },

  {
    time:
      "14:25:04",

    command:
      "REPLAYED-HOLD",

    actor:
      "Unknown",

    direction:
      "GC → UAV",

    signature:
      "BLOCKED",

    status:
      "critical",
  },

  {
    time:
      "14:25:38",

    command:
      "TELEMETRY-FRAME",

    actor:
      "UAV-01",

    direction:
      "UAV → GC",

    signature:
      "MAC-4D2E",

    status:
      "info",
  },

  {
    time:
      "14:26:10",

    command:
      "REKEY",

    actor:
      "Gateway",

    direction:
      "GW ↔ UAV",

    signature:
      "SIG-2F90",

    status:
      "caution",
  },
];


/* =========================================================
   Access Roles
   ========================================================= */

const accessRoles:
  AccessRole[] = [
  {
    role:
      "Mission Admin",

    command:
      "Full",

    telemetry:
      "Full",

    camera:
      "Full",

    security:
      "Full",
  },

  {
    role:
      "Pilot Operator",

    command:
      "Flight",

    telemetry:
      "Full",

    camera:
      "View",

    security:
      "Limited",
  },

  {
    role:
      "Observer",

    command:
      "None",

    telemetry:
      "View",

    camera:
      "View",

    security:
      "None",
  },

  {
    role:
      "Maintenance",

    command:
      "Disabled",

    telemetry:
      "Health",

    camera:
      "None",

    security:
      "Audit",
  },
];


/* =========================================================
   Shared UI
   ========================================================= */

function StatusChip({
  children,
  tone,
}: {
  children:
    ReactNode;

  tone:
    Tone;
}) {
  const style =
    toneClass[
      tone
    ];

  return (
    <span
      className={[
        "inline-flex h-9 items-center gap-2",

        "rounded-[7px] border px-3",

        "text-[12px] font-semibold",

        style.border,
        style.bg,
        style.text,
      ].join(" ")}
    >
      {children}
    </span>
  );
}


function ActionButton({
  children,
  primary = false,
}: {
  children:
    ReactNode;

  primary?:
    boolean;
}) {
  return (
    <button
      type="button"
      className={[
        "inline-flex h-10 items-center justify-center gap-2",

        "rounded-[7px] border px-3.5",

        "text-[13px] font-semibold",

        "transition-[background-color,border-color,color] duration-150",

        primary
          ? "border-[rgba(176,138,88,0.40)] bg-[rgba(176,138,88,0.14)] text-[var(--primary)] hover:bg-[rgba(176,138,88,0.21)]"
          : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}


/* =========================================================
   Page Header
   ========================================================= */

function PageHeader() {
  return (
    <section
      className={[
        "rounded-[10px]",

        "border border-[var(--border)]",

        "bg-[var(--surface-1)]",

        "p-5",

        "shadow-[0_14px_36px_rgba(0,0,0,0.18)]",
      ].join(" ")}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.085em] text-[var(--primary)]">
            Security · Command Integrity
          </p>

          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-[var(--foreground)]">
            Security Control Center
          </h1>

          <p className="mt-2 max-w-5xl text-[13px] leading-[1.65] text-[var(--muted)]">
            Monitor peer identity, secure command sessions,
            directional isolation, replay validation, access
            control and GoblinWisp prototype state across
            MissionNexus.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusChip tone="nominal">
            <ShieldCheck
              size={14}
              strokeWidth={1.7}
            />

            Secure Link Active
          </StatusChip>

          <ActionButton>
            <RotateCcw
              size={14}
              strokeWidth={1.7}
            />

            Rekey Session
          </ActionButton>

          <ActionButton primary>
            <KeyRound
              size={14}
              strokeWidth={1.7}
            />

            Rotate Key
          </ActionButton>
        </div>
      </div>
    </section>
  );
}


/* =========================================================
   Section Shell

   IMPORTANT:
   h-full + flex-col makes all cards in a grid row reach
   exactly the same bottom line.
   ========================================================= */

function SectionShell({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow:
    string;

  title:
    string;

  action?:
    string;

  children:
    ReactNode;
}) {
  return (
    <section
      className={[
        "flex h-full min-w-0 flex-col",

        "overflow-hidden rounded-[10px]",

        "border border-[var(--border)]",

        "bg-[var(--surface-1)]",

        "shadow-[0_12px_30px_rgba(0,0,0,0.16)]",
      ].join(" ")}
    >
      <div
        className={[
          "flex min-h-[76px] shrink-0 items-center",

          "border-b border-[var(--border-soft)]",

          "bg-[var(--surface-2)]",

          "px-5 py-3.5",
        ].join(" ")}
      >
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.075em] text-[var(--primary)]">
              {eyebrow}
            </p>

            <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
              {title}
            </h2>
          </div>

          {action ? (
            <span
              className={[
                "inline-flex w-fit items-center",

                "rounded-[6px] border",

                "border-[rgba(176,138,88,0.27)]",

                "bg-[rgba(176,138,88,0.09)]",

                "px-2.5 py-1",

                "text-[12px] font-semibold",

                "text-[var(--primary)]",
              ].join(" ")}
            >
              {action}
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 p-5">
        {children}
      </div>
    </section>
  );
}


/* =========================================================
   Consistent Two Column Layout

   IMPORTANT:
   Every paired row uses EXACTLY the same 2 / 1 split.
   Therefore all vertical divider positions match.
   ========================================================= */

function SecuritySplitRow({
  left,
  right,
}: {
  left:
    ReactNode;

  right:
    ReactNode;
}) {
  return (
    <div
      className={[
        "grid items-stretch gap-6",

        "xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]",
      ].join(" ")}
    >
      <div className="min-w-0">
        {left}
      </div>

      <div className="min-w-0">
        {right}
      </div>
    </div>
  );
}


/* =========================================================
   Summary Card
   ========================================================= */

function SummaryCard({
  item,
}: {
  item:
    SummaryMetric;
}) {
  const Icon =
    item.icon;

  const tone =
    toneClass[
      item.tone
    ];

  return (
    <div
      className={[
        "flex h-full min-h-[132px] flex-col",

        "rounded-[9px] border",

        "bg-[var(--surface-2)]",

        "p-4",

        "shadow-[0_8px_22px_rgba(0,0,0,0.14)]",

        tone.border,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.055em] text-[var(--muted)]">
          <Icon
            size={15}
            strokeWidth={1.65}
            className={
              tone.text
            }
          />

          {item.label}
        </div>

        <span
          className={[
            "h-2 w-2 rounded-full",

            tone.dot,
          ].join(" ")}
        />
      </div>

      <div
        className={[
          "mt-4 font-mono text-[22px] font-semibold",

          tone.text,
        ].join(" ")}
      >
        {item.value}
      </div>

      <p className="mt-auto pt-2 text-[12px] leading-[1.55] text-[var(--muted)]">
        {item.helper}
      </p>
    </div>
  );
}


/* =========================================================
   Key Value
   ========================================================= */

function KeyValue({
  label,
  value,
  tone,
}: {
  label:
    string;

  value:
    string;

  tone:
    Tone;
}) {
  const style =
    toneClass[
      tone
    ];

  return (
    <div
      className={[
        "rounded-[7px]",

        "border border-[var(--border-soft)]",

        "bg-[var(--input)]",

        "px-3 py-3",
      ].join(" ")}
    >
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">
        {label}
      </div>

      <div
        className={[
          "mt-1.5 font-mono text-[13px] font-semibold",

          style.text,
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}


/* =========================================================
   Session Node
   ========================================================= */

function SessionNodeCard({
  node,
}: {
  node:
    SessionNode;
}) {
  const Icon =
    node.icon;

  const tone =
    toneClass[
      node.tone
    ];

  return (
    <div
      className={[
        "flex h-full flex-col",

        "rounded-[9px] border",

        "bg-[var(--surface-2)]",

        "p-4",

        tone.border,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center",

              "rounded-[7px] border",

              tone.border,
              tone.bg,
            ].join(" ")}
          >
            <Icon
              size={16}
              strokeWidth={1.7}
              className={
                tone.text
              }
            />
          </div>

          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-[var(--foreground)]">
              {node.name}
            </h3>

            <p className="mt-1 text-[12px] leading-[1.55] text-[var(--muted)]">
              {node.role}
            </p>
          </div>
        </div>

        <span
          className={[
            "shrink-0 rounded-full border",

            "px-2.5 py-1",

            "font-mono text-[10px] font-semibold uppercase tracking-[0.07em]",

            tone.border,
            tone.bg,
            tone.text,
          ].join(" ")}
        >
          {node.state}
        </span>
      </div>

      <div className="mt-auto">
        <KeyValue
          label="Peer Identity"
          value={
            node.identity
          }
          tone={
            node.tone
          }
        />
      </div>
    </div>
  );
}


/* =========================================================
   Protocol Step
   ========================================================= */

function ProtocolStepCard({
  item,
}: {
  item:
    ProtocolStep;
}) {
  const Icon =
    item.icon;

  const tone =
    toneClass[
      item.tone
    ];

  return (
    <div
      className={[
        "flex h-full",

        "rounded-[9px] border",

        "bg-[var(--surface-2)]",

        "p-4",

        tone.border,
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center",

            "rounded-[7px] border",

            "font-mono text-[11px] font-semibold",

            tone.border,
            tone.bg,
            tone.text,
          ].join(" ")}
        >
          {item.step}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon
              size={14}
              strokeWidth={1.7}
              className={
                tone.text
              }
            />

            <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
              {item.title}
            </h3>
          </div>

          <p className="mt-2 text-[12px] leading-[1.6] text-[var(--muted)]">
            {item.description}
          </p>
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   Prototype Lab
   ========================================================= */

function GoblinWispPrototypeLab() {
  return (
    <div className="grid gap-5">
      <div className="grid items-stretch gap-4 xl:grid-cols-3">
        {sessionNodes.map(
          (
            node,
          ) => (
            <SessionNodeCard
              key={
                node.name
              }
              node={
                node
              }
            />
          ),
        )}
      </div>

      <div
        className={[
          "rounded-[9px]",

          "border border-[var(--border-soft)]",

          "bg-[var(--surface-2)]",

          "p-4",
        ].join(" ")}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.075em] text-[var(--primary)]">
              GoblinWisp Prototype
            </p>

            <h3 className="mt-1 text-[17px] font-semibold text-[var(--foreground)]">
              Identity-Bound Secure Session Flow
            </h3>

            <p className="mt-2 max-w-4xl text-[12px] leading-[1.65] text-[var(--muted)]">
              Prototype view showing peer validation,
              directional command and telemetry contexts,
              packet counters, and reset-safe session
              invalidation.
            </p>
          </div>

          <div className="grid shrink-0 gap-2 sm:grid-cols-3">
            <KeyValue
              label="Session"
              value="GW-SESSION-042"
              tone="info"
            />

            <KeyValue
              label="KDF State"
              value="Bound"
              tone="nominal"
            />

            <KeyValue
              label="Mode"
              value="Prototype"
              tone="caution"
            />
          </div>
        </div>
      </div>

      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {protocolSteps.map(
          (
            item,
          ) => (
            <ProtocolStepCard
              key={
                item.step
              }
              item={
                item
              }
            />
          ),
        )}
      </div>
    </div>
  );
}


/* =========================================================
   Directional Security
   ========================================================= */

function DirectionCard({
  eyebrow,
  title,
  tone,
  icon: Icon,
  fields,
}: {
  eyebrow:
    string;

  title:
    string;

  tone:
    Tone;

  icon:
    LucideIcon;

  fields:
    Array<
      [
        string,
        string,
        Tone,
      ]
    >;
}) {
  const style =
    toneClass[
      tone
    ];

  return (
    <div
      className={[
        "flex h-full flex-col",

        "rounded-[9px] border",

        "bg-[var(--surface-2)]",

        "p-4",

        style.border,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p
            className={[
              "font-mono text-[11px] font-semibold uppercase tracking-[0.11em]",

              style.text,
            ].join(" ")}
          >
            {eyebrow}
          </p>

          <h3 className="mt-1 text-[16px] font-semibold text-[var(--foreground)]">
            {title}
          </h3>
        </div>

        <Icon
          size={20}
          strokeWidth={1.6}
          className={
            style.text
          }
        />
      </div>

      <div className="mt-5 grid flex-1 content-start gap-3 sm:grid-cols-2">
        {fields.map(
          (
            [
              label,
              value,
              fieldTone,
            ],
          ) => (
            <KeyValue
              key={
                label
              }
              label={
                label
              }
              value={
                value
              }
              tone={
                fieldTone
              }
            />
          ),
        )}
      </div>
    </div>
  );
}


function DirectionalIsolationPanel() {
  return (
    <div className="grid h-full items-stretch gap-4 xl:grid-cols-2">
      <DirectionCard
        eyebrow="Command Direction"
        title="Ground Controller → UAV"
        tone="info"
        icon={
          ArrowRightLeft
        }
        fields={[
          [
            "Context",
            "CMD-CTX-A",
            "info",
          ],

          [
            "Counter",
            "000184",
            "nominal",
          ],

          [
            "MAC Tag",
            "MAC-C2A9",
            "info",
          ],

          [
            "Replay Gate",
            "Pass",
            "nominal",
          ],
        ]}
      />

      <DirectionCard
        eyebrow="Telemetry Direction"
        title="UAV → Ground Controller"
        tone="nominal"
        icon={
          Radio
        }
        fields={[
          [
            "Context",
            "TEL-CTX-B",
            "nominal",
          ],

          [
            "Counter",
            "001492",
            "nominal",
          ],

          [
            "MAC Tag",
            "MAC-9F11",
            "info",
          ],

          [
            "Replay Gate",
            "Pass",
            "nominal",
          ],
        ]}
      />
    </div>
  );
}


/* =========================================================
   Active Session Stack
   ========================================================= */

function SessionMiniCard({
  icon: Icon,
  title,
  value,
  helper,
  tone,
}: {
  icon:
    LucideIcon;

  title:
    string;

  value:
    string;

  helper:
    string;

  tone:
    Tone;
}) {
  const style =
    toneClass[
      tone
    ];

  return (
    <div
      className={[
        "flex h-full",

        "rounded-[9px] border",

        "bg-[var(--surface-2)]",

        "p-4",

        style.border,
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center",

            "rounded-[7px] border",

            style.border,
            style.bg,
          ].join(" ")}
        >
          <Icon
            size={15}
            strokeWidth={1.7}
            className={
              style.text
            }
          />
        </div>

        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
            {title}
          </h3>

          <div
            className={[
              "mt-1 font-mono text-[12px] font-semibold",

              style.text,
            ].join(" ")}
          >
            {value}
          </div>

          <p className="mt-2 text-[12px] leading-[1.6] text-[var(--muted)]">
            {helper}
          </p>
        </div>
      </div>
    </div>
  );
}


function ActiveSessionStack() {
  return (
    <div className="grid h-full auto-rows-fr gap-4">
      <SessionMiniCard
        icon={
          UserCheck
        }
        title="Operator Console"
        value="Mission Admin · Active"
        helper="Signed command authority is active for the current mission."
        tone="nominal"
      />

      <SessionMiniCard
        icon={
          ServerCog
        }
        title="Gateway Runtime"
        value="GW-21C8 · Online"
        helper="Gateway validates peer identity, packet counters and MAC state."
        tone="info"
      />

      <SessionMiniCard
        icon={
          Radio
        }
        title="UAV Secure Node"
        value="UAV-01 · Bound"
        helper="Telemetry is bound to the current directional session context."
        tone="nominal"
      />

      <SessionMiniCard
        icon={
          AlertTriangle
        }
        title="Unknown Peer"
        value="Blocked"
        helper="Unknown peer identity does not inherit command permissions."
        tone="caution"
      />
    </div>
  );
}


/* =========================================================
   Threat Coverage
   ========================================================= */

function ThreatCoveragePanel() {
  return (
    <div className="grid h-full auto-rows-fr gap-4 sm:grid-cols-2">
      {threats.map(
        (
          item,
        ) => {
          const Icon =
            item.icon;

          const tone =
            toneClass[
              item.tone
            ];

          return (
            <div
              key={
                item.title
              }
              className={[
                "flex h-full",

                "rounded-[9px] border",

                "bg-[var(--surface-2)]",

                "p-4",

                tone.border,
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center",

                    "rounded-[7px] border",

                    tone.border,
                    tone.bg,
                  ].join(" ")}
                >
                  <Icon
                    size={15}
                    strokeWidth={1.7}
                    className={
                      tone.text
                    }
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
                      {item.title}
                    </h3>

                    <span
                      className={[
                        "shrink-0 font-mono text-[10px] font-semibold uppercase",

                        tone.text,
                      ].join(" ")}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className="mt-2 text-[12px] leading-[1.6] text-[var(--muted)]">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}


/* =========================================================
   Command Audit Table
   ========================================================= */

function CommandAuditTable() {
  return (
    <div
      className={[
        "h-full overflow-x-auto",

        "rounded-[8px]",

        "border border-[var(--border-soft)]",

        "bg-[var(--surface-2)]",
      ].join(" ")}
    >
      <div className="min-w-[800px]">
        <div
          className={[
            "grid",

            "grid-cols-[110px_1.2fr_1fr_1fr_1fr_100px]",

            "border-b border-[var(--border)]",

            "bg-[var(--input)]",

            "px-4 py-3",

            "font-mono text-[10px] font-semibold uppercase tracking-[0.09em]",

            "text-[var(--muted-soft)]",
          ].join(" ")}
        >
          <span>
            Time
          </span>

          <span>
            Command
          </span>

          <span>
            Actor
          </span>

          <span>
            Direction
          </span>

          <span>
            Signature
          </span>

          <span className="text-right">
            State
          </span>
        </div>

        {auditItems.map(
          (
            item,
          ) => {
            const tone =
              toneClass[
                item.status
              ];

            return (
              <div
                key={`${item.time}-${item.command}`}
                className={[
                  "grid",

                  "grid-cols-[110px_1.2fr_1fr_1fr_1fr_100px]",

                  "border-b border-[var(--border-soft)]",

                  "px-4 py-4",

                  "text-[12px]",

                  "transition-colors",

                  "last:border-b-0",

                  "hover:bg-[var(--surface-hover)]",
                ].join(" ")}
              >
                <span className="font-mono text-[11px] text-[var(--muted)]">
                  {item.time}
                </span>

                <span className="font-medium text-[var(--foreground)]">
                  {item.command}
                </span>

                <span className="text-[var(--muted)]">
                  {item.actor}
                </span>

                <span className="font-mono text-[11px] text-[var(--info)]">
                  {item.direction}
                </span>

                <span className="font-mono text-[11px] text-[var(--muted)]">
                  {item.signature}
                </span>

                <span
                  className={[
                    "text-right font-mono text-[11px]",

                    tone.text,
                  ].join(" ")}
                >
                  {item.status}
                </span>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}


/* =========================================================
   Access Matrix
   ========================================================= */

function AccessMatrix() {
  return (
    <div
      className={[
        "overflow-x-auto",

        "rounded-[8px]",

        "border border-[var(--border-soft)]",

        "bg-[var(--surface-2)]",
      ].join(" ")}
    >
      <div className="min-w-[720px]">
        <div
          className={[
            "grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr]",

            "border-b border-[var(--border)]",

            "bg-[var(--input)]",

            "px-4 py-3",

            "font-mono text-[10px] font-semibold uppercase tracking-[0.09em]",

            "text-[var(--muted-soft)]",
          ].join(" ")}
        >
          <span>
            Role
          </span>

          <span>
            Command
          </span>

          <span>
            Telemetry
          </span>

          <span>
            Camera
          </span>

          <span>
            Security
          </span>
        </div>

        {accessRoles.map(
          (
            role,
          ) => (
            <div
              key={
                role.role
              }
              className={[
                "grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr]",

                "border-b border-[var(--border-soft)]",

                "px-4 py-4",

                "text-[12px]",

                "transition-colors",

                "last:border-b-0",

                "hover:bg-[var(--surface-hover)]",
              ].join(" ")}
            >
              <span className="font-medium text-[var(--foreground)]">
                {role.role}
              </span>

              <span className="text-[var(--muted)]">
                {role.command}
              </span>

              <span className="text-[var(--muted)]">
                {role.telemetry}
              </span>

              <span className="text-[var(--muted)]">
                {role.camera}
              </span>

              <span className="text-[var(--muted)]">
                {role.security}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}


/* =========================================================
   Security Primitive
   ========================================================= */

function SecurityPrimitive({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon:
    LucideIcon;

  label:
    string;

  value:
    string;

  helper:
    string;

  tone:
    Tone;
}) {
  const style =
    toneClass[
      tone
    ];

  return (
    <div
      className={[
        "flex h-full min-h-[154px] flex-col",

        "rounded-[9px] border",

        "bg-[var(--surface-2)]",

        "p-4",

        "shadow-[0_7px_20px_rgba(0,0,0,0.12)]",

        style.border,
      ].join(" ")}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.065em] text-[var(--muted)]">
        <Icon
          size={14}
          strokeWidth={1.7}
          className={
            style.text
          }
        />

        {label}
      </div>

      <div
        className={[
          "mt-3 font-mono text-[18px] font-semibold",

          style.text,
        ].join(" ")}
      >
        {value}
      </div>

      <p className="mt-auto pt-2 text-[12px] leading-[1.6] text-[var(--muted)]">
        {helper}
      </p>
    </div>
  );
}


/* =========================================================
   Security Health
   ========================================================= */

function SecurityHealthGrid() {
  return (
    <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SecurityPrimitive
        icon={
          Fingerprint
        }
        label="Peer Identity"
        value="Trusted"
        helper="Known peer identities are accepted in the current prototype state."
        tone="nominal"
      />

      <SecurityPrimitive
        icon={
          ArrowRightLeft
        }
        label="Directional Isolation"
        value="Enabled"
        helper="Command and telemetry directions use separate session contexts."
        tone="info"
      />

      <SecurityPrimitive
        icon={
          Database
        }
        label="Replay Store"
        value="Clean"
        helper="No valid stale sequence is accepted into command state."
        tone="nominal"
      />

      <SecurityPrimitive
        icon={
          Cpu
        }
        label="Prototype Mode"
        value="GoblinWisp"
        helper="Security model is presented as a prototype for validation and demonstrations."
        tone="caution"
      />
    </div>
  );
}


/* =========================================================
   Page
   ========================================================= */

export function Security() {
  return (
    <div className="min-h-[calc(100vh-70px)] bg-transparent px-5 py-6 sm:px-6 lg:px-8">
      <div
        className={[
          "mx-auto flex w-full max-w-[1680px] flex-col",

          "gap-6",
        ].join(" ")}
      >
        {/* ===============================================
            Header
            =============================================== */}

        <PageHeader />


        {/* ===============================================
            Summary Metrics
            =============================================== */}

        <section className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryMetrics.map(
            (
              item,
            ) => (
              <SummaryCard
                key={
                  item.label
                }
                item={
                  item
                }
              />
            ),
          )}
        </section>


        {/* ===============================================
            Prototype Lab
            =============================================== */}

        <SectionShell
          eyebrow="Prototype Lab"
          title="GoblinWisp Secure Session Prototype"
          action="Direct UI Prototype"
        >
          <GoblinWispPrototypeLab />
        </SectionShell>


        {/* ===============================================
            ROW 1

            Same 2 / 1 column ratio used everywhere.
            Both outer boxes stretch to same height.
            =============================================== */}

        <SecuritySplitRow
          left={
            <SectionShell
              eyebrow="Directional Security Context"
              title="Command / Telemetry Isolation"
              action="Two Contexts"
            >
              <DirectionalIsolationPanel />
            </SectionShell>
          }
          right={
            <SectionShell
              eyebrow="Active Sessions"
              title="Peer Session Stack"
              action="4 Entries"
            >
              <ActiveSessionStack />
            </SectionShell>
          }
        />


        {/* ===============================================
            ROW 2

            EXACT SAME vertical column divider as row 1.
            =============================================== */}

        <SecuritySplitRow
          left={
            <SectionShell
              eyebrow="Command Integrity"
              title="Signed Command Audit"
              action="Latest Frames"
            >
              <CommandAuditTable />
            </SectionShell>
          }
          right={
            <SectionShell
              eyebrow="Threat Coverage"
              title="Security Resistance View"
              action="Prototype Checks"
            >
              <ThreatCoveragePanel />
            </SectionShell>
          }
        />


        {/* ===============================================
            Authorization
            =============================================== */}

        <SectionShell
          eyebrow="Authorization"
          title="Role-Based Access Control Matrix"
          action="Operator Permissions"
        >
          <AccessMatrix />
        </SectionShell>


        {/* ===============================================
            Security Health
            =============================================== */}

        <SecurityHealthGrid />


        {/* ===============================================
            Final Security Primitives
            =============================================== */}

        <section className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SecurityPrimitive
            icon={
              Network
            }
            label="Transport"
            value="Agnostic"
            helper="Prototype can represent radio, mesh, Wi-Fi or wired transport."
            tone="info"
          />

          <SecurityPrimitive
            icon={
              Activity
            }
            label="Session Continuity"
            value="Stable"
            helper="Current session is continuous with no reset conflict."
            tone="nominal"
          />

          <SecurityPrimitive
            icon={
              Zap
            }
            label="Emergency Command"
            value="Guarded"
            helper="Critical commands remain behind confirmation and audit checks."
            tone="caution"
          />

          <SecurityPrimitive
            icon={
              ShieldCheck
            }
            label="Human Review"
            value="Required"
            helper="MissionNexus assists the operator but does not replace authorization."
            tone="nominal"
          />
        </section>
      </div>
    </div>
  );
}