import {
  Activity,
  ArrowUpRight,
  Map,
  Plane,
  Radar,
  Settings,
  ShieldCheck,
} from "lucide-react";

import aeronexusFooterLogo from "../../assets/aeronexus-footer-logo.png";

import type {
  PageId,
} from "../../data/navigation";


type MissionFooterProps = {
  activePage:
    PageId;

  onPageChange: (
    page:
      PageId,
  ) => void;
};


type FooterLink = {
  id:
    PageId;

  label:
    string;
};


const operationsLinks:
  FooterLink[] = [
  {
    id:
      "live-ops",

    label:
      "Live Operations",
  },

  {
    id:
      "mission-planner",

    label:
      "Mission Planner",
  },

  {
    id:
      "fleet",

    label:
      "Fleet",
  },

  {
    id:
      "drone-control",

    label:
      "Drone Control",
  },
];


const platformLinks:
  FooterLink[] = [
  {
    id:
      "camera-ai",

    label:
      "Vision Intelligence",
  },

  {
    id:
      "security",

    label:
      "Security",
  },

  {
    id:
      "drone-health",

    label:
      "Drone Health",
  },

  {
    id:
      "settings",

    label:
      "Settings",
  },
];


function FooterLinkButton({
  item,
  activePage,
  onPageChange,
}: {
  item:
    FooterLink;

  activePage:
    PageId;

  onPageChange: (
    page:
      PageId,
  ) => void;
}) {
  const active =
    activePage ===
    item.id;

  return (
    <button
      type="button"
      onClick={() =>
        onPageChange(
          item.id,
        )
      }
      className={[
        "flex items-center gap-1.5",

        "text-[13px] font-medium",

        "transition-colors duration-150",

        active
          ? "text-[#D1AD74]"
          : "text-white/54 hover:text-white",
      ].join(" ")}
    >
      {
        item.label
      }

      {active ? (
        <ArrowUpRight
          size={
            12
          }
        />
      ) : null}
    </button>
  );
}


export function MissionFooter({
  activePage,
  onPageChange,
}: MissionFooterProps) {
  const year =
    new Date().getFullYear();

  return (
    <footer className="relative z-[2] border-t border-white/[0.09] bg-[#050607] text-white">
      <div className="mx-auto w-full max-w-[1680px] px-4 py-10 sm:px-6 lg:px-8 xl:px-10 2xl:px-14">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_0.7fr_0.7fr_1fr]">
          {/* Brand */}

          <div className="max-w-[560px]">
            <img
              src={
                aeronexusFooterLogo
              }
              alt="Aeronexus Aerospace"
              className="h-auto w-[300px] object-contain object-left sm:w-[340px] lg:w-[380px]"
            />

            <div className="mt-5 text-[18px] font-semibold tracking-[-0.025em] text-white">
              MissionNexus
            </div>

            <p className="mt-2.5 max-w-[460px] text-[14px] leading-[1.7] text-white/48">
              Unified mission operations,
              planning, telemetry,
              intelligence and autonomous
              UAV system supervision.
            </p>
          </div>


          {/* Operations */}

          <div>
            <div className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-white/84">
              <Radar
                size={
                  15
                }
                className="text-[#C8A66F]"
              />

              Operations
            </div>

            <div className="grid gap-3">
              {operationsLinks.map(
                (
                  item,
                ) => (
                  <FooterLinkButton
                    key={
                      item.id
                    }
                    item={
                      item
                    }
                    activePage={
                      activePage
                    }
                    onPageChange={
                      onPageChange
                    }
                  />
                ),
              )}
            </div>
          </div>


          {/* Platform */}

          <div>
            <div className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-white/84">
              <Plane
                size={
                  15
                }
                className="text-[#C8A66F]"
              />

              Platform
            </div>

            <div className="grid gap-3">
              {platformLinks.map(
                (
                  item,
                ) => (
                  <FooterLinkButton
                    key={
                      item.id
                    }
                    item={
                      item
                    }
                    activePage={
                      activePage
                    }
                    onPageChange={
                      onPageChange
                    }
                  />
                ),
              )}
            </div>
          </div>


          {/* System */}

          <div>
            <div className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-white/84">
              <ShieldCheck
                size={
                  15
                }
                className="text-[#C8A66F]"
              />

              System
            </div>

            <div className="rounded-[7px] border border-white/[0.09] bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] text-white/48">
                  Console
                </span>

                <span className="flex items-center gap-2 text-[13px] font-semibold text-[#79BC98]">
                  <span className="h-2 w-2 rounded-full bg-[#6FB28D]" />

                  Operational
                </span>
              </div>

              <div className="mt-3.5 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-3.5">
                <span className="text-[13px] text-white/48">
                  Platform
                </span>

                <span className="font-mono text-[13px] text-white/70">
                  MissionNexus
                </span>
              </div>

              <div className="mt-3.5 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-3.5">
                <span className="text-[13px] text-white/48">
                  Mode
                </span>

                <span className="flex items-center gap-1.5 font-mono text-[13px] text-white/70">
                  <Activity
                    size={
                      13
                    }
                  />

                  Mission Ops
                </span>
              </div>
            </div>
          </div>
        </div>


        <div className="mt-10 flex flex-col gap-3 border-t border-white/[0.08] pt-5 md:flex-row md:items-center md:justify-between">
          <div className="text-[13px] text-white/38">
            © {year} Aeronexus Aerospace.
            MissionNexus mission systems.
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[13px] text-white/40">
            <span className="flex items-center gap-1.5">
              <Map
                size={
                  13
                }
              />

              Mission Operations
            </span>

            <span className="hidden h-3 w-px bg-white/[0.12] sm:block" />

            <span className="flex items-center gap-1.5">
              <ShieldCheck
                size={
                  13
                }
              />

              Secure Systems
            </span>

            <button
              type="button"
              onClick={() =>
                onPageChange(
                  "settings",
                )
              }
              className="flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <Settings
                size={
                  13
                }
              />

              Settings
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}