import { RotateCcw, Save } from "lucide-react";
import { DashboardPreferencesPanel } from "../components/settings/DashboardPreferencesPanel";
import { SafetyLimitsPanel } from "../components/settings/SafetyLimitsPanel";
import { SettingsSummary } from "../components/settings/SettingsSummary";
import { SimulatorSettingsPanel } from "../components/settings/SimulatorSettingsPanel";
import { TelemetrySettingsPanel } from "../components/settings/TelemetrySettingsPanel";

export function DashboardSettings() {
  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3 rounded border border-(--border) bg-(--panel) p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-hud text-lg font-bold text-(--foreground)">
              Settings
            </h1>
            <p className="mt-1 text-sm text-(--muted)">
              Configure dashboard preferences, simulator mode, map options,
              telemetry behavior, secure-link settings, and safety limits.
            </p>
          </div>

          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded border border-(--border) bg-[#081320] px-3 py-2 text-hud text-[10px] text-(--foreground) hover:border-(--primary)">
              <RotateCcw size={14} />
              Reset
            </button>

            <button className="flex items-center gap-2 rounded bg-(--primary) px-3 py-2 text-hud text-[10px] font-bold text-[#07111f] hover:opacity-90">
              <Save size={14} />
              Save Settings
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <SettingsSummary />
        <SimulatorSettingsPanel />

        <div className="grid gap-3 xl:grid-cols-12">
          <section className="xl:col-span-4">
            <SafetyLimitsPanel />
          </section>

          <section className="xl:col-span-4">
            <TelemetrySettingsPanel />
          </section>

          <section className="xl:col-span-4">
            <DashboardPreferencesPanel />
          </section>
        </div>
      </div>
    </div>
  );
}