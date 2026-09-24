// Customer-safe presentation defaults; API authorization remains authoritative.
export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const recordRows = value => Array.isArray(value) ? value.filter(isRecord) : [];
export const safeText = (value, fallback = '') => typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
export const storageGet = key => { try { return localStorage.getItem(key); } catch { return null; } };
export const storageSet = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Optional preferences must not prevent rendering. */ } };
export function signOutForRecovery() {
  for (const key of ['imali_token', 'token', 'authToken', 'imali_user', 'imali_activation', 'imali_redirect']) {
    try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch { /* Recovery remains available when storage is disabled. */ }
  }
  window.location.assign('/login?expired=true');
}
export function reportDashboardRequest(status, path, failed) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('imali:request-status', {detail: {status, path: String(path || '').split('?')[0], failed}}));
}
