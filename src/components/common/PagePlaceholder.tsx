import type { LucideIcon } from "lucide-react";

type PagePlaceholderProps = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  features: string[];
};

export function PagePlaceholder({
  title,
  subtitle,
  icon: Icon,
  features,
}: PagePlaceholderProps) {
  return (
    <div className="h-full p-3">
      <section className="h-full rounded border border-(--border) bg-(--panel) p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded border border-(--primary) bg-[rgba(246,178,60,0.08)] text-(--primary)">
            <Icon size={24} />
          </div>

          <div>
            <h1 className="text-hud text-xl font-bold text-(--foreground)">
              {title}
            </h1>
            <p className="mt-1 text-sm text-(--muted)">{subtitle}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature}
              className="rounded border border-(--border) bg-[#081320] p-4"
            >
              <div className="text-hud text-xs text-(--primary)">
                Module
              </div>
              <div className="mt-2 text-sm text-(--foreground)">
                {feature}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded border border-(--border) bg-[#050d18] p-4">
          <p className="text-hud text-xs text-(--muted)">
            Status · This module is prepared as a placeholder. We will build the
            full working page in the next stages.
          </p>
        </div>
      </section>
    </div>
  );
}