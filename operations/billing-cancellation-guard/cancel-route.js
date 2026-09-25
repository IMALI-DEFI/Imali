app.post("/api/billing/cancel-subscription", authenticateToken, async (req, res) => {
  // Fail before local account changes when the payment client is unavailable.
  if (typeof stripe === "undefined" || !stripe) {
    return authError(res, 503, "Subscription cancellation is temporarily unavailable. Please contact support.");
  }
  try {
    const user = await getUserById(req.user.id);
    
    // Cancel at period end (don't remove immediately)
    await db.query(
      `UPDATE users 
       SET subscription_status = 'cancelling',
           trading_enabled = false,
           updated_at = NOW()
       WHERE id = $1`,
      [req.user.id]
    );
    
    // If Stripe subscription exists, cancel it at period end
    const billing = parseJsonField(user.billing, {});
    if (stripe && billing.stripe_subscription_id) {
      await stripe.subscriptions.update(billing.stripe_subscription_id, {
        cancel_at_period_end: true
      });
    }
    
    await addAuditLog(req.user.id, "CANCEL_SUBSCRIPTION", {}, req);
    
    res.json({
      success: true,
      message: "Subscription will be cancelled at the end of the billing period"
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});