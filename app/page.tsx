"use client";

import { useEffect, useState, useRef } from "react";
import ConnectionManager from "@/components/ConnectionManager";
import SharingInterface, { SharedItem } from "@/components/SharingInterface";
import type { DataConnection, Peer as PeerType } from "peerjs";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

function generateShortId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export default function Home() {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [items, setItems] = useState<SharedItem[]>([]);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>("idle");
  const [connError, setConnError] = useState<string | null>(null);
  const peerRef = useRef<PeerType | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function goConnected(conn: DataConnection) {
    clearTimer();
    console.log("[SlimShare] ✅ CONNECTED to", conn.peer);
    setConnStatus("connected");
    setConnError(null);
    setConnection(conn);
  }

  function goDisconnected() {
    clearTimer();
    console.log("[SlimShare] Disconnected, back to idle");
    setConnection(null);
    setConnStatus("idle");
    setConnError(null);
    setItems([]);
  }

  function wireConnection(conn: DataConnection) {
    console.log("[SlimShare] Wiring connection, open?", conn.open);

    // CRITICAL: If the connection is already open (fast local network),
    // go straight to connected state instead of waiting for the "open" event
    if (conn.open) {
      goConnected(conn);
    }

    conn.on("open", () => {
      goConnected(conn);
    });

    conn.on("data", (data: unknown) => {
      console.log("[SlimShare] Got data");
      setItems((prev) => [...prev, data as SharedItem]);
    });

    conn.on("close", () => {
      goDisconnected();
    });

    conn.on("error", (err) => {
      console.error("[SlimShare] Connection error:", err);
      clearTimer();
      setConnStatus("error");
      setConnError("Connection dropped. Try again.");
    });
  }

  useEffect(() => {
    let destroyed = false;

    import("peerjs").then(({ default: Peer }) => {
      if (destroyed) return;

      function createPeer(id: string, attempt = 0) {
        if (attempt > 3) {
          setConnStatus("error");
          setConnError("Could not register with server. Refresh the page.");
          return;
        }

        console.log("[SlimShare] Creating peer with ID:", id);
        const peer = new Peer(id, {
          host: window.location.hostname,
          port: Number(window.location.port) || (window.location.protocol === "https:" ? 443 : 80),
          path: "/api/peerjs",
          secure: window.location.protocol === "https:",
          debug: 2,
          config: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
            ],
          },
        });

        peer.on("open", (assignedId) => {
          console.log("[SlimShare] ✅ Registered with server as:", assignedId);
          setPeerId(assignedId);
        });

        // Auto-reconnect if we lose connection to signaling server
        peer.on("disconnected", () => {
          console.log("[SlimShare] Lost connection to signaling server, reconnecting...");
          if (!peer.destroyed) {
            peer.reconnect();
          }
        });

        peer.on("error", (err) => {
          console.error("[SlimShare] Peer error:", err.type, err.message);

          if (err.type === "unavailable-id") {
            peer.destroy();
            createPeer(generateShortId(), attempt + 1);
            return;
          }

          if (err.type === "peer-unavailable") {
            clearTimer();
            setConnStatus("error");
            setConnError("No one online with that code. Double-check and try again.");
            return;
          }

          // For "disconnected" type errors, try to reconnect
          if (err.type === "disconnected" && !peer.destroyed) {
            peer.reconnect();
            return;
          }

          setConnStatus("error");
          setConnError(`Error: ${err.message || err.type}`);
        });

        peer.on("connection", (incomingConn) => {
          console.log("[SlimShare] 📞 Incoming connection from:", incomingConn.peer);
          setConnStatus("connecting");
          wireConnection(incomingConn);
        });

        peerRef.current = peer;
      }

      createPeer(generateShortId());
    });

    return () => {
      destroyed = true;
      clearTimer();
      peerRef.current?.destroy();
    };
  }, []);

  const connectToPeer = (targetId: string) => {
    const peer = peerRef.current;
    if (!peer || peer.destroyed) {
      setConnStatus("error");
      setConnError("Not ready yet. Refresh the page and try again.");
      return;
    }

    // If peer got disconnected from signaling server, reconnect first
    if (peer.disconnected) {
      console.log("[SlimShare] Peer was disconnected, reconnecting first...");
      peer.reconnect();
    }

    console.log("[SlimShare] 📞 Connecting to:", targetId);
    setConnStatus("connecting");
    setConnError(null);

    const conn = peer.connect(targetId.trim());
    wireConnection(conn);

    timeoutRef.current = setTimeout(() => {
      if (!conn.open) {
        console.log("[SlimShare] ⏰ Timed out");
        conn.close();
        setConnection(null);
        setConnStatus("error");
        setConnError("Timed out. Make sure the other device is online.");
      }
    }, 12000);
  };

  const handleDisconnect = () => {
    clearTimer();
    connection?.close();
    setConnection(null);
    setConnStatus("idle");
    setConnError(null);
    setItems([]);
  };

  const handleSendText = (text: string, isPassword: boolean) => {
    if (!connection?.open) return;
    const newItem: SharedItem = {
      id: crypto.randomUUID(),
      type: isPassword ? "password" : "text",
      content: text,
      timestamp: Date.now(),
      isSender: true,
    };
    setItems((prev) => [...prev, newItem]);
    connection.send({ ...newItem, isSender: false });
  };

  const handleSendFile = (file: File) => {
    if (!connection?.open) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const metadata = e.target?.result as ArrayBuffer;
      const newItem: SharedItem = {
        id: crypto.randomUUID(),
        type: "file",
        content: file.name,
        metadata,
        timestamp: Date.now(),
        isSender: true,
      };
      setItems((prev) => [...prev, newItem]);
      connection.send({ ...newItem, isSender: false });
    };
    reader.readAsArrayBuffer(file);
  };

  const isConnected = connStatus === "connected" && connection !== null;

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[var(--color-primary-600)]/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[var(--color-secondary-600)]/20 to-transparent pointer-events-none" />

      <div className="w-full z-10">
        {!isConnected ? (
          <ConnectionManager
            peerId={peerId}
            onConnect={connectToPeer}
            status={connStatus}
            error={connError}
            onRetry={() => { setConnStatus("idle"); setConnError(null); }}
          />
        ) : (
          <SharingInterface
            peerId={connection.peer}
            items={items}
            onSendText={handleSendText}
            onSendFile={handleSendFile}
            onDisconnect={handleDisconnect}
          />
        )}
      </div>
    </main>
  );
}
