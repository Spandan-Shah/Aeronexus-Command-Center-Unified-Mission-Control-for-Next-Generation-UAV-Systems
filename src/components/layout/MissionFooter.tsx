import {
  ArrowRight,
} from "lucide-react";

import aeronexusFooterLogo from "../../assets/aeronexus-footer-logo.png";

import type {
  PageId,
} from "../../data/navigation";

/* =========================================================
   MissionNexus V2
   Aeronexus Product Footer

   Visual reference:
   - Aeronexus parent-site footer
   - compact MissionNexus-specific content
   - controlled typography
   - clear four-column desktop hierarchy
   ========================================================= */

type MissionFooterProps = {
  activePage: PageId;

  onPageChange: (
    page: PageId,
  ) => void;
};

type FooterLink = {
  label: string;

  page: PageId;
};

type FooterColumnProps = {
  title: string;

  links: FooterLink[];

  activePage: PageId;

  onNavigate: (
    page: PageId,
  ) => void;
};

/* =========================================================
   Footer Data
   ========================================================= */

const missionLinks:
  FooterLink[] = [
    {
      label:
        "Live Operations",

      page:
        "live-ops",
    },

    {
      label:
        "Mission Planner",

      page:
        "mission-planner",
    },

    {
      label:
        "Drone Control",

      page:
        "drone-control",
    },

    {
      label:
        "Fleet",

      page:
        "fleet",
    },

    {
      label:
        "Pre-Flight",

      page:
        "pre-flight",
    },
  ];

const intelligenceLinks:
  FooterLink[] = [
    {
      label:
        "Vision Intelligence",

      page:
        "camera-ai",
    },

    {
      label:
        "Mission Debrief",

      page:
        "logs",
    },

    {
      label:
        "Security",

      page:
        "security",
    },
  ];

const systemsLinks:
  FooterLink[] = [
    {
      label:
        "Drone Health",

      page:
        "drone-health",
    },

    {
      label:
        "Battery & Power",

      page:
        "battery",
    },

    {
      label:
        "Maintenance",

      page:
        "maintenance",
    },

    {
      label:
        "Inventory",

      page:
        "inventory",
    },

    {
      label:
        "Settings",

      page:
        "settings",
    },
  ];

/* =========================================================
   Typography
   ========================================================= */

const productFont = {
  fontFamily:
    '"Manrope", "Inter", ui-sans-serif, system-ui, sans-serif',
};

const interfaceFont = {
  fontFamily:
    '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

/* =========================================================
   Navigation Column
   ========================================================= */

function FooterColumn({
  title,
  links,
  activePage,
  onNavigate,
}: FooterColumnProps) {
  return (
    <div className="min-w-0">
      <div
        style={
          productFont
        }
        className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/45"
      >
        {title}
      </div>

      <div className="mt-5 flex flex-col items-start gap-3.5">
        {links.map(
          (
            link,
          ) => {
            const active =
              activePage ===
              link.page;

            return (
              <button
                key={
                  link.page
                }
                type="button"
                onClick={() =>
                  onNavigate(
                    link.page,
                  )
                }
                aria-current={
                  active
                    ? "page"
                    : undefined
                }
                className={[
                  "text-left text-[14px] font-normal leading-[1.35]",

                  "transition-colors duration-150",

                  active
                    ? "text-(--primary)"
                    : "text-white/70 hover:text-white",
                ].join(
                  " ",
                )}
              >
                {
                  link.label
                }
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}

/* =========================================================
   Main Footer
   ========================================================= */

export function MissionFooter({
  activePage,
  onPageChange,
}: MissionFooterProps) {
  function navigate(
    page: PageId,
  ) {
    onPageChange(
      page,
    );

    window.scrollTo({
      top:
        0,

      behavior:
        "smooth",
    });
  }

  return (
    <footer
      style={
        interfaceFont
      }
      className="border-t border-white/[0.08] bg-[#05060d]"
    >
      <div className="mx-auto w-full max-w-[1600px] px-5 py-12 sm:px-6 lg:px-10 xl:px-12 2xl:px-14">
        {/* =================================================
            Primary Footer Grid
            ================================================= */}

        <div className="grid items-start gap-12 md:grid-cols-2 xl:grid-cols-[1.55fr_1fr_1fr_1fr] xl:gap-16">
          {/* ===============================================
              Aeronexus / MissionNexus Identity
              =============================================== */}

          <div className="min-w-0">
            {/* Official Aeronexus footer artwork */}

            <div className="inline-flex w-full max-w-[276px] items-center justify-center overflow-hidden rounded-[2px] border border-white/10 bg-white p-3">
              <img
                src={
                  aeronexusFooterLogo
                }
                alt="Aeronexus"
                className="h-auto w-full object-contain"
              />
            </div>

            {/* MissionNexus identity */}

            <div className="mt-7">
              <div
                style={
                  productFont
                }
                className="text-[18px] font-medium tracking-[-0.025em] text-white"
              >
                MissionNexus
              </div>

              <div className="mt-1 font-mono text-[8px] font-semibold uppercase tracking-[0.16em] text-(--primary)">
                An Aeronexus Product
              </div>
            </div>

            {/* Description */}

            <p className="mt-5 max-w-[430px] text-[14px] leading-[1.75] text-white/55">
              Unified mission command for unmanned aircraft,
              combining live telemetry, secure control,
              mission planning and aerial intelligence in one
              operational workspace.
            </p>

            {/* CTA */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "live-ops",
                )
              }
              className={[
                "mt-7 inline-flex h-[46px] items-center justify-center gap-2.5",

                "rounded-[4px] border border-[rgba(246,178,60,0.7)]",

                "bg-(--primary) px-5",

                "font-mono text-[10px] font-semibold uppercase tracking-[0.13em]",

                "text-black",

                "transition-[background-color,transform,opacity] duration-150",

                "hover:opacity-90",

                "active:translate-y-px",
              ].join(
                " ",
              )}
            >
              Open Live Operations

              <ArrowRight
                size={
                  14
                }
                strokeWidth={
                  1.8
                }
              />
            </button>
          </div>

          {/* ===============================================
              MissionNexus
              =============================================== */}

          <FooterColumn
            title="MissionNexus"
            links={
              missionLinks
            }
            activePage={
              activePage
            }
            onNavigate={
              navigate
            }
          />

          {/* ===============================================
              Intelligence
              =============================================== */}

          <FooterColumn
            title="Intelligence"
            links={
              intelligenceLinks
            }
            activePage={
              activePage
            }
            onNavigate={
              navigate
            }
          />

          {/* ===============================================
              Systems
              =============================================== */}

          <FooterColumn
            title="Systems"
            links={
              systemsLinks
            }
            activePage={
              activePage
            }
            onNavigate={
              navigate
            }
          />
        </div>

        {/* =================================================
            Bottom Legal / Product Strip
            ================================================= */}

        <div className="mt-14 border-t border-white/[0.08] pt-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[940px]">
              <p className="text-[12px] leading-[1.75] text-white/35">
                MissionNexus capabilities, aircraft
                integrations, payload support and deployment
                workflows depend on mission requirements,
                connected systems and approved operational
                configuration.
              </p>

              <p className="mt-6 text-[12px] text-white/45">
                © 2026 Aeronexus. All rights reserved.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-(--nominal)" />

              <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-white/40">
                MissionNexus V2
              </span>

              <span
                aria-hidden="true"
                className="h-3 w-px bg-white/10"
              />

              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-white/30">
                Aeronexus
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}