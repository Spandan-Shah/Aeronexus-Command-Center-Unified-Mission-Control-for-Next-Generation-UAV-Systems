import { CalendarClock, CheckCircle2, CircleAlert, CircleX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  maintenanceTasks,
  type MaintenanceStatus,
  type ServicePriority,
} from "../../data/maintenance";
import { Panel } from "../common/Panel";

const statusConfig: Record<
  MaintenanceStatus,
  {
    label: string;
    textClass: string;
    Icon: LucideIcon;
  }
> = {
  scheduled: {
    label: "Scheduled",
    textClass: "text-(--info)",
    Icon: CalendarClock,
  },
  due_soon: {
    label: "Due Soon",
    textClass: "text-(--caution)",
    Icon: CircleAlert,
  },
  overdue: {
    label: "Overdue",
    textClass: "text-(--critical)",
    Icon: CircleX,
  },
  completed: {
    label: "Completed",
    textClass: "text-(--nominal)",
    Icon: CheckCircle2,
  },
};

const priorityText: Record<ServicePriority, string> = {
  low: "text-(--info)",
  medium: "text-(--caution)",
  high: "text-(--critical)",
  urgent: "text-(--critical)",
};

export function MaintenanceSchedule() {
  return (
    <Panel
      title="Scheduled Maintenance"
      right={
        <span className="text-hud text-[10px] text-(--muted)">
          {maintenanceTasks.length} tasks
        </span>
      }
    >
      <div className="overflow-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-(--panel) text-hud text-[10px] text-(--muted)">
            <tr className="border-b border-(--border)">
              <th className="px-3 py-2 font-normal">Task</th>
              <th className="px-3 py-2 font-normal">Drone</th>
              <th className="px-3 py-2 font-normal">Category</th>
              <th className="px-3 py-2 font-normal">Due</th>
              <th className="px-3 py-2 font-normal">Priority</th>
              <th className="px-3 py-2 font-normal text-right">Status</th>
            </tr>
          </thead>

          <tbody>
            {maintenanceTasks.map((task) => {
              const config = statusConfig[task.status];
              const Icon = config.Icon;

              return (
                <tr
                  key={task.id}
                  className="border-b border-(--border) hover:bg-[#081320]"
                >
                  <td className="px-3 py-3">
                    <div className="text-(--foreground)">{task.title}</div>
                    <div className="mt-1 text-[10px] text-(--muted)">
                      {task.detail}
                    </div>
                  </td>

                  <td className="px-3 py-3 text-(--primary)">
                    {task.droneId}
                  </td>

                  <td className="px-3 py-3 text-(--muted)">
                    {task.category}
                  </td>

                  <td className="px-3 py-3 text-(--foreground)">
                    {task.dueIn}
                  </td>

                  <td className={`px-3 py-3 ${priorityText[task.priority]}`}>
                    {task.priority}
                  </td>

                  <td className={`px-3 py-3 text-right ${config.textClass}`}>
                    <span className="inline-flex items-center gap-1.5">
                      <Icon size={14} />
                      {config.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}