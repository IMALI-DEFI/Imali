const STORAGE_KEY = "imali_marketing_attribution";

const MARKETING_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "marketing_product",
];

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

const inferProduct = (campaign = "", pathname = "") => {
  const value = String(campaign).toUpperCase();
  const path = String(pathname).toLowerCase();

  if (value.startsWith("ADMIN_") || path.includes("managed-admin")) {
    return "managed_admin";
  }

  if (value.startsWith("WL_") || path.includes("white-label")) {
    return "white_label";
  }

  if (value.startsWith("TRADING_")) {
    return "trading";
  }

  return null;
};

export function captureMarketingAttribution() {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);

  const stored = safeParse(
    window.localStorage.getItem(STORAGE_KEY)
  );

  const next = { ...stored };

  let hasMarketingParams = false;

  for (const key of MARKETING_KEYS) {
    const value = params.get(key);

    if (value && value.trim()) {
      next[key] = value.trim();
      hasMarketingParams = true;
    }
  }

  if (hasMarketingParams) {
    next.landing_page =
      `${window.location.origin}${window.location.pathname}`;

    next.captured_at = new Date().toISOString();

    if (!next.marketing_product) {
      next.marketing_product = inferProduct(
        next.utm_campaign,
        window.location.pathname
      );
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(next)
    );
  }

  return next;
}

export function getMarketingAttribution() {
  return captureMarketingAttribution();
}

export function clearMarketingAttribution() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(STORAGE_KEY);
}
