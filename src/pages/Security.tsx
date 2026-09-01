import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
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
import type { LucideIcon } from "lucide-react";

type Tone = "nominal" | "caution" | "critical" | "info" | "muted";

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

const toneClass = {
  nominal: {
    text: "text-(--nominal)",
    border: "border-[rgba(73,229,143,0.28)]",
    bg: "bg-[rgba(73,229,143,0.08)]",
    dot: "bg-(--nominal)",
    soft: "bg-[rgba(73,229,143,0.045)]",
  },
  caution: {
    text: "text-(--primary)",
    border: "border-[rgba(246,178,60,0.34)]",
    bg: "bg-[rgba(246,178,60,0.08)]",
    dot: "bg-(--primary)",
    soft: "bg-[rgba(246,178,60,0.045)]",
  },
  critical: {
    text: "text-(--critical)",
    border: "border-[rgba(255,77,77,0.36)]",
    bg: "bg-[rgba(255,77,77,0.08)]",
    dot: "bg-(--critical)",
    soft: "bg-[rgba(255,77,77,0.045)]",
  },
  info: {
    text: "text-(--info)",
    border: "border-[rgba(90,169,255,0.3)]",
    bg: "bg-[rgba(90,169,255,0.08)]",
    dot: "bg-(--info)",
    soft: "bg-[rgba(90,169,255,0.045)]",
  },
  muted: {
    text: "text-(--muted)",
    border: "border-[#1d2533]",
    bg: "bg-[#070a10]",
    dot: "bg-(--muted)",
    soft: "bg-[#070a10]",
  },
};

const summaryMetrics: SummaryMetric[] = [
  {
    label: "Secure Link",
    value: "Active",
    helper: "Authenticated command channel",
    icon: ShieldCheck,
    tone: "nominal",
  },
  {
    label: "Session Mode",
    value: "GW-Proto",
    helper: "GoblinWisp prototype console",
    icon: LockKeyhole,
    tone: "info",
  },
  {
    label: "Blocked Attempts",
    value: "02",
    helper: "Replay and unsigned command blocks",
    icon: ShieldAlert,
    tone: "caution",
  },
  {
    label: "Active Peers",
    value: "03",
    helper: "Controller, gateway, UAV node",
    icon: UserCheck,
    tone: "nominal",
  },
];

const sessionNodes: SessionNode[] = [
  {
    name: "Ground Controller",
    role: "Operator command origin",
    identity: "GC-9F2A",
    state: "Trusted",
    tone: "nominal",
    icon: UserCheck,
  },
  {
    name: "Secure Gateway",
    role: "Telemetry relay + verifier",
    identity: "GW-21C8",
    state: "Verified",
    tone: "info",
    icon: ServerCog,
  },
  {
    name: "UAV Node",
    role: "Aircraft telemetry endpoint",
    identity: "UAV-01",
    state: "Bound",
    tone: "nominal",
    icon: Radio,
  },
];

const protocolSteps: ProtocolStep[] = [
  {
    step: "01",
    title: "Peer Identity",
    description:
      "Persistent peer identity is checked before accepting a secure session.",
    tone: "nominal",
    icon: Fingerprint,
  },
  {
    step: "02",
    title: "Trusted Fingerprint",
    description:
      "Previously trusted peer fingerprint continuity is compared before command exchange.",
    tone: "info",
    icon: ShieldCheck,
  },
  {
    step: "03",
    title: "Fresh Session Material",
    description:
      "Fresh session-specific material is used to derive command and telemetry contexts.",
    tone: "caution",
    icon: KeyRound,
  },
  {
    step: "04",
    title: "Directional Isolation",
    description:
      "Ground-to-UAV commands and UAV-to-ground telemetry use separate directional contexts.",
    tone: "nominal",
    icon: ArrowRightLeft,
  },
  {
    step: "05",
    title: "Replay Gate",
    description:
      "Monotonic counters and ordered validation reject stale or repeated packets.",
    tone: "info",
    icon: TimerReset,
  },
  {
    step: "06",
    title: "Rekey / Reset Safety",
    description:
      "Old state is invalidated after reset or rekey to avoid stale-session reuse.",
    tone: "nominal",
    icon: RotateCcw,
  },
];

const threats: ThreatItem[] = [
  {
    title: "Unsigned Command",
    status: "Blocked",
    description:
      "Command frame rejected because it was not marked as signed by the secure session layer.",
    tone: "nominal",
    icon: ShieldCheck,
  },
  {
    title: "Replay Attempt",
    status: "Rejected",
    description:
      "Repeated sequence counter detected. Packet is not allowed to update command state.",
    tone: "nominal",
    icon: TimerReset,
  },
  {
    title: "Identity Mismatch",
    status: "Review",
    description:
      "Unknown peer identity would require operator verification before trust continuity.",
    tone: "caution",
    icon: Fingerprint,
  },
  {
    title: "Link Degradation",
    status: "Watched",
    description:
      "Telemetry is still active, but low link quality can trigger safe command restrictions.",
    tone: "info",
    icon: Wifi,
  },
];

const auditItems: AuditItem[] = [
  {
    time: "14:24:12",
    command: "ARM",
    actor: "Operator",
    direction: "GC → UAV",
    signature: "SIG-7FA2",
    status: "nominal",
  },
  {
    time: "14:24:19",
    command: "TAKEOFF",
    actor: "Operator",
    direction: "GC → UAV",
    signature: "SIG-81C0",
    status: "nominal",
  },
  {
    time: "14:25:04",
    command: "REPLAYED-HOLD",
    actor: "Unknown",
    direction: "GC → UAV",
    signature: "BLOCKED",
    status: "critical",
  },
  {
    time: "14:25:38",
    command: "TELEMETRY-FRAME",
    actor: "UAV-01",
    direction: "UAV → GC",
    signature: "MAC-4D2E",
    status: "info",
  },
  {
    time: "14:26:10",
    command: "REKEY",
    actor: "Gateway",
    direction: "GW ↔ UAV",
    signature: "SIG-2F90",
    status: "caution",
  },
];

const accessRoles: AccessRole[] = [
  {
    role: "Mission Admin",
    command: "Full",
    telemetry: "Full",
    camera: "Full",
    security: "Full",
  },
  {
    role: "Pilot Operator",
    command: "Flight",
    telemetry: "Full",
    camera: "View",
    security: "Limited",
  },
  {
    role: "Observer",
    command: "None",
    telemetry: "View",
    camera: "View",
    security: "None",
  },
  {
    role: "Maintenance",
    command: "Disabled",
    telemetry: "Health",
    camera: "None",
    security: "Audit",
  },
];

function PageHeader() {
  return (
    <section className="rounded-xl border border-[#1d2533] bg-[#07111f] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-(--primary)">
            Aerial Intelligence
          </p>

          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-(--foreground)">
            Security Control Center
          </h1>

          <p className="mt-2 max-w-5xl text-[14px] leading-relaxed text-(--muted)">
            Secure peer identity, command signing, directional session isolation,
            replay validation, access control, active sessions, and GoblinWisp
            prototype verification for UAV command and telemetry exchange.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-11 items-center gap-2 rounded border border-[rgba(73,229,143,0.28)] bg-[rgba(73,229,143,0.08)] px-4 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-(--nominal)">
            <ShieldCheck size={14} />
            Secure Link Active
          </span>

          <button
            type="button"
            className="flex h-11 items-center gap-2 rounded border border-[#2a3547] bg-black px-4 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-(--foreground) transition hover:border-(--primary) hover:text-(--primary)"
          >
            <RotateCcw size={14} />
            Rekey Session
          </button>

          <button
            type="button"
            className="flex h-11 items-center gap-2 rounded bg-(--primary) px-4 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-black transition hover:opacity-90"
          >
            <KeyRound size={14} />
            Rotate Key
          </button>
        </div>
      </div>
    </section>
  );
}

function SectionShell({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#1d2533] bg-black shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="border-b border-[#151923] px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-(--primary)">
              {eyebrow}
            </p>

            <h2 className="mt-1 text-[18px] font-semibold leading-tight text-(--foreground)">
              {title}
            </h2>
          </div>

          {action && (
            <span className="inline-flex w-fit rounded-full border border-[#243147] bg-[#07111f] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--info)">
              {action}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function SummaryCard({ item }: { item: SummaryMetric }) {
  const Icon = item.icon;
  const tone = toneClass[item.tone];

  return (
    <div className={`rounded-xl border bg-[#070a10] p-4 ${tone.border}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--muted)">
          <Icon size={14} className={tone.text} />
          {item.label}
        </div>

        <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
      </div>

      <div
        className={`mt-4 font-mono text-[22px] font-bold uppercase ${tone.text}`}
      >
        {item.value}
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
        {item.helper}
      </p>
    </div>
  );
}

function SessionNodeCard({ node }: { node: SessionNode }) {
  const Icon = node.icon;
  const tone = toneClass[node.tone];

  return (
    <div className={`rounded-xl border bg-[#070a10] p-4 ${tone.border}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`rounded-lg border p-2 ${tone.border} ${tone.bg}`}>
            <Icon size={16} className={tone.text} />
          </div>

          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-(--foreground)">
              {node.name}
            </h3>

            <p className="mt-1 text-[12px] leading-relaxed text-(--muted)">
              {node.role}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em] ${tone.border} ${tone.bg} ${tone.text}`}
        >
          {node.state}
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-[#1d2533] bg-black px-3 py-3">
        <div className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-(--muted)">
          Peer Identity
        </div>

        <div className={`mt-1 font-mono text-[14px] font-bold ${tone.text}`}>
          {node.identity}
        </div>
      </div>
    </div>
  );
}

function ProtocolStepCard({ item }: { item: ProtocolStep }) {
  const Icon = item.icon;
  const tone = toneClass[item.tone];

  return (
    <div className={`rounded-xl border bg-[#070a10] p-4 ${tone.border}`}>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border font-mono text-[10px] font-bold ${tone.border} ${tone.bg} ${tone.text}`}
        >
          {item.step}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon size={14} className={tone.text} />

            <h3 className="text-[14px] font-semibold text-(--foreground)">
              {item.title}
            </h3>
          </div>

          <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
            {item.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function DirectionalIsolationPanel() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-xl border border-[rgba(90,169,255,0.3)] bg-[#070a10] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-(--info)">
              Command Direction
            </p>

            <h3 className="mt-1 text-[16px] font-semibold text-(--foreground)">
              Ground Controller → UAV
            </h3>
          </div>

          <ArrowRightLeft size={20} className="text-(--info)" />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <KeyValue label="Context" value="CMD-CTX-A" tone="info" />
          <KeyValue label="Counter" value="000184" tone="nominal" />
          <KeyValue label="MAC Tag" value="MAC-C2A9" tone="info" />
          <KeyValue label="Replay Gate" value="Pass" tone="nominal" />
        </div>
      </div>

      <div className="rounded-xl border border-[rgba(73,229,143,0.28)] bg-[#070a10] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-(--nominal)">
              Telemetry Direction
            </p>

            <h3 className="mt-1 text-[16px] font-semibold text-(--foreground)">
              UAV → Ground Controller
            </h3>
          </div>

          <Radio size={20} className="text-(--nominal)" />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <KeyValue label="Context" value="TEL-CTX-B" tone="nominal" />
          <KeyValue label="Counter" value="001492" tone="nominal" />
          <KeyValue label="MAC Tag" value="MAC-9F11" tone="info" />
          <KeyValue label="Replay Gate" value="Pass" tone="nominal" />
        </div>
      </div>
    </div>
  );
}

function KeyValue({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: Tone;
}) {
  const toneStyle = toneClass[tone];

  return (
    <div className="rounded-lg border border-[#1d2533] bg-black px-3 py-3">
      <div className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-(--muted)">
        {label}
      </div>

      <div className={`mt-1 font-mono text-[13px] font-bold ${toneStyle.text}`}>
        {value}
      </div>
    </div>
  );
}

function GoblinWispPrototypeLab() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 xl:grid-cols-3">
        {sessionNodes.map((node) => (
          <SessionNodeCard key={node.name} node={node} />
        ))}
      </div>

      <div className="rounded-xl border border-[#1d2533] bg-[#070a10] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-(--primary)">
              GoblinWisp Prototype
            </p>

            <h3 className="mt-1 text-[17px] font-semibold text-(--foreground)">
              Identity-Bound Secure Session Flow
            </h3>

            <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-(--muted)">
              Prototype view for showing how the dashboard validates peer
              identity, separates command and telemetry contexts, checks packet
              counters, and handles rekey or reset-safe session invalidation.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <KeyValue label="Session" value="GW-SESSION-042" tone="info" />
            <KeyValue label="KDF State" value="Bound" tone="nominal" />
            <KeyValue label="Mode" value="Prototype" tone="caution" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {protocolSteps.map((item) => (
          <ProtocolStepCard key={item.step} item={item} />
        ))}
      </div>
    </div>
  );
}

function ThreatCoveragePanel() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {threats.map((item) => {
        const Icon = item.icon;
        const tone = toneClass[item.tone];

        return (
          <div
            key={item.title}
            className={`rounded-xl border bg-[#070a10] p-4 ${tone.border}`}
          >
            <div className="flex items-start gap-3">
              <div className={`rounded-lg border p-2 ${tone.border} ${tone.bg}`}>
                <Icon size={15} className={tone.text} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[14px] font-semibold text-(--foreground)">
                    {item.title}
                  </h3>

                  <span
                    className={`shrink-0 font-mono text-[8px] font-bold uppercase ${tone.text}`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
                  {item.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CommandAuditTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1d2533] bg-[#070a10]">
      <div className="grid grid-cols-[110px_1.2fr_1fr_1fr_1fr_100px] border-b border-[#1d2533] bg-black px-4 py-3 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--muted)">
        <span>Time</span>
        <span>Command</span>
        <span>Actor</span>
        <span>Direction</span>
        <span>Signature</span>
        <span className="text-right">State</span>
      </div>

      {auditItems.map((item) => {
        const tone = toneClass[item.status];

        return (
          <div
            key={`${item.time}-${item.command}`}
            className="grid grid-cols-[110px_1.2fr_1fr_1fr_1fr_100px] border-b border-[#1d2533] px-4 py-4 text-[13px] last:border-b-0"
          >
            <span className="font-mono text-[11px] text-(--muted)">
              {item.time}
            </span>

            <span className="font-medium text-(--foreground)">
              {item.command}
            </span>

            <span className="text-(--muted)">{item.actor}</span>

            <span className="font-mono text-[11px] text-(--info)">
              {item.direction}
            </span>

            <span className="font-mono text-[11px] text-(--muted)">
              {item.signature}
            </span>

            <span className={`text-right font-mono text-[11px] ${tone.text}`}>
              {item.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AccessMatrix() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1d2533] bg-[#070a10]">
      <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] border-b border-[#1d2533] bg-black px-4 py-3 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--muted)">
        <span>Role</span>
        <span>Command</span>
        <span>Telemetry</span>
        <span>Camera</span>
        <span>Security</span>
      </div>

      {accessRoles.map((role) => (
        <div
          key={role.role}
          className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] border-b border-[#1d2533] px-4 py-4 text-[13px] last:border-b-0"
        >
          <span className="font-medium text-(--foreground)">{role.role}</span>
          <span className="text-(--muted)">{role.command}</span>
          <span className="text-(--muted)">{role.telemetry}</span>
          <span className="text-(--muted)">{role.camera}</span>
          <span className="text-(--muted)">{role.security}</span>
        </div>
      ))}
    </div>
  );
}

function ActiveSessionStack() {
  return (
    <div className="grid gap-4">
      <SessionMiniCard
        icon={UserCheck}
        title="Operator Console"
        value="Spandan · Mission Admin"
        helper="Signed command authority is active for current mock mission."
        tone="nominal"
      />

      <SessionMiniCard
        icon={ServerCog}
        title="Gateway Runtime"
        value="GW-21C8 · Online"
        helper="Gateway validates peer identity, packet counters, and MAC state."
        tone="info"
      />

      <SessionMiniCard
        icon={Radio}
        title="UAV Secure Node"
        value="UAV-01 · Bound"
        helper="Telemetry channel is bound to the current directional context."
        tone="nominal"
      />

      <SessionMiniCard
        icon={AlertTriangle}
        title="Unknown Peer"
        value="Blocked"
        helper="Unknown peer identity does not inherit command permissions."
        tone="caution"
      />
    </div>
  );
}

function SessionMiniCard({
  icon: Icon,
  title,
  value,
  helper,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  helper: string;
  tone: Tone;
}) {
  const toneStyle = toneClass[tone];

  return (
    <div className={`rounded-xl border bg-[#070a10] p-4 ${toneStyle.border}`}>
      <div className="flex items-start gap-3">
        <div className={`rounded-lg border p-2 ${toneStyle.border} ${toneStyle.bg}`}>
          <Icon size={15} className={toneStyle.text} />
        </div>

        <div>
          <h3 className="text-[14px] font-semibold text-(--foreground)">
            {title}
          </h3>

          <div className={`mt-1 font-mono text-[12px] font-bold ${toneStyle.text}`}>
            {value}
          </div>

          <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
            {helper}
          </p>
        </div>
      </div>
    </div>
  );
}

function SecurityHealthGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SecurityPrimitive
        icon={Fingerprint}
        label="Peer Identity"
        value="Trusted"
        helper="Known peer identities are accepted in current prototype state."
        tone="nominal"
      />

      <SecurityPrimitive
        icon={ArrowRightLeft}
        label="Directional Isolation"
        value="Enabled"
        helper="Command and telemetry directions use separate context displays."
        tone="info"
      />

      <SecurityPrimitive
        icon={Database}
        label="Replay Store"
        value="Clean"
        helper="No valid stale sequence is accepted into command state."
        tone="nominal"
      />

      <SecurityPrimitive
        icon={Cpu}
        label="Prototype Mode"
        value="GoblinWisp"
        helper="Security model is shown as a UI prototype for investor/demo review."
        tone="caution"
      />
    </div>
  );
}

function SecurityPrimitive({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  tone: Tone;
}) {
  const toneStyle = toneClass[tone];

  return (
    <div className={`rounded-xl border bg-black p-4 ${toneStyle.border}`}>
      <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--muted)">
        <Icon size={13} className={toneStyle.text} />
        {label}
      </div>

      <div
        className={`mt-3 font-mono text-[18px] font-bold uppercase ${toneStyle.text}`}
      >
        {value}
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
        {helper}
      </p>
    </div>
  );
}

export function Security() {
  return (
    <div className="min-h-screen bg-[#09090b] px-5 py-6">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
        <PageHeader />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryMetrics.map((item) => (
            <SummaryCard key={item.label} item={item} />
          ))}
        </section>

        <SectionShell
          eyebrow="Prototype Lab"
          title="GoblinWisp Secure Session Prototype"
          action="Direct UI Prototype"
        >
          <GoblinWispPrototypeLab />
        </SectionShell>

        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <SectionShell
              eyebrow="Directional Crypto Context"
              title="Command / Telemetry Isolation"
              action="Two Contexts"
            >
              <DirectionalIsolationPanel />
            </SectionShell>
          </div>

          <div className="xl:col-span-4">
            <SectionShell
              eyebrow="Active Sessions"
              title="Peer Session Stack"
              action="4 Entries"
            >
              <ActiveSessionStack />
            </SectionShell>
          </div>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <SectionShell
              eyebrow="Command Integrity"
              title="Signed Command Audit"
              action="Latest Frames"
            >
              <CommandAuditTable />
            </SectionShell>
          </div>

          <div className="xl:col-span-5">
            <SectionShell
              eyebrow="Threat Coverage"
              title="Attack Resistance View"
              action="Prototype Checks"
            >
              <ThreatCoveragePanel />
            </SectionShell>
          </div>
        </div>

        <SectionShell
          eyebrow="Authorization"
          title="Role-Based Access Control Matrix"
          action="Operator Permissions"
        >
          <AccessMatrix />
        </SectionShell>

        <SecurityHealthGrid />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SecurityPrimitive
            icon={Network}
            label="Transport"
            value="Agnostic"
            helper="Prototype view can represent Wi-Fi, radio, mesh, or wired transport."
            tone="info"
          />

          <SecurityPrimitive
            icon={Activity}
            label="Session Continuity"
            value="Stable"
            helper="Current mock session is continuous with no reset conflict."
            tone="nominal"
          />

          <SecurityPrimitive
            icon={Zap}
            label="Emergency Command"
            value="Guarded"
            helper="Critical commands remain behind confirmation and audit checks."
            tone="caution"
          />

          <SecurityPrimitive
            icon={ShieldCheck}
            label="Human Review"
            value="Required"
            helper="Security UI assists the operator but does not replace authorization."
            tone="nominal"
          />
        </section>
      </div>
    </div>
  );
}