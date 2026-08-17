import { useEffect } from "react";

const API =
  process.env.REACT_APP_API_URL ||
  "https://api.imali-defi.com";

const sessionId = () => {
  let id = sessionStorage.getItem(
    "imali_marketing_session"
  );

  if (!id) {
    id =
      crypto?.randomUUID?.() ||
      `session-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

    sessionStorage.setItem(
      "imali_marketing_session",
      id
    );
  }

  return id;
};

export const trackMarketingEvent = (
  eventName,
  extra = {}
) => {
  try {
    const params = new URLSearchParams(
      window.location.search
    );

    const storedSource =
      sessionStorage.getItem("imali_utm_source");

    const storedMedium =
      sessionStorage.getItem("imali_utm_medium");

    const storedCampaign =
      sessionStorage.getItem("imali_utm_campaign");

    const storedContent =
      sessionStorage.getItem("imali_utm_content");

    const storedProduct =
      sessionStorage.getItem("imali_product");

    const payload = {
      eventName,
      sessionId: sessionId(),

      utmSource:
        params.get("utm_source") ||
        params.get("src") ||
        storedSource ||
        "direct",

      utmMedium:
        params.get("utm_medium") ||
        storedMedium,

      utmCampaign:
        params.get("utm_campaign") ||
        params.get("campaign") ||
        storedCampaign,

      utmContent:
        params.get("utm_content") ||
        storedContent,

      product:
        params.get("product") ||
        storedProduct ||
        "IMALI",

      landingPage: window.location.href,
      referrer: document.referrer || null,

      ...extra
    };

    fetch(
      `${API}/api/analytics/marketing-event`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        keepalive: true
      }
    ).catch(() => {});

  } catch {
    // Analytics must never break the app.
  }
};

export default function MarketingTracker() {
  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const mappings = [
      ["utm_source", "imali_utm_source"],
      ["utm_medium", "imali_utm_medium"],
      ["utm_campaign", "imali_utm_campaign"],
      ["utm_content", "imali_utm_content"],
      ["product", "imali_product"]
    ];

    mappings.forEach(([query, storage]) => {
      const value =
        params.get(query) ||
        (query === "utm_source"
          ? params.get("src")
          : null);

      if (value) {
        sessionStorage.setItem(storage, value);
      }
    });

    const key =
      `imali_landing_${window.location.pathname}`;

    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");

      trackMarketingEvent(
        "landing_view"
      );
    }
  }, []);

  return null;
}
