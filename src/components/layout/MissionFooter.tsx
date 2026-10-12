import {
  Activity,
  ArrowUpRight,
  Database,
  Radio,
  ShieldCheck,
} from "lucide-react";

import aeronexusFooterLogo from "../../assets/aeronexus-footer-logo.png";

import type {
  PageId,
} from "../../data/navigation";

type MissionFooterProps = {
  activePage: PageId;

  onPageChange: (
    page: PageId,
  ) => void;
};

/* =========================================================
   MissionNexus V2
   Operational Dashboard Footer
   ========================================================= */

const interfaceFont = {
  fontFamily:
    '"Inter", ui-sans-serif, system-ui, sans-serif',
};

const productFont = {
  fontFamily:
    '"Manrope", "Inter", ui-sans-serif, system-ui, sans-serif',
};

function FooterLink({
  label,
  page,
  activePage,
  onPageChange,
}: {
  label: string;

  page: PageId;

  activePage: PageId;

  onPageChange: (
    page: PageId,
  ) => void;
}) {
  const active =
    activePage === page;

  return (
    <button
      type="button"
      onClick={() => {
        onPageChange(
          page,
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }}
      className={[
        "w-fit text-left text-[12px]",

        "transition-colors duration-150",

        active
          ? "text-(--primary)"
          : "text-white/48 hover:text-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function SystemState({
  icon: Icon,
  label,
  value,
  nominal = false,
}: {
  icon:
    typeof Activity;

  label: string;

  value: string;

  nominal?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border",

          nominal
            ? "border-[rgba(89,217,154,0.18)] bg-[rgba(89,217,154,0.04)] text-(--nominal)"
            : "border-white/[0.07] bg-white/[0.015] text-white/45",
        ].join(" ")}
      >
        <Icon
          size={13}
          strokeWidth={1.6}
        />
      </span>

      <div>
        <div className="font-mono text-[7px] font-semibold uppercase tracking-[0.1em] text-white/28">
          {label}
        </div>

        <div
          className={[
            "mt-0.5 text-[10px] font-medium",

            nominal
              ? "text-(--nominal)"
              : "text-white/68",
          ].join(" ")}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export function MissionFooter({
  activePage,
  onPageChange,
}: MissionFooterProps) {
  return (
    <footer
      style={interfaceFont}
      className="border-t border-white/[0.08] bg-[#030409]"
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 py-9 sm:px-6 lg:px-8 xl:px-10 2xl:px-14">
        {/* =================================================
            Main dashboard footer
            ================================================= */}

        <div className="grid gap-9 lg:grid-cols-[1.35fr_0.85fr_0.85fr_1.15fr] lg:gap-12">
          {/* Brand */}

          <div>
            <div className="w-full max-w-[210px] overflow-hidden rounded-[4px] border border-white/[0.08] bg-white p-2.5">
              <img
                src={aeronexusFooterLogo}
                alt="Aeronexus"
                className="h-auto w-full object-contain"
              />
            </div>

            <div className="mt-5">
              <div
                style={productFont}
                className="text-[16px] font-medium tracking-[-0.02em] text-white"
              >
                MissionNexus
              </div>

              <div className="mt-1 font-mono text-[8px] font-semibold uppercase tracking-[0.15em] text-(--primary)">
                Autonomous Mission Command
              </div>
            </div>

            <p className="mt-4 max-w-[370px] text-[12px] leading-[1.7] text-white/42">
              Unified command, mission planning, fleet awareness,
              aerial intelligence and secure UAV operations.
            </p>
          </div>

          {/* Operations */}

          <div>
            <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.15em] text-white/32">
              Operations
            </div>

            <div className="mt-4 grid gap-3">
              <FooterLink
                label="Live Operations"
                page="live-ops"
                activePage={activePage}
                onPageChange={onPageChange}
              />

              <FooterLink
                label="Mission Planner"
                page="mission-planner"
                activePage={activePage}
                onPageChange={onPageChange}
              />

              <FooterLink
                label="Drone Control"
                page="drone-control"
                activePage={activePage}
                onPageChange={onPageChange}
              />

              <FooterLink
                label="Fleet"
                page="fleet"
                activePage={activePage}
                onPageChange={onPageChange}
              />

              <FooterLink
                label="Pre-Flight"
                page="pre-flight"
                activePage={activePage}
                onPageChange={onPageChange}
              />
            </div>
          </div>

          {/* Intelligence */}

          <div>
            <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.15em] text-white/32">
              Intelligence
            </div>

            <div className="mt-4 grid gap-3">
              <FooterLink
                label="Vision Intelligence"
                page="camera-ai"
                activePage={activePage}
                onPageChange={onPageChange}
              />

              <FooterLink
                label="Mission Debrief"
                page="logs"
                activePage={activePage}
                onPageChange={onPageChange}
              />

              <FooterLink
                label="Security"
                page="security"
                activePage={activePage}
                onPageChange={onPageChange}
              />

              <FooterLink
                label="Settings"
                page="settings"
                activePage={activePage}
                onPageChange={onPageChange}
              />
            </div>
          </div>

          {/* Platform state */}

          <div>
            <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.15em] text-white/32">
              Platform State
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-5">
              <SystemState
                icon={Activity}
                label="Platform"
                value="Operational"
                nominal
              />

              <SystemState
                icon={Radio}
                label="Network"
                value="Available"
                nominal
              />

              <SystemState
                icon={ShieldCheck}
                label="Security"
                value="Protected"
                nominal
              />

              <SystemState
                icon={Database}
                label="Telemetry"
                value="Ready"
                nominal
              />
            </div>

            <button
              type="button"
              onClick={() =>
                onPageChange(
                  "settings",
                )
              }
              className="mt-6 flex h-9 items-center gap-2 rounded-[5px] border border-white/[0.08] bg-white/[0.015] px-3 text-[10px] font-medium text-white/54 transition-colors hover:border-white/15 hover:text-white"
            >
              Platform Settings

              <ArrowUpRight
                size={12}
              />
            </button>
          </div>
        </div>

        {/* =================================================
            Bottom information rail
            ================================================= */}

        <div className="mt-9 border-t border-white/[0.07] pt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-[900px] text-[10px] leading-[1.7] text-white/28">
              MissionNexus operational capabilities depend on
              connected aircraft, configured telemetry sources,
              enabled integrations and approved mission profiles.
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[8px] uppercase tracking-[0.08em] text-white/30">
              <span>
                © 2026 Aeronexus
              </span>

              <span className="h-3 w-px bg-white/[0.08]" />

              <span>
                MissionNexus V2
              </span>

              <span className="h-3 w-px bg-white/[0.08]" />

              <span className="text-(--nominal)">
                ● Operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}