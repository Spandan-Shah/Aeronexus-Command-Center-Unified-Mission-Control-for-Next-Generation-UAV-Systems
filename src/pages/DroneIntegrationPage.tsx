import React, { useCallback, useEffect, useMemo, useState } from "react";
import GoblinWispTransportManager from "../components/systems/GoblinWispTransportManager";

type GoblinWispStatus = {
  transport: {
    selected: string;
    started: boolean;
    connected: boolean;
    local_udp_port: number;
    peer_endpoint: [string, number] | null;
    rx_packets: number;
    tx_packets: number;
    last_error: string | null;
  };
  security: {
    protocol: string;
    protocol_version: string;
    suite: string;
    local_fingerprint: string;
    peer_trusted: boolean;
    peer_fingerprint: string | null;
    handshake_pending: boolean;
    secure_session_active: boolean;
    session_id: string | null;
    key_epoch: number;
    tx_counter: number;
    rx_highest_counter: number;
    auth_failures: number;
    replay_drops: number;
    malformed_packets: number;
  };
  aircraft: {
    node_id: string;
    online: boolean;
    last_application: Record<string, unknown> | null;
  };
};

type Tone = "good" | "warn" | "bad" | "idle";

const API = "/api/goblinwisp";

async function getStatus(): Promise<GoblinWispStatus> {
  const response = await fetch(`${API}/status`);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<GoblinWispStatus>;
}

function toneStyle(tone: Tone): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    padding: "5px 9px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.04em",
    border: "1px solid",
  };

  if (tone === "good") {
    return { ...base, color: "#8fffc1", borderColor: "#2f845a", background: "rgba(28,102,67,.18)" };
  }
  if (tone === "warn") {
    return { ...base, color: "#ffd77a", borderColor: "#8c6a2e", background: "rgba(120,88,27,.18)" };
  }
  if (tone === "bad") {
    return { ...base, color: "#ff9a9a", borderColor: "#8a3c3c", background: "rgba(125,35,35,.18)" };
  }
  return { ...base, color: "#b8c2d8", borderColor: "#455067", background: "rgba(67,78,102,.16)" };
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: Tone;
}) {
  return (
    <span style={toneStyle(tone)}>
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "currentColor",
          boxShadow: tone === "good" ? "0 0 10px currentColor" : undefined,
        }}
      />
      {label}
    </span>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid rgba(134,157,196,.18)",
        background: "linear-gradient(180deg, rgba(15,24,40,.92), rgba(10,16,29,.92))",
        borderRadius: 16,
        padding: 18,
        boxShadow: "0 14px 40px rgba(0,0,0,.18)",
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
        {subtitle && (
          <p style={{ margin: "5px 0 0", opacity: 0.62, fontSize: 13 }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function IntegrationSlot({
  title,
  type,
  state,
  detail,
}: {
  title: string;
  type: string;
  state: "ready" | "pending";
  detail: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(135,155,190,.16)",
        borderRadius: 13,
        padding: 14,
        background: "rgba(255,255,255,.02)",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.56 }}>{type}</div>
        </div>
        <StatusPill
          label={state === "ready" ? "READY" : "NOT CONFIGURED"}
          tone={state === "ready" ? "good" : "idle"}
        />
      </div>
      <div style={{ fontSize: 13, opacity: 0.74, lineHeight: 1.45 }}>{detail}</div>
    </div>
  );
}

export default function DroneIntegrationPage() {
  const [status, setStatus] = useState<GoblinWispStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await getStatus();
      setStatus(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const secureTone: Tone = status?.security.secure_session_active
    ? "good"
    : status?.security.handshake_pending
      ? "warn"
      : "idle";

  const transportTone: Tone = status?.transport.connected
    ? "good"
    : status?.transport.started
      ? "warn"
      : "idle";

  const aircraftTone: Tone = status?.aircraft.online ? "good" : "idle";

  const overall = useMemo(() => {
    if (status?.security.secure_session_active && status.aircraft.online) {
      return { text: "SECURE AIRCRAFT LINK ACTIVE", tone: "good" as Tone };
    }
    if (status?.security.handshake_pending) {
      return { text: "AUTHENTICATING AIRCRAFT", tone: "warn" as Tone };
    }
    if (status?.transport.connected || status?.transport.started) {
      return { text: "TRANSPORT READY — SECURE SESSION REQUIRED", tone: "warn" as Tone };
    }
    return { text: "AIRCRAFT NOT CONNECTED", tone: "idle" as Tone };
  }, [status]);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        color: "#edf4ff",
        background:
          "radial-gradient(circle at 15% 0%, rgba(37,85,150,.16), transparent 34%), #07101e",
      }}
    >
      <div style={{ maxWidth: 1500, margin: "0 auto", display: "grid", gap: 18 }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                opacity: 0.56,
                marginBottom: 7,
              }}
            >
              MissionNexus · Hardware Integration
            </div>
            <h1 style={{ margin: 0, fontSize: "clamp(28px,4vw,44px)", lineHeight: 1.05 }}>
              Drone Integration Console
            </h1>
            <p style={{ margin: "10px 0 0", maxWidth: 820, opacity: 0.68, lineHeight: 1.55 }}>
              Connect the aircraft, select the physical transport, establish the GoblinWisp
              identity-bound secure session, and then attach flight-control, sensor, and camera
              subsystems to the authenticated MissionNexus data path.
            </p>
          </div>

          <StatusPill label={overall.text} tone={overall.tone} />
        </header>

        {error && (
          <div
            style={{
              border: "1px solid #7e3f45",
              background: "rgba(112,36,44,.16)",
              color: "#ffb2b8",
              padding: 12,
              borderRadius: 12,
            }}
          >
            MissionNexus GoblinWisp API is not reachable yet: {error}
          </div>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 12,
          }}
        >
          <Card title="Aircraft" subtitle="Primary airborne node">
            <div style={{ display: "grid", gap: 10 }}>
              <StatusPill
                label={status?.aircraft.online ? "GW-MN001 ONLINE" : "GW-MN001 OFFLINE"}
                tone={aircraftTone}
              />
              <div style={{ fontSize: 13, opacity: 0.68 }}>
                Hardware: ESP32-S3 · Persistent identity peer
              </div>
            </div>
          </Card>

          <Card title="Transport" subtitle="Replaceable physical communication layer">
            <div style={{ display: "grid", gap: 10 }}>
              <StatusPill
                label={status?.transport.connected ? "CONNECTED" : status?.transport.started ? "LISTENING" : "STOPPED"}
                tone={transportTone}
              />
              <div style={{ fontSize: 13, opacity: 0.68 }}>
                Selected: {status?.transport.selected ?? "WIFI_UDP"}
              </div>
              <div style={{ fontSize: 13, opacity: 0.68 }}>
                Peer: {status?.transport.peer_endpoint?.join(":") ?? "not discovered"}
              </div>
            </div>
          </Card>

          <Card title="GoblinWisp" subtitle="Patent-aligned secure session">
            <div style={{ display: "grid", gap: 10 }}>
              <StatusPill
                label={
                  status?.security.secure_session_active
                    ? "SECURE"
                    : status?.security.handshake_pending
                      ? "HANDSHAKING"
                      : status?.security.peer_trusted
                        ? "TRUSTED / IDLE"
                        : "UNPAIRED"
                }
                tone={secureTone}
              />
              <div style={{ fontSize: 13, opacity: 0.68 }}>
                Protocol: {status?.security.protocol_version ?? "1.1"}
              </div>
              <div style={{ fontSize: 13, opacity: 0.68 }}>
                Session: {status?.security.session_id ?? "—"}
              </div>
            </div>
          </Card>

          <Card title="Data Gate" subtitle="Only authenticated application data is published">
            <div style={{ display: "grid", gap: 10 }}>
              <StatusPill
                label={status?.security.secure_session_active ? "OPEN" : "CLOSED"}
                tone={status?.security.secure_session_active ? "good" : "idle"}
              />
              <div style={{ fontSize: 13, opacity: 0.68 }}>
                Auth failures: {status?.security.auth_failures ?? 0}
              </div>
              <div style={{ fontSize: 13, opacity: 0.68 }}>
                Replay drops: {status?.security.replay_drops ?? 0}
              </div>
            </div>
          </Card>
        </section>

        <Card
          title="Secure Aircraft Connection"
          subtitle="Select transport, discover the ESP32-S3, pair identities, and establish directional session contexts."
        >
          <GoblinWispTransportManager />
        </Card>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.2fr) minmax(320px,.8fr)",
            gap: 16,
          }}
        >
          <Card
            title="Drone Components"
            subtitle="Subsystems that will publish through the authenticated aircraft session."
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                gap: 10,
              }}
            >
              <IntegrationSlot
                title="Aircraft ESP32-S3"
                type="Secure communications node"
                state="ready"
                detail="Wi-Fi transport and GoblinWisp runtime are the first active integration target."
              />
              <IntegrationSlot
                title="Flight Controller"
                type="UART / MAVLink"
                state="pending"
                detail="Will supply GPS, attitude, battery, armed state, flight mode and aircraft health."
              />
              <IntegrationSlot
                title="Mission Sensors"
                type="I²C / SPI / UART / GPIO"
                state="pending"
                detail="External sensor adapters will normalize readings before secure transmission."
              />
              <IntegrationSlot
                title="Camera"
                type="Camera / companion vision source"
                state="pending"
                detail="Camera control, metadata, detections and snapshots will be bound to the secure session."
              />
            </div>
          </Card>

          <Card
            title="Secure Data Path"
            subtitle="The browser never receives GoblinWisp private or session keys."
          >
            <div style={{ display: "grid", gap: 7, fontSize: 13, lineHeight: 1.45 }}>
              {[
                "Flight Controller / Sensors / Camera",
                "↓",
                "ESP32-S3 application layer",
                "↓",
                "GoblinWisp Aircraft TX context",
                "↓",
                `Transport: ${status?.transport.selected ?? "WIFI_UDP"}`,
                "↓",
                "MissionNexus GoblinWisp RX context",
                "↓",
                "Authenticate → replay validate → commit",
                "↓",
                "Trusted application event",
                "↓",
                "Drone Dashboard",
              ].map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  style={{
                    opacity: item === "↓" ? 0.35 : 0.83,
                    fontFamily: item === "↓" ? "inherit" : "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 12,
          }}
        >
          <Card title="Directional Isolation" subtitle="Separate cryptographic state in each direction">
            <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
              <div>Aircraft → MissionNexus TX/RX lane</div>
              <div>MissionNexus → Aircraft TX/RX lane</div>
              <div style={{ opacity: 0.64 }}>Independent keys, nonce domains, counters and replay state.</div>
            </div>
          </Card>

          <Card title="Session Lifecycle" subtitle="No stale secure-session resurrection">
            <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
              <div>Aircraft reset → active session invalid</div>
              <div>Transport change → active session invalid</div>
              <div>MissionNexus restart → fresh authenticated handshake required</div>
            </div>
          </Card>

          <Card title="Next Integration Gate" subtitle="After secure Wi-Fi telemetry is proven">
            <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
              <div>1. Flight Controller receive-only telemetry</div>
              <div>2. Mission sensors</div>
              <div>3. Camera control + secure snapshots</div>
              <div>4. Long-range transport adapter</div>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
