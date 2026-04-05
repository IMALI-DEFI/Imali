// ==============================================
// REFERRAL API
// ==============================================

export const getReferralInfo = async () => {
  try {
    const response = await api.get("/api/referrals/info");
    const data = unwrap(response);
    return data?.data || data || { code: null, count: 0, earned: 0, pending: 0 };
  } catch (error) {
    console.warn("[BotAPI] getReferralInfo failed:", error);
    return { code: null, count: 0, earned: 0, pending: 0 };
  }
};

export const getReferralStats = async () => {
  try {
    const response = await api.get("/api/referrals/stats");
    const data = unwrap(response);
    return data?.data || data || { total_referrals: 0, total_earned: 0, pending_rewards: 0 };
  } catch (error) {
    console.warn("[BotAPI] getReferralStats failed:", error);
    return { total_referrals: 0, total_earned: