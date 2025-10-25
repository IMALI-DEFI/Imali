// src/utils/newsletter.js
/**
 * Newsletter helper used by SignupForm. Replace with your real list provider.
 * For example, call your backend: POST /newsletter/subscribe
 */
export async function subscribeEmail(payload) {
  // no-op fallback to avoid breaking the UI if you haven't wired this yet
  if (!process.env.REACT_APP_NEWSLETTER_ENDPOINT) return;

  const res = await fetch(process.env.REACT_APP_NEWSLETTER_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Newsletter subscribe failed: ${res.status} ${text}`);
  }
  return true;
}
