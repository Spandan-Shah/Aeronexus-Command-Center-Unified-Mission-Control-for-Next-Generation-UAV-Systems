import aeronexusFooterLogo from "../../assets/aeronexus-footer-logo.png";

import type {
  PageId,
} from "../../data/navigation";

/* =========================================================
   MissionNexus V2
   Product Footer

   Purpose:
   - Aeronexus parent-brand identity
   - MissionNexus product identity
   - Essential product navigation only
   - Compact dashboard-oriented footer

   Intentionally removed:
   - Fake/static platform status
   - Network status
   - Security status
   - Telemetry readiness
   - Large marketing copy
   - Unnecessary dashboard duplication
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
   Typography
   ========================================================= */

const interfaceFont = {
  fontFamily:
    '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const productFont = {
  fontFamily:
    '"Manrope", "Inter", ui-sans-serif, system-ui, sans-serif',
};

/* =========================================================
   Footer Navigation

   Only pages useful enough to expose from the footer.
   ========================================================= */

const operationsLinks: FooterLink[] = [
  {
    label: "Live Operations",
    page: "live-ops",
  },

  {
    label: "Mission Planner",
    page: "mission-planner",
  },

  {
    label: "Drone Control",
    page: "drone-control",
  },

  {
    label: "Fleet",
    page: "fleet",
  },

  {
    label: "Pre-Flight",
    page: "pre-flight",
  },
];

const intelligenceLinks: FooterLink[] = [
  {
    label: "Vision Intelligence",
    page: "camera-ai",
  },

  {
    label: "Mission Debrief",
    page: "logs",
  },

  {
    label: "Security",
    page: "security",
  },
];

const systemLinks: FooterLink[] = [
  {
    label: "Drone Health",
    page: "drone-health",
  },

  {
    label: "Battery & Power",
    page: "battery",
  },

  {
    label: "Settings",
    page: "settings",
  },
];

/* =========================================================
   Footer Column
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
        style={productFont}
        className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/42"
      >
        {title}
      </div>

      <div className="mt-4 flex flex-col items-start gap-3">
        {links.map(
          (link) => {
            const active =
              activePage ===
              link.page;

            return (
              <button
                key={link.page}
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
                  "w-fit text-left",

                  "text-[13px] font-medium leading-[1.4]",

                  "transition-colors duration-150",

                  active
                    ? "text-(--primary)"
                    : "text-white/58 hover:text-white",
                ].join(" ")}
              >
                {link.label}
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}

/* =========================================================
   Mission Footer
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
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <footer
      style={interfaceFont}
      className="border-t border-white/[0.08] bg-[#030409]"
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 py-9 sm:px-6 lg:px-8 xl:px-10 2xl:px-14">
        {/* =================================================
            Main Footer
            ================================================= */}

        <div
          className={[
            "grid items-start gap-10",

            "md:grid-cols-2",

            "xl:grid-cols-[1.45fr_0.8fr_0.8fr_0.8fr]",

            "xl:gap-14",
          ].join(" ")}
        >
          {/* ===============================================
              Aeronexus / MissionNexus Identity
              =============================================== */}

          <div className="min-w-0">
            <div className="w-full max-w-[220px] overflow-hidden rounded-[4px] border border-white/[0.08] bg-white p-2.5">
              <img
                src={aeronexusFooterLogo}
                alt="Aeronexus"
                className="h-auto w-full object-contain"
              />
            </div>

            <div className="mt-5">
              <div
                style={productFont}
                className="text-[17px] font-medium tracking-[-0.02em] text-white"
              >
                MissionNexus
              </div>

              <div className="mt-1 text-[11px] font-medium text-(--primary)">
                A product by Aeronexus
              </div>
            </div>

            <p className="mt-4 max-w-[410px] text-[13px] leading-[1.7] text-white/48">
              Unified mission operations for UAV control,
              planning, fleet awareness and aerial intelligence.
            </p>
          </div>

          {/* ===============================================
              Operations
              =============================================== */}

          <FooterColumn
            title="Operations"
            links={operationsLinks}
            activePage={activePage}
            onNavigate={navigate}
          />

          {/* ===============================================
              Intelligence
              =============================================== */}

          <FooterColumn
            title="Intelligence"
            links={intelligenceLinks}
            activePage={activePage}
            onNavigate={navigate}
          />

          {/* ===============================================
              System
              =============================================== */}

          <FooterColumn
            title="System"
            links={systemLinks}
            activePage={activePage}
            onNavigate={navigate}
          />
        </div>

        {/* =================================================
            Bottom Product Bar
            ================================================= */}

        <div className="mt-9 border-t border-white/[0.07] pt-5">
          <div className="flex flex-col gap-3 text-[11px] text-white/36 sm:flex-row sm:items-center sm:justify-between">
            <div>
              © 2026 Aeronexus. All rights reserved.
            </div>

            <div className="flex items-center gap-3">
              <span>
                MissionNexus V2
              </span>

              <span
                aria-hidden="true"
                className="h-3 w-px bg-white/[0.10]"
              />

              <span>
                Aeronexus
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}