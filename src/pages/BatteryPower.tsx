import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Battery,
  BatteryCharging,
  CheckCircle2,
  Clock3,
  Cpu,
  Download,
  Gauge,
  PlugZap,
  Radio,
  RotateCcw,
  ShieldCheck,
  Thermometer,
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

type BatteryPack = {
  name: string;
  role: string;
  soc: number;
  voltage: string;
  current: string;
  temp: string;
  health: string;
  cycles: string;
  estimate: string;
  tone: Tone;
};

type PowerSample = {
  time: string;
  soc: number;
  voltage: number;
  current: number;
  power: number;
  temp: number;
};

type PowerChannel = {
  name: string;
  watts: number;
  helper: string;
  tone: Tone;
};

type PowerAlert = {
  title: string;
  message: string;
  source: string;
  tone: Tone;
  icon: LucideIcon;
};

const powerSamples: PowerSample[] = [
  { time: "T-21", soc: 84, voltage: 16.3, current: 8.2, power: 134, temp: 39 },
  { time: "T-18", soc: 82, voltage: 16.2, current: 9.8, power: 159, temp: 41 },
  { time: "T-15", soc: 80, voltage: 16.1, current: 12.4, power: 200, temp: 43 },
  { time: "T-12", soc: 78, voltage: 16.0, current: 15.1, power: 242, temp: 46 },
  { time: "T-09", soc: 76, voltage: 15.9, current: 17.8, power: 283, temp: 49 },
  { time: "T-06", soc: 74, voltage: 15.8, current: 18.9, power: 299, temp: 52 },
  { time: "T-03", soc: 73, voltage: 15.8, current: 17.2, power: 272, temp: 53 },
  { time: "Now", soc: 72, voltage: 15.7, current: 18.4, power: 289, temp: 54 },
];

const batteryPacks: BatteryPack[] = [
  {
    name: "Main Pack A",
    role: "Propulsion bus",
    soc: 72,
    voltage: "15.7 V",
    current: "18.4 A",
    temp: "54°C",
    health: "91%",
    cycles: "126",
    estimate: "18 min",
    tone: "caution",
  },
  {
    name: "Reserve Pack B",
    role: "Return-to-home reserve",
    soc: 88,
    voltage: "16.1 V",
    current: "1.8 A",
    temp: "37°C",
    health: "96%",
    cycles: "84",
    estimate: "Standby",
    tone: "nominal",
  },
  {
    name: "Payload Rail",
    role: "Camera + AI module",
    soc: 64,
    voltage: "12.2 V",
    current: "5.6 A",
    temp: "46°C",
    health: "89%",
    cycles: "141",
    estimate: "27 min",
    tone: "info",
  },
  {
    name: "Comms Rail",
    role: "Telemetry + secure link",
    soc: 79,
    voltage: "5.1 V",
    current: "2.4 A",
    temp: "42°C",
    health: "94%",
    cycles: "102",
    estimate: "41 min",
    tone: "nominal",
  },
];

const powerChannels: PowerChannel[] = [
  {
    name: "Propulsion",
    watts: 289,
    helper: "Motors + ESC load",
    tone: "caution",
  },
  {
    name: "Payload",
    watts: 68,
    helper: "Camera + AI compute",
    tone: "info",
  },
  {
    name: "Avionics",
    watts: 42,
    helper: "Flight controller + sensors",
    tone: "nominal",
  },
  {
    name: "Telemetry",
    watts: 28,
    helper: "Radio + secure session",
    tone: "nominal",
  },
  {
    name: "Auxiliary",
    watts: 14,
    helper: "Indicators + spare rail",
    tone: "muted",
  },
];

const powerAlerts: PowerAlert[] = [
  {
    title: "ESC temperature watch",
    message: "Main pack thermal load is rising. Continue monitoring before extended hover.",
    source: "Power Monitor",
    tone: "caution",
    icon: Thermometer,
  },
  {
    title: "Reserve pack healthy",
    message: "Return-to-home reserve remains above safety threshold.",
    source: "Battery Guard",
    tone: "nominal",
    icon: ShieldCheck,
  },
  {
    title: "Payload rail active",
    message: "Camera and AI compute rail is drawing stable current.",
    source: "Payload Bus",
    tone: "info",
    icon: Cpu,
  },
];

const toneClass = {
  nominal: {
    text: "text-(--nominal)",
    border: "border-[rgba(73,229,143,0.28)]",
    bg: "bg-[rgba(73,229,143,0.08)]",
    fill: "bg-(--nominal)",
    stroke: "var(--nominal)",
  },
  caution: {
    text: "text-(--primary)",
    border: "border-[rgba(246,178,60,0.32)]",
    bg: "bg-[rgba(246,178,60,0.08)]",
    fill: "bg-(--primary)",
    stroke: "var(--primary)",
  },
  critical: {
    text: "text-(--critical)",
    border: "border-[rgba(255,77,77,0.34)]",
    bg: "bg-[rgba(255,77,77,0.08)]",
    fill: "bg-(--critical)",
    stroke: "var(--critical)",
  },
  info: {
    text: "text-(--info)",
    border: "border-[rgba(90,169,255,0.3)]",
    bg: "bg-[rgba(90,169,255,0.08)]",
    fill: "bg-(--info)",
    stroke: "var(--info)",
  },
  muted: {
    text: "text-(--muted)",
    border: "border-[#1d2533]",
    bg: "bg-[#070a10]",
    fill: "bg-(--muted)",
    stroke: "var(--muted)",
  },
};

const latestSample = powerSamples[powerSamples.length - 1];
const averagePower = Math.round(
  powerSamples.reduce((sum, point) => sum + point.power, 0) / powerSamples.length
);
const averageTemp =
  Math.round(
    (powerSamples.reduce((sum, point) => sum + point.temp, 0) /
      powerSamples.length) *
      10
  ) / 10;
const peakPower = Math.max(...powerSamples.map((point) => point.power));
const totalPower = powerChannels.reduce((sum, channel) => sum + channel.watts, 0);

const summaryMetrics: SummaryMetric[] = [
  {
    label: "Main Battery",
    value: `${latestSample.soc}%`,
    helper: "Current state of charge",
    icon: Battery,
    tone: "caution",
  },
  {
    label: "Power Draw",
    value: `${latestSample.power} W`,
    helper: `Average ${averagePower} W`,
    icon: Zap,
    tone: "info",
  },
  {
    label: "Pack Voltage",
    value: `${latestSample.voltage.toFixed(1)} V`,
    helper: "4S battery bus",
    icon: BatteryCharging,
    tone: "nominal",
  },
  {
    label: "Thermal State",
    value: `${latestSample.temp}°C`,
    helper: `Average ${averageTemp}°C`,
    icon: Thermometer,
    tone: "caution",
  },
];

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

        <span className={`h-2.5 w-2.5 rounded-full ${tone.fill}`} />
      </div>

      <div className={`mt-4 font-mono text-[26px] font-bold uppercase ${tone.text}`}>
        {item.value}
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
        {item.helper}
      </p>
    </div>
  );
}

function ProgressBar({ value, tone }: { value: number; tone: Tone }) {
  const toneStyle = toneClass[tone];

  return (
    <div className="h-2 overflow-hidden rounded-full bg-black">
      <div
        className={`h-full rounded-full ${toneStyle.fill}`}
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  );
}

function BatteryPackCard({ pack }: { pack: BatteryPack }) {
  const tone = toneClass[pack.tone];

  return (
    <div className={`rounded-xl border bg-[#070a10] p-4 ${tone.border}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold text-(--foreground)">
            {pack.name}
          </h3>

          <p className="mt-1 text-[13px] text-(--muted)">{pack.role}</p>
        </div>

        <span
          className={`rounded-full border px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em] ${tone.border} ${tone.bg} ${tone.text}`}
        >
          {pack.tone === "caution" ? "Watch" : pack.tone === "info" ? "Active" : "Stable"}
        </span>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between font-mono text-[10px] font-bold uppercase text-(--muted)">
          <span>Charge</span>
          <span className={tone.text}>{pack.soc}%</span>
        </div>

        <ProgressBar value={pack.soc} tone={pack.tone} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <PackField label="Voltage" value={pack.voltage} />
        <PackField label="Current" value={pack.current} />
        <PackField label="Temp" value={pack.temp} />
        <PackField label="Health" value={pack.health} />
        <PackField label="Cycles" value={pack.cycles} />
        <PackField label="Estimate" value={pack.estimate} />
      </div>
    </div>
  );
}

function PackField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#1d2533] bg-black px-3 py-2.5">
      <div className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-(--muted)">
        {label}
      </div>

      <div className="mt-1 font-mono text-[12px] font-bold uppercase text-(--foreground)">
        {value}
      </div>
    </div>
  );
}

function createPolyline(
  data: PowerSample[],
  key: keyof Pick<PowerSample, "soc" | "power" | "temp">,
  min: number,
  max: number,
  width: number,
  height: number,
  paddingX: number,
  paddingY: number
) {
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  return data
    .map((point, index) => {
      const x = paddingX + (index / (data.length - 1)) * plotWidth;
      const normalized = (Number(point[key]) - min) / (max - min);
      const y = paddingY + (1 - normalized) * plotHeight;

      return `${x},${y}`;
    })
    .join(" ");
}

function PowerTrendChart() {
  const width = 860;
  const height = 300;
  const paddingX = 54;
  const paddingY = 34;

  const socLine = createPolyline(
    powerSamples,
    "soc",
    60,
    90,
    width,
    height,
    paddingX,
    paddingY
  );

  const tempLine = createPolyline(
    powerSamples,
    "temp",
    35,
    60,
    width,
    height,
    paddingX,
    paddingY
  );

  return (
    <div className="rounded-xl border border-[#1d2533] bg-[#070a10] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-[16px] font-semibold text-(--foreground)">
            Battery telemetry trend
          </h3>

          <p className="mt-1 text-[13px] leading-relaxed text-(--muted)">
            Mission timeline based on state-of-charge and battery temperature
            samples.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-right">
          <MiniStat label="Peak load" value={`${peakPower} W`} tone="info" />
          <MiniStat label="Avg draw" value={`${averagePower} W`} tone="nominal" />
          <MiniStat label="Now temp" value={`${latestSample.temp}°C`} tone="caution" />
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[300px] min-w-[720px] w-full"
          role="img"
          aria-label="Battery state of charge and temperature trend graph"
        >
          {[0, 1, 2, 3].map((line) => {
            const y = paddingY + line * ((height - paddingY * 2) / 3);

            return (
              <line
                key={line}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="rgba(143,163,184,0.18)"
                strokeWidth="1"
              />
            );
          })}

          {powerSamples.map((point, index) => {
            const x =
              paddingX +
              (index / (powerSamples.length - 1)) * (width - paddingX * 2);

            return (
              <g key={point.time}>
                <line
                  x1={x}
                  y1={paddingY}
                  x2={x}
                  y2={height - paddingY}
                  stroke="rgba(143,163,184,0.08)"
                  strokeWidth="1"
                />

                <text
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  fill="var(--muted)"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {point.time}
                </text>
              </g>
            );
          })}

          <polyline
            points={socLine}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <polyline
            points={tempLine}
            fill="none"
            stroke="var(--info)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {powerSamples.map((point, index) => {
            const x =
              paddingX +
              (index / (powerSamples.length - 1)) * (width - paddingX * 2);
            const socY =
              paddingY +
              (1 - (point.soc - 60) / (90 - 60)) * (height - paddingY * 2);
            const tempY =
              paddingY +
              (1 - (point.temp - 35) / (60 - 35)) * (height - paddingY * 2);

            return (
              <g key={`${point.time}-points`}>
                <circle cx={x} cy={socY} r="4" fill="var(--primary)" />
                <circle cx={x} cy={tempY} r="4" fill="var(--info)" />
              </g>
            );
          })}

          <text
            x={paddingX}
            y={18}
            fill="var(--primary)"
            fontSize="11"
            fontFamily="monospace"
            fontWeight="700"
          >
            SOC %
          </text>

          <text
            x={paddingX + 70}
            y={18}
            fill="var(--info)"
            fontSize="11"
            fontFamily="monospace"
            fontWeight="700"
          >
            TEMP °C
          </text>
        </svg>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: Tone;
}) {
  return (
    <div className="rounded-lg border border-[#1d2533] bg-black px-3 py-2">
      <div className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-(--muted)">
        {label}
      </div>

      <div className={`mt-1 font-mono text-[12px] font-bold ${toneClass[tone].text}`}>
        {value}
      </div>
    </div>
  );
}

function PowerDistribution() {
  return (
    <div className="grid gap-4">
      {powerChannels.map((channel) => {
        const tone = toneClass[channel.tone];
        const percentage = Math.round((channel.watts / totalPower) * 100);

        return (
          <div
            key={channel.name}
            className="rounded-lg border border-[#1d2533] bg-[#070a10] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[14px] font-semibold text-(--foreground)">
                  {channel.name}
                </h3>

                <p className="mt-1 text-[12px] text-(--muted)">
                  {channel.helper}
                </p>
              </div>

              <div className={`font-mono text-[14px] font-bold ${tone.text}`}>
                {channel.watts} W
              </div>
            </div>

            <div className="mt-3">
              <ProgressBar value={percentage} tone={channel.tone} />
            </div>

            <div className="mt-2 font-mono text-[9px] font-bold uppercase text-(--muted)">
              {percentage}% of active load
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AlertCard({ alert }: { alert: PowerAlert }) {
  const Icon = alert.icon;
  const tone = toneClass[alert.tone];

  return (
    <div className={`rounded-lg border bg-[#070a10] p-4 ${tone.border}`}>
      <div className="flex items-start gap-3">
        <div className={`rounded border p-2 ${tone.border} ${tone.bg}`}>
          <Icon size={15} className={tone.text} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[14px] font-semibold text-(--foreground)">
              {alert.title}
            </h3>

            <span className={`shrink-0 font-mono text-[8px] font-bold uppercase ${tone.text}`}>
              {alert.source}
            </span>
          </div>

          <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
            {alert.message}
          </p>
        </div>
      </div>
    </div>
  );
}

export function BatteryPower() {
  return (
    <div className="min-h-screen bg-[#09090b] px-5 py-6">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
        <section className="rounded-xl border border-[#1d2533] bg-[#07111f] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-(--primary)">
                Systems
              </p>

              <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-(--foreground)">
                Battery & Power
              </h1>

              <p className="mt-2 max-w-4xl text-[14px] leading-relaxed text-(--muted)">
                Battery packs, voltage, current draw, thermal behavior, power
                distribution, reserve capacity, and mission endurance tracking.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="flex h-11 items-center gap-2 rounded border border-[#2a3547] bg-black px-4 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--foreground) transition hover:border-(--primary) hover:text-(--primary)"
              >
                <RotateCcw size={14} />
                Run Power Check
              </button>

              <button
                type="button"
                className="flex h-11 items-center gap-2 rounded bg-(--primary) px-4 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-black transition hover:opacity-90"
              >
                <Download size={14} />
                Export Battery Log
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryMetrics.map((item) => (
            <SummaryCard key={item.label} item={item} />
          ))}
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <SectionShell
              eyebrow="Telemetry Graph"
              title="Mission Power Trend"
              action="SOC + Thermal"
            >
              <PowerTrendChart />
            </SectionShell>
          </div>

          <div className="xl:col-span-4">
            <SectionShell
              eyebrow="Power Distribution"
              title="Active Load Split"
              action={`${totalPower} W Total`}
            >
              <PowerDistribution />
            </SectionShell>
          </div>
        </div>

        <SectionShell
          eyebrow="Battery Packs"
          title="Pack Health & Runtime"
          action="4 Active Rails"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {batteryPacks.map((pack) => (
              <BatteryPackCard key={pack.name} pack={pack} />
            ))}
          </div>
        </SectionShell>

        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <SectionShell
              eyebrow="Mission Endurance"
              title="Power Budget Summary"
              action="Live Estimate"
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <BudgetTile
                  icon={Clock3}
                  label="Estimated Runtime"
                  value="18 min"
                  helper="Current draw profile"
                  tone="caution"
                />

                <BudgetTile
                  icon={Gauge}
                  label="Return Threshold"
                  value="30%"
                  helper="Configured reserve limit"
                  tone="nominal"
                />

                <BudgetTile
                  icon={PlugZap}
                  label="Current Draw"
                  value={`${latestSample.current.toFixed(1)} A`}
                  helper="Main propulsion bus"
                  tone="info"
                />

                <BudgetTile
                  icon={Radio}
                  label="Secure Telemetry"
                  value="Stable"
                  helper="Power rail within range"
                  tone="nominal"
                />
              </div>
            </SectionShell>
          </div>

          <div className="xl:col-span-4">
            <SectionShell eyebrow="Power Alerts" title="Battery Guard" action="3 Events">
              <div className="grid gap-4">
                {powerAlerts.map((alert) => (
                  <AlertCard key={alert.title} alert={alert} />
                ))}
              </div>
            </SectionShell>
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetTile({
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
    <div className={`rounded-xl border bg-[#070a10] p-4 ${toneStyle.border}`}>
      <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--muted)">
        <Icon size={14} className={toneStyle.text} />
        {label}
      </div>

      <div className={`mt-4 font-mono text-[20px] font-bold uppercase ${toneStyle.text}`}>
        {value}
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
        {helper}
      </p>
    </div>
  );
}