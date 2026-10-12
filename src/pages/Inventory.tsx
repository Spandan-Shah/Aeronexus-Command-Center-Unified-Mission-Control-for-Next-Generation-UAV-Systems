import type {
  ReactNode,
} from "react";

import {
  AlertTriangle,
  Boxes,
  ClipboardCheck,
  Package,
  PackageCheck,
  PackagePlus,
  ScanLine,
  Truck,
  Warehouse,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  InventorySummary,
} from "../components/inventory/InventorySummary";

import {
  LowStockPanel,
} from "../components/inventory/LowStockPanel";

import {
  PartsInventoryTable,
} from "../components/inventory/PartsInventoryTable";

import {
  SupplierOrdersPanel,
} from "../components/inventory/SupplierOrdersPanel";

type Tone =
  | "nominal"
  | "caution"
  | "critical"
  | "info";

type SummaryMetric = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: Tone;
};

const toneClass = {
  nominal: {
    text:
      "text-[var(--nominal)]",

    border:
      "border-[rgba(89,217,154,0.28)]",

    bg:
      "bg-[rgba(89,217,154,0.08)]",

    dot:
      "bg-[var(--nominal)]",
  },

  caution: {
    text:
      "text-[var(--primary)]",

    border:
      "border-[rgba(246,178,60,0.32)]",

    bg:
      "bg-[rgba(246,178,60,0.08)]",

    dot:
      "bg-[var(--primary)]",
  },

  critical: {
    text:
      "text-[var(--critical)]",

    border:
      "border-[rgba(255,90,99,0.34)]",

    bg:
      "bg-[rgba(255,90,99,0.08)]",

    dot:
      "bg-[var(--critical)]",
  },

  info: {
    text:
      "text-[var(--info)]",

    border:
      "border-[rgba(90,169,255,0.3)]",

    bg:
      "bg-[rgba(90,169,255,0.08)]",

    dot:
      "bg-[var(--info)]",
  },
};

const summaryMetrics:
  SummaryMetric[] = [
    {
      label:
        "Total Parts",

      value:
        "248",

      helper:
        "Tracked inventory items",

      icon:
        Boxes,

      tone:
        "info",
    },

    {
      label:
        "Available Stock",

      value:
        "91%",

      helper:
        "Ready for service use",

      icon:
        PackageCheck,

      tone:
        "nominal",
    },

    {
      label:
        "Low Stock",

      value:
        "07",

      helper:
        "Below reorder threshold",

      icon:
        AlertTriangle,

      tone:
        "caution",
    },

    {
      label:
        "Open Orders",

      value:
        "04",

      helper:
        "Supplier orders in progress",

      icon:
        Truck,

      tone:
        "info",
    },
  ];

/* =========================================================
   Page Header
   ========================================================= */

function PageHeader() {
  return (
    <section className="mn-panel p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="mn-eyebrow">
            Systems · Logistics
          </p>

          <h1 className="mn-heading mt-2 text-[28px]">
            Parts Inventory
          </h1>

          <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-[var(--muted)]">
            Track spare parts, stock levels, reorder thresholds, supplier orders, storage locations and aircraft compatibility across MissionNexus operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="mn-button mn-button-secondary"
          >
            <ScanLine
              size={14}
            />

            Scan Part
          </button>

          <button
            type="button"
            className="mn-button mn-button-primary"
          >
            <PackagePlus
              size={14}
            />

            Add Stock
          </button>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   Section
   ========================================================= */

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
    <section className="mn-panel overflow-hidden">
      <div className="border-b border-[var(--border-soft)] px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mn-eyebrow">
              {eyebrow}
            </p>

            <h2 className="mn-heading mt-1 text-[18px]">
              {title}
            </h2>
          </div>

          {action ? (
            <span className="mn-chip mn-chip-primary w-fit">
              {action}
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   Summary
   ========================================================= */

function SummaryCard({
  item,
}: {
  item: SummaryMetric;
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
        "mn-card p-4",
        tone.border,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          <Icon
            size={14}
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
          "mt-4 font-mono text-[26px] font-semibold",
          tone.text,
        ].join(" ")}
      >
        {item.value}
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">
        {item.helper}
      </p>
    </div>
  );
}

/* =========================================================
   Insight
   ========================================================= */

function InsightCard({
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
  const style =
    toneClass[
      tone
    ];

  return (
    <div
      className={[
        "mn-card p-4",
        style.border,
      ].join(" ")}
    >
      <div className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        <Icon
          size={13}
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

      <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">
        {helper}
      </p>
    </div>
  );
}

/* =========================================================
   Page
   ========================================================= */

export function Inventory() {
  return (
    <div className="min-h-screen bg-[var(--background)] px-5 py-6">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
        <PageHeader />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

        <SectionShell
          eyebrow="Inventory Overview"
          title="Stock Summary"
          action="Warehouse State"
        >
          <InventorySummary />
        </SectionShell>

        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <SectionShell
              eyebrow="Parts Registry"
              title="Inventory Table"
              action="Tracked Components"
            >
              <PartsInventoryTable />
            </SectionShell>
          </div>

          <div className="grid gap-6 xl:col-span-4">
            <SectionShell
              eyebrow="Reorder Watch"
              title="Low Stock Items"
              action="Needs Review"
            >
              <LowStockPanel />
            </SectionShell>

            <SectionShell
              eyebrow="Procurement"
              title="Supplier Orders"
              action="Open Orders"
            >
              <SupplierOrdersPanel />
            </SectionShell>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            icon={
              Warehouse
            }
            label="Storage"
            value="Bay A-03"
            helper="Primary drone components are mapped to the main service bay."
            tone="info"
          />

          <InsightCard
            icon={
              Package
            }
            label="Critical Spares"
            value="Available"
            helper="Core propeller, ESC, battery and sensor spares are stocked."
            tone="nominal"
          />

          <InsightCard
            icon={
              AlertTriangle
            }
            label="Procurement Risk"
            value="Moderate"
            helper="Seven components are near reorder threshold."
            tone="caution"
          />

          <InsightCard
            icon={
              ClipboardCheck
            }
            label="Audit Status"
            value="Clean"
            helper="Inventory status is consistent with current mock records."
            tone="nominal"
          />
        </section>
      </div>
    </div>
  );
}