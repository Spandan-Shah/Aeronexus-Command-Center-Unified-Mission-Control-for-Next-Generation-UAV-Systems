import { useEffect, useState } from "react";

export type SimulatorState = {
  droneId: string;
  armed: boolean;
  missionStarted: boolean;
  flightMode: string;
  battery: number;
  altitude: number;
  speed: number;
  heading: number;
  linkQuality: number;
  gpsSatellites: number;
  currentWaypoint: number;
  totalWaypoints: number;
};

const fallbackState: SimulatorState = {
  droneId: "UAV-01",
  armed: false,
  missionStarted: false,
  flightMode: "STANDBY",
  battery: 92,
  altitude: 0,
  speed: 0,
  heading: 42,
  linkQuality: 98,
  gpsSatellites: 14,
  currentWaypoint: 0,
  totalWaypoints: 7,
};

export function useSimulator() {
  const [state, setState] = useState<SimulatorState>(fallbackState);
  const [connected, setConnected] = useState(false);
  const [lastResult, setLastResult] = useState("Simulator ready");

  useEffect(() => {
    const socket = new WebSocket("ws://127.0.0.1:8000/ws/telemetry");

    socket.onopen = () => {
      setConnected(true);
      setLastResult("Backend WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as SimulatorState;
      setState(data);
    };

    socket.onerror = () => {
      setConnected(false);
      setLastResult("Backend WebSocket error");
    };

    socket.onclose = () => {
      setConnected(false);
      setLastResult("Backend WebSocket disconnected");
    };

    return () => socket.close();
  }, []);

  async function sendCommand(command: string) {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command }),
      });

      const data = await response.json();
      setLastResult(data.result);
      setState(data.state);
    } catch {
      setLastResult("Command failed. Backend is not running.");
    }
  }

  return {
    state,
    connected,
    lastResult,
    sendCommand,
  };
}