import React, { useCallback, useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaCreditCard,
  FaDatabase,
  FaExternalLinkAlt,
  FaFootballBall,
  FaServer,
  FaSyncAlt,
  FaTimesCircle,
} from "react-icons/fa";

import BotAPI from "../../utils/BotAPI";
import "./AdminSportsJedi.css";

export default function AdminSportsJedi() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await BotAPI.getSportsJediOverview();

      setData(response?.data || response);
    } catch (err) {
      console.error("Sports Jedi admin error:", err);

      setError(
        err?.response?.data?.error ||
        err?.message ||
        "Unable to load Sports Jedi."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="sj-admin">
        <div className="sj-loading">
          <FaSyncAlt className="spin" />
          Loading Sports Jedi...
        </div>
      </div>
    );
  }

  const service = data?.service || {};
  const config = data?.configuration || {};

  return (
    <div className="sj-admin">
      <div className="sj-header">
        <div>
          <h1>Sports Jedi</h1>
          <p>
            Sports intelligence, subscriptions and system health.
          </p>
        </div>

        <div className="sj-header-actions">
          <a
            href={service.publicUrl || "https://sportsjedi.com"}
            target="_blank"
            rel="noreferrer"
            className="sj-button"
          >
            <FaExternalLinkAlt />
            Open Site
          </a>

          <button
            className="sj-button"
            onClick={load}
          >
            <FaSyncAlt />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="sj-error">
          {error}
        </div>
      )}

      <div className="sj-cards">
        <StatusCard
          icon={<FaServer />}
          label="API Status"
          good={service.healthy}
          value={service.healthy ? "Online" : "Offline"}
        />

        <StatusCard
          icon={<FaDatabase />}
          label="Sports Data API"
          good={config.sportsApiConfigured}
          value={
            config.sportsApiConfigured
              ? "Configured"
              : "Missing"
          }
        />

        <StatusCard
          icon={<FaCreditCard />}
          label="Stripe"
          good={config.stripeConfigured}
          value={
            config.stripeConfigured
              ? "Connected"
              : "Missing"
          }
        />

        <StatusCard
          icon={<FaFootballBall />}
          label="Sports Provider"
          good={Boolean(config.sportsProvider)}
          value={
            config.sportsProvider ||
            "Not configured"
          }
        />
      </div>

      <div className="sj-panel">
        <h2>Subscription Configuration</h2>

        <div className="sj-config-grid">
          <ConfigRow
            label="Monthly Price"
            good={config.monthlyPriceConfigured}
          />

          <ConfigRow
            label="Annual Price"
            good={config.annualPriceConfigured}
          />

          <ConfigRow
            label="Stripe Secret"
            good={config.stripeConfigured}
          />

          <ConfigRow
            label="Sports API Key"
            good={config.sportsApiConfigured}
          />
        </div>
      </div>

      <div className="sj-panel">
        <h2>Service Information</h2>

        <div className="sj-info">
          <div>
            <span>Public URL</span>
            <strong>
              {service.publicUrl || "—"}
            </strong>
          </div>

          <div>
            <span>API</span>
            <strong>
              {service.apiBase || "—"}
            </strong>
          </div>

          <div>
            <span>Health HTTP</span>
            <strong>
              {service.healthStatus || "—"}
            </strong>
          </div>

          <div>
            <span>Service</span>
            <strong>
              {service.health?.service || "sports-jedi-api"}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  good,
  value,
}) {
  return (
    <div className="sj-card">
      <div className="sj-card-icon">
        {icon}
      </div>

      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>

      <div
        className={
          good
            ? "sj-status good"
            : "sj-status bad"
        }
      >
        {good
          ? <FaCheckCircle />
          : <FaTimesCircle />
        }
      </div>
    </div>
  );
}

function ConfigRow({
  label,
  good,
}) {
  return (
    <div className="sj-config-row">
      <span>{label}</span>

      <strong
        className={
          good
            ? "sj-good-text"
            : "sj-bad-text"
        }
      >
        {good
          ? "Ready"
          : "Needs setup"
        }
      </strong>
    </div>
  );
}
