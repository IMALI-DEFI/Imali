// src/pages/ConnectRobinhood.jsx
import React, { useCallback, useEffect, useState } from "react";
import BotAPI from "../utils/BotAPI";
import {
  FaCheckCircle,
  FaCopy,
  FaExternalLinkAlt,
  FaKey,
  FaPlug,
  FaShieldAlt,
  FaSpinner,
  FaSyncAlt,
  FaTrash,
} from "react-icons/fa";

const ROBINHOOD_API_URL = "https://robinhood.com/us/en/support/articles/crypto-api/";

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

export default function ConnectRobinhood() {
  const [status, setStatus] = useState({
    connected: false,
    key: "",
    connectedAt: null,
  });
const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const [apiKey, setApiKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const robinhood = await BotAPI.getRobinhoodStatus(true);

      setStatus({
        connected: !!robinhood?.connected,
        key: robinhood?.api_key_masked || "",
        connectedAt: robinhood?.connected_at || null,
      });
    } catch (err) {
      setMessageType("error");
      setMessage(
        err.message ||
          "Failed to load Robinhood Crypto status."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const copyText = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessageType("success");
      setMessage(`${label} copied.`);
    } catch {
      setMessageType("error");
      setMessage(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const generateRobinhoodKeys = async () => {
    setGenerating(true);
    setMessage("");

    try {
      if (!window.crypto?.subtle) {
        throw new Error("Secure browser cryptography is not available.");
      }

      /*
        Robinhood uses Ed25519 key pairs.

        Modern browsers support Ed25519 through Web Crypto.
      */
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "Ed25519",
        },
        true,
        ["sign", "verify"]
      );

      const rawPublicKey = await window.crypto.subtle.exportKey(
        "raw",
        keyPair.publicKey
      );

      const rawPrivateKey = await window.crypto.subtle.exportKey(
        "pkcs8",
        keyPair.privateKey
      );

      const publicKeyBase64 = bytesToBase64(
        new Uint8Array(rawPublicKey)
      );

      const privateKeyBase64 = bytesToBase64(
        new Uint8Array(rawPrivateKey)
      );

      setPublicKey(publicKeyBase64);
      setPrivateKey(privateKeyBase64);

      setMessageType("success");
      setMessage(
        "Keys created. Copy the Public Key into Robinhood."
      );
    } catch (err) {
      console.error("[Robinhood Key Generation]", err);

      setMessageType("error");
      setMessage(
        "Your browser could not create the Robinhood keys. Try the latest Chrome, Safari, Edge, or Firefox."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleConnect = async () => {
    const cleanApiKey = apiKey.trim();
    const cleanPrivateKey = privateKey.trim();

    if (!cleanApiKey) {
      setMessageType("error");
      setMessage(
        "Paste the API Key Robinhood gives you."
      );
      return;
    }

    if (!cleanPrivateKey) {
      setMessageType("error");
      setMessage(
        "Generate your Robinhood keys first."
      );
      return;
    }

    setActionLoading(true);
    setMessage("");

    try {
      const res = await BotAPI.connectRobinhood({
        api_key: cleanApiKey,
        private_key: cleanPrivateKey,
      });

      if (res?.success) {
        setMessageType("success");
        setMessage("Robinhood connected successfully!");

        setApiKey("");
        setPublicKey("");
        setPrivateKey("");

        await loadStatus();
      } else {
        setMessageType("error");
        setMessage(
          res?.error ||
            res?.message ||
            "Robinhood connection failed."
        );
      }
    } catch (err) {
      setMessageType("error");
      setMessage(
        err.message || "Robinhood connection failed."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        "Are you sure you want to disconnect Robinhood?"
      )
    ) {
      return;
    }

    setActionLoading(true);
    setMessage("");

    try {
      const res = await BotAPI.disconnectRobinhood();

      if (res?.success) {
        setMessageType("success");
        setMessage("Robinhood disconnected.");
        await loadStatus();
      } else {
        setMessageType("error");
        setMessage(
          res?.error ||
            res?.message ||
            "Disconnect failed."
        );
      }
    } catch (err) {
      setMessageType("error");
      setMessage(
        err.message || "Disconnect failed."
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 text-white">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">

        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300 mb-3">
            🪶 Robinhood
          </div>

          <h1 className="text-2xl sm:text-4xl font-black">
            Connect Robinhood Crypto
          </h1>

          <p className="mt-2 text-sm sm:text-base text-white/60 max-w-2xl">
            Connect your Robinhood Crypto account using supported Robinhood Crypto Trading API credentials.
          </p>
        </div>

        {/* Crypto connection status */}
        <div
          className={`rounded-2xl border p-4 sm:p-5 ${
            status.connected
              ? "border-emerald-400/30 bg-emerald-500/10"
              : "border-white/10 bg-white/5"
          }`}
        >
          <div className="flex items-center gap-3">
            {status.connected ? (
              <FaCheckCircle className="text-emerald-400 text-xl" />
            ) : (
              <FaPlug className="text-yellow-400 text-xl" />
            )}

            <div>
              <p className="font-bold">
                {status.connected
                  ? "Robinhood Crypto is connected"
                  : "Robinhood Crypto is not connected"}
              </p>

              {status.connected && status.key && (
                <p className="text-xs text-white/50 mt-1 break-all">
                  {status.key}
                </p>
              )}
            </div>
          </div>

          {status.connected && (
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                type="button"
                onClick={loadStatus}
                disabled={actionLoading}
                className="w-full sm:w-auto"
              >
                <FaSyncAlt className="mr-2" />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleDisconnect}
                disabled={actionLoading}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
              >
                <FaTrash className="mr-2" />
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* STEP 1 */}
        <div className="rounded-3xl border border-emerald-400/20 bg-white/5 p-5 sm:p-6">
          <div className="flex gap-3">
            <div className="shrink-0 h-9 w-9 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center">
              1
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold">
                Create your Robinhood keys
              </h2>

              <p className="text-sm text-white/55 mt-1">
                IMALI will create them for you.
              </p>
            </div>
          </div>

          {!publicKey ? (
            <button
              type="button"
              onClick={generateRobinhoodKeys}
              disabled={generating}
              className="mt-5 w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3"
            >
              {generating ? (
                <FaSpinner className="animate-spin mr-2" />
              ) : (
                <FaKey className="mr-2" />
              )}

              {generating
                ? "Creating Keys..."
                : "Generate My Robinhood Keys"}
            </button>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-emerald-400/20 bg-black/30 p-4">
                <p className="text-xs text-emerald-300 font-bold uppercase tracking-wide">
                  Copy this into Robinhood
                </p>

                <p className="mt-2 text-xs sm:text-sm font-mono break-all text-white">
                  {publicKey}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    copyText(publicKey, "Public Key")
                  }
                  className="mt-4 w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
                >
                  <FaCopy className="mr-2" />
                  Copy Public Key
                </button>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <FaShieldAlt className="text-emerald-400 mt-0.5 shrink-0" />

                <p className="text-xs text-white/55">
                  IMALI also created the matching private key. Do not paste the private key into Robinhood.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* STEP 2 */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <div className="flex gap-3">
            <div className="shrink-0 h-9 w-9 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center">
              2
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold">
                Add the Public Key to Robinhood
              </h2>

              <p className="text-sm text-white/55 mt-1">
                Robinhood uses it to create your API credential.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-black/25 border border-white/10 p-4 space-y-3">
            <p className="text-sm">
              <strong>A.</strong> Open Robinhood Crypto API.
            </p>

            <p className="text-sm">
              <strong>B.</strong> Choose to create a new API credential.
            </p>

            <p className="text-sm">
              <strong>C.</strong> Paste the <strong>Public Key</strong> from Step 1.
            </p>

            <p className="text-sm">
              <strong>D.</strong> Robinhood will give you an API Key.
            </p>
          </div>

          <a
            href={ROBINHOOD_API_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 w-full inline-flex items-center justify-center rounded-xl bg-white text-slate-950 font-bold px-5 py-3 no-underline hover:bg-white/90"
          >
            Open Robinhood Instructions
            <FaExternalLinkAlt className="ml-2 text-xs" />
          </a>
        </div>

        {/* STEP 3 */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <div className="flex gap-3">
            <div className="shrink-0 h-9 w-9 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center">
              3
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold">
                Paste the API Key Robinhood gives you
              </h2>

              <p className="text-sm text-white/55 mt-1">
                That's it. IMALI already has the matching private key from Step 1.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <label className="block text-sm font-bold mb-2">
              Robinhood API Key
            </label>

            <input
              type="text"
              value={apiKey}
              onChange={(e) =>
                setApiKey(e.target.value)
              }
              placeholder="Paste the API Key from Robinhood"
              autoComplete="off"
              spellCheck="false"
              className="w-full min-w-0 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {!privateKey && (
            <div className="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-3 text-sm text-yellow-100">
              Complete Step 1 first so IMALI can create your matching keys.
            </div>
          )}

          <button
            type="button"
            onClick={handleConnect}
            disabled={
              actionLoading ||
              !apiKey.trim() ||
              !privateKey.trim()
            }
            className="mt-5 w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-black py-3"
          >
            {actionLoading ? (
              <FaSpinner className="animate-spin mr-2" />
            ) : (
              <FaPlug className="mr-2" />
            )}

            {status.connected
              ? "Update Robinhood Crypto Connection"
              : "Connect Robinhood Crypto"}
          </button>
        </div>

        {/* User message */}
        {message && (
          <div
            className={`rounded-xl p-4 text-sm font-medium ${
              messageType === "success"
                ? "bg-emerald-500/15 border border-emerald-400/20 text-emerald-200"
                : messageType === "error"
                ? "bg-red-500/15 border border-red-400/20 text-red-200"
                : "bg-cyan-500/15 border border-cyan-400/20 text-cyan-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* Simple explanation */}
        <div className="text-center px-3">
          <p className="text-xs text-white/40">
            Your Robinhood funds stay in your Robinhood account. This connection is for supported Robinhood Crypto API trading.
          </p>
        </div>
      </div>
    </div>
  );
}