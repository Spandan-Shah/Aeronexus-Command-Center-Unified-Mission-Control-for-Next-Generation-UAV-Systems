export type SecuritySeverity = "nominal" | "info" | "caution" | "critical";

export type SessionStatus = "active" | "idle" | "revoked";

export type CommandAudit = {
  id: string;
  time: string;
  operator: string;
  command: string;
  target: string;
  result: string;
  severity: SecuritySeverity;
};

export type ActiveSession = {
  id: string;
  user: string;
  role: string;
  device: string;
  location: string;
  status: SessionStatus;
  lastSeen: string;
};

export type AccessRole = {
  id: string;
  role: string;
  users: number;
  permission: string;
  level: SecuritySeverity;
};

export type SecurityAlert = {
  id: string;
  time: string;
  title: string;
  message: string;
  severity: SecuritySeverity;
};

export const securityOverview = {
  secureLink: "AES-256 Session",
  activeSessions: 3,
  failedAttempts: 2,
  auditEvents: 18,
  commandIntegrity: 98,
  lastKeyRotation: "Today · 13:45",
};

export const commandAudits: CommandAudit[] = [
  {
    id: "cmd-01",
    time: "14:26:42",
    operator: "Ground Station",
    command: "RTL Triggered",
    target: "UAV-01",
    result: "Accepted",
    severity: "nominal",
  },
  {
    id: "cmd-02",
    time: "14:22:48",
    operator: "Ground Station",
    command: "Geofence Warning Acknowledged",
    target: "UAV-01",
    result: "Resolved",
    severity: "caution",
  },
  {
    id: "cmd-03",
    time: "14:18:33",
    operator: "AI Review",
    command: "Detection Tagged",
    target: "CAM-01",
    result: "Saved",
    severity: "info",
  },
  {
    id: "cmd-04",
    time: "14:08:00",
    operator: "Ground Station",
    command: "Arm Drone",
    target: "UAV-01",
    result: "Accepted",
    severity: "nominal",
  },
  {
    id: "cmd-05",
    time: "14:05:11",
    operator: "Unknown Client",
    command: "Mission Upload Attempt",
    target: "UAV-03",
    result: "Blocked",
    severity: "critical",
  },
];

export const activeSessions: ActiveSession[] = [
  {
    id: "ses-01",
    user: "Ground Station",
    role: "Mission Operator",
    device: "Windows Workstation",
    location: "Control Room",
    status: "active",
    lastSeen: "Now",
  },
  {
    id: "ses-02",
    user: "Maintenance Team",
    role: "Technician",
    device: "Tablet",
    location: "Maintenance Bay",
    status: "idle",
    lastSeen: "4 min ago",
  },
  {
    id: "ses-03",
    user: "AI Review",
    role: "Payload Analyst",
    device: "Review Console",
    location: "Ops Desk",
    status: "active",
    lastSeen: "20 sec ago",
  },
];

export const accessRoles: AccessRole[] = [
  {
    id: "role-01",
    role: "Mission Operator",
    users: 2,
    permission: "Arm, upload mission, command drone, acknowledge alerts",
    level: "critical",
  },
  {
    id: "role-02",
    role: "Payload Analyst",
    users: 3,
    permission: "Camera control, detection review, export snapshots",
    level: "caution",
  },
  {
    id: "role-03",
    role: "Technician",
    users: 4,
    permission: "Maintenance, inventory, service tickets",
    level: "info",
  },
  {
    id: "role-04",
    role: "Viewer",
    users: 8,
    permission: "Read-only dashboard access",
    level: "nominal",
  },
];

export const securityAlerts: SecurityAlert[] = [
  {
    id: "sec-01",
    time: "14:05:11",
    title: "Unauthorized mission upload blocked",
    message: "Unknown client attempted to upload a mission to UAV-03.",
    severity: "critical",
  },
  {
    id: "sec-02",
    time: "13:45:00",
    title: "Session key rotated",
    message: "Secure command session key was rotated successfully.",
    severity: "nominal",
  },
  {
    id: "sec-03",
    time: "13:22:18",
    title: "Idle session warning",
    message: "Maintenance tablet session has been idle for several minutes.",
    severity: "caution",
  },
];