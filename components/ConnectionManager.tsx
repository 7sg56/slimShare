"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { Copy, Plus, X, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConnectionStatus } from "@/app/page";

interface ConnectionManagerProps {
  peerId: string | null;
  onConnect: (targetId: string) => void;
  status: ConnectionStatus;
  error: string | null;
  onRetry: () => void;
}

export default function ConnectionManager({
  peerId,
  onConnect,
  status,
  error,
  onRetry,
}: ConnectionManagerProps) {
  const [targetId, setTargetId] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (peerId) {
      navigator.clipboard.writeText(peerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = targetId.trim();
    if (trimmed && trimmed.length >= 4) {
      onConnect(trimmed);
    }
  };

  const isConnecting = status === "connecting";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-8 max-w-md w-full mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-text mb-2">Connect Device</h2>
        <p className="text-[var(--color-foreground)] opacity-80">
          Share your code verbally or scan the QR below
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        {/* QR Code Section */}
        <div className="p-4 bg-white rounded-xl shadow-inner">
          {peerId ? (
            <QRCode value={peerId} size={180} />
          ) : (
            <div className="w-[180px] h-[180px] flex items-center justify-center bg-gray-100 rounded-lg animate-pulse">
              <span className="text-gray-400 text-sm">Generating...</span>
            </div>
          )}
        </div>

        {/* Peer Code Display */}
        <div className="w-full">
          <p className="text-xs text-[var(--color-primary-400)] font-semibold mb-2 uppercase tracking-wider text-center">
            Your Code — say it out loud!
          </p>
          <div className="flex items-center justify-center gap-4 bg-black/30 rounded-xl p-4 border border-white/20">
            <p className="font-mono text-4xl font-bold tracking-[0.3em] text-white">
              {peerId ? (
                peerId
              ) : (
                <span className="animate-pulse text-white/40 text-2xl">••••••</span>
              )}
            </p>
            <button
              onClick={handleCopy}
              disabled={!peerId}
              className="p-2 hover:bg-white/10 rounded-md transition-colors"
              title={copied ? "Copied!" : "Copy Code"}
            >
              {copied ? (
                <span className="text-green-400 text-xs font-bold">✓</span>
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div className="w-full h-px bg-white/10" />

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-3"
            >
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300 flex-1">{error}</p>
              <button
                onClick={() => {
                  onRetry();
                  setTargetId("");
                  setShowManual(true);
                }}
                className="text-red-400 hover:text-red-300 flex-shrink-0"
                title="Try again"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manual Connect Option */}
        <div className="w-full">
          {!showManual && !isConnecting ? (
            <button
              onClick={() => setShowManual(true)}
              disabled={!peerId}
              className="w-full glass-button flex items-center justify-center gap-2 p-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Connect Manually
            </button>
          ) : isConnecting ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full flex items-center justify-center gap-3 p-4 bg-[var(--color-primary-600)]/20 border border-[var(--color-primary-500)]/30 rounded-xl"
            >
              <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary-400)]" />
              <span className="text-sm font-medium">Connecting to {targetId}…</span>
            </motion.div>
          ) : (
            <AnimatePresence>
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleConnect}
                className="flex flex-col gap-3"
              >
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-medium">Enter Partner's Code</label>
                  <button
                    type="button"
                    onClick={() => { setShowManual(false); setTargetId(""); }}
                    className="p-1 hover:bg-white/10 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value.toUpperCase())}
                    placeholder="e.g. AB12XY"
                    maxLength={8}
                    autoFocus
                    className="flex-1 bg-black/20 border border-white/10 rounded-lg p-3 font-mono text-lg tracking-widest focus:outline-none focus:border-[var(--color-primary-500)] transition-colors uppercase"
                  />
                  <button
                    type="submit"
                    disabled={targetId.trim().length < 4}
                    className="bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-secondary-600)] hover:opacity-90 disabled:opacity-40 text-white px-5 rounded-lg font-medium transition-opacity"
                  >
                    Join
                  </button>
                </div>
                <p className="text-xs text-white/40 text-center">Ask your peer what their 6-letter code is</p>
              </motion.form>
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}
