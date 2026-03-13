"use client";

import { useState, useRef } from "react";
import { Send, Paperclip, X, Eye, EyeOff, Download, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type SharedItemType = "text" | "password" | "file";

export interface SharedItem {
  id: string;
  type: SharedItemType;
  content: string; // Text content or File name
  metadata?: any; // File data (Blob/ArrayBuffer) if it's a file
  timestamp: number;
  isSender: boolean;
}

interface SharingInterfaceProps {
  onSendText: (text: string, isPassword: boolean) => void;
  onSendFile: (file: File) => void;
  items: SharedItem[];
  onDisconnect: () => void;
  peerId: string;
}

export default function SharingInterface({
  onSendText,
  onSendFile,
  items,
  onDisconnect,
  peerId,
}: SharingInterfaceProps) {
  const [inputText, setInputText] = useState("");
  const [isPassword, setIsPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendText(inputText.trim(), isPassword);
      setInputText("");
      setIsPassword(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSendFile(e.target.files[0]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel max-w-2xl w-full mx-auto flex flex-col h-[80vh] min-h-[500px]"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/10 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
          <h2 className="font-semibold text-lg">Connected Securely</h2>
          <span className="text-xs text-white/50 hidden sm:inline-block border border-white/10 px-2 py-0.5 rounded-full">
            Peer: {peerId.substring(0, 8)}...
          </span>
        </div>
        <button
          onClick={onDisconnect}
          className="text-white/60 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 text-sm flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Disconnect
        </button>
      </div>

      {/* Item List / Chat bounds */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/40 space-y-4 mt-auto mb-auto">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Send className="w-6 h-6 opacity-50" />
            </div>
            <p>Connection established. Start sharing!</p>
          </div>
        ) : (
          <AnimatePresence>
            {/* items are displayed bottom-up because of flex-col-reverse, so we might need to map them backward if appending normally */}
            {[...items].sort((a,b) => b.timestamp - a.timestamp).map((item) => (
              <ClipboardItemComponent key={item.id} item={item} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black/10 border-t border-white/10 rounded-b-2xl">
        <form onSubmit={handleSendText} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/10 focus-within:border-[var(--color-primary-500)] transition-colors">
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-white/60 hover:text-[var(--color-primary-400)] hover:bg-white/5 rounded-lg transition-all"
              title="Attach File"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              type={isPassword ? "password" : "text"}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message or paste a password..."
              className="flex-1 bg-transparent border-none focus:outline-none text-sm px-2"
            />
            <button
              type="button"
              onClick={() => setIsPassword(!isPassword)}
              className={`p-2 rounded-lg transition-all ${
                isPassword ? "text-[var(--color-secondary-400)] bg-white/5" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
              title="Toggle Password Mode"
            >
              {isPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-500)] disabled:opacity-50 disabled:hover:bg-[var(--color-primary-600)] rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

function ClipboardItemComponent({ item }: { item: SharedItem }) {
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (item.type === "file" && item.metadata) {
      const blob = new Blob([item.metadata]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.content;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full ${item.isSender ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] p-3 rounded-2xl ${
          item.isSender
            ? "bg-gradient-to-br from-[var(--color-primary-600)] to-[var(--color-secondary-600)] text-white rounded-br-sm"
            : "bg-white/10 backdrop-blur-md border border-white/10 text-[var(--color-foreground)] rounded-bl-sm"
        }`}
      >
        <div className="flex justify-between items-start gap-3 mb-1">
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
            {item.type}
          </span>
          <span className="text-[10px] opacity-50">
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="my-2">
          {item.type === "password" ? (
            <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg break-all">
              <span className="font-mono text-sm tracking-widest flex-1">
                {showPassword ? item.content : "••••••••••••••••"}
              </span>
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          ) : item.type === "file" ? (
            <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg">
              <div className="p-2 bg-white/10 rounded-md">
                <Paperclip className="w-5 h-5 text-blue-300" />
              </div>
              <span className="font-medium text-sm truncate flex-1">{item.content}</span>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{item.content}</p>
          )}
        </div>

        <div className="flex justify-end mt-2">
          {item.type === "file" ? (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          ) : (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-md transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
