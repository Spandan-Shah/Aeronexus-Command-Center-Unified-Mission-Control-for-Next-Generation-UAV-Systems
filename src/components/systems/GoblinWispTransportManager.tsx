import { useCallback, useEffect, useMemo, useState } from "react";

type TransportEntry = {
  id: string;
  name: string;
  available: boolean;
  implemented: boolean;
};

type Status = {
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

const API = "/api/goblinwisp";

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export default function GoblinWispTransportManager() {
  const [catalog, setCatalog] = useState<TransportEntry[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [selected, setSelected] = useState("WIFI_UDP");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [cat, stat] = await Promise.all([
      api<{ transports: TransportEntry[] }>("/transports/catalog"),
      api<Status>("/status"),
    ]);
    setCatalog(cat.transports);
    setStatus(stat);
    setSelected(stat.transport.selected);
  }, []);

  useEffect(() => {
    refresh().catch((e) => setError(String(e)));
  }, [refresh]);

  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}${API}/live`);
    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.kind === "snapshot") setStatus(parsed.payload as Status);
        else refresh().catch(() => undefined);
      } catch {
        // Ignore malformed UI events; backend remains authoritative.
      }
    };
    return () => ws.close();
  }, [refresh]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const securityLabel = useMemo(() => {
    if (status?.security.secure_session_active) return "SECURE";
    if (status?.security.handshake_pending) return "HANDSHAKING";
    if (status?.security.peer_trusted) return "TRUSTED / IDLE";
    return "UNPAIRED";
  }, [status]);

  return (
    <section style={{ padding: 24, display: "grid", gap: 16 }}>
      <header>
        <h2 style={{ margin: 0 }}>GoblinWisp Transport Manager</h2>
        <p style={{ opacity: 0.75 }}>
          Select the physical transport. GoblinWisp identity and directional session security remain independent.
        </p>
      </header>

      {error && (
        <div style={{ border: "1px solid currentColor", padding: 12, borderRadius: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
        <div style={{ border: "1px solid #5555", borderRadius: 12, padding: 16 }}>
          <h3>Transport</h3>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} disabled={busy} style={{ width: "100%", padding: 10 }}>
            {catalog.map((item) => (
              <option key={item.id} value={item.id} disabled={!item.implemented}>
                {item.name}{item.implemented ? "" : " — future"}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button disabled={busy} onClick={() => run(() => api("/transports/select", { method: "POST", body: JSON.stringify({ transport: selected }) }))}>Select</button>
            <button disabled={busy || status?.transport.started} onClick={() => run(() => api("/transports/connect", { method: "POST" }))}>Start</button>
            <button disabled={busy || !status?.transport.started} onClick={() => run(() => api("/transports/scan", { method: "POST" }))}>Scan</button>
            <button disabled={busy || !status?.transport.started} onClick={() => run(() => api("/transports/disconnect", { method: "POST" }))}>Stop</button>
          </div>
          <p>UDP: {status?.transport.local_udp_port ?? 42381}</p>
          <p>Peer: {status?.transport.peer_endpoint?.join(":") ?? "not discovered"}</p>
          <p>RX / TX: {status?.transport.rx_packets ?? 0} / {status?.transport.tx_packets ?? 0}</p>
        </div>

        <div style={{ border: "1px solid #5555", borderRadius: 12, padding: 16 }}>
          <h3>GoblinWisp Security</h3>
          <p><strong>{securityLabel}</strong></p>
          <p>Peer trusted: {status?.security.peer_trusted ? "YES" : "NO"}</p>
          <p>Session: {status?.security.session_id ?? "—"}</p>
          <p>Epoch: {status?.security.key_epoch ?? 0}</p>
          <p>TX counter: {status?.security.tx_counter ?? 0}</p>
          <p>RX highest: {status?.security.rx_highest_counter ?? 0}</p>
          <p>Auth failures: {status?.security.auth_failures ?? 0}</p>
          <p>Replay drops: {status?.security.replay_drops ?? 0}</p>
          <button
            disabled={busy || !status?.transport.started || !status?.security.peer_trusted || status?.security.secure_session_active}
            onClick={() => run(() => api("/security/session/start", { method: "POST" }))}
          >
            Start Secure Session
          </button>
        </div>

        <div style={{ border: "1px solid #5555", borderRadius: 12, padding: 16 }}>
          <h3>Aircraft</h3>
          <p>Node: {status?.aircraft.node_id ?? "GW-MN001"}</p>
          <p>Online: {status?.aircraft.online ? "YES" : "NO"}</p>
          <p>Secure: {status?.security.secure_session_active ? "YES" : "NO"}</p>
          <pre style={{ whiteSpace: "pre-wrap", overflow: "auto" }}>
            {JSON.stringify(status?.aircraft.last_application ?? {}, null, 2)}
          </pre>
          <button
            disabled={busy || !status?.security.secure_session_active}
            onClick={() => run(() => api("/application/send", {
              method: "POST",
              body: JSON.stringify({ payload: { type: "PING", source: "MISSIONNEXUS" } }),
            }))}
          >
            Secure Ping
          </button>
        </div>
      </div>
    </section>
  );
}
