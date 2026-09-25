app.post(["/api/subscription/create-checkout", "/api/billing/create-checkout-session"], authenticateToken, async (req, res) => {
  const { price_id, success_url, cancel_url } = req.body || {};
  try {
    const stripe = process.env.STRIPE_SECRET_KEY
      ? new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 15000, maxNetworkRetries: 0 })
      : null;
    if (!stripe) return authError(res, 503, "Payment system not configured");
    const SITE_ORIGIN = "https://imali-defi.com";
    const serverPriceIds = {
      pro: process.env.STRIPE_PRICE_PRO || process.env.STRIPE_PRO_PRICE_ID,
      elite: process.env.STRIPE_PRICE_ELITE || process.env.STRIPE_ELITE_PRICE_ID
    };
    const requestedTier = Object.entries(serverPriceIds).find(
      ([, id]) => id && id === price_id
    )?.[0];
    if (!requestedTier) return authError(res, 400, "Invalid or unconfigured subscription price");
    const checkoutPriceId = serverPriceIds[requestedTier];
    for (const target of [success_url, cancel_url]) {
      if (!target) continue;
      let parsed;
      try { parsed = new URL(target); } catch { return authError(res, 400, "Invalid checkout return URL"); }
      if (parsed.origin !== SITE_ORIGIN || parsed.username || parsed.password)
        return authError(res, 400, "Invalid checkout return URL");
    }
    const user = await getUserById(req.user.id);
    if (!user) return authError(res, 404, "Account not found");
    const billing = parseJsonField(user.billing, {});
    let customerId = user.stripe_customer_id || billing.stripe_customer_id;
    if (customerId) {
      const existing = await stripe.subscriptions.list({customer:customerId,status:"all",limit:100});
      if (!Array.isArray(existing?.data)) throw new Error("SUBSCRIPTION_RESPONSE_INVALID");
      if (existing.has_more || existing.data.some(subscription =>
        ["active", "trialing", "past_due", "incomplete", "unpaid"].includes(subscription.status) &&
        (subscription.items?.data || []).some(item => Object.values(serverPriceIds).filter(Boolean).includes(item.price?.id))
      )) return authError(res, 409, "An existing subscription needs review before starting another checkout");
    } else {
      const customer = await stripe.customers.create({email:user.email,metadata:{user_id:user.id}});
      customerId = customer.id;
      if (!customerId) throw new Error("CUSTOMER_ID_MISSING");
      await db.query(
        `UPDATE users SET stripe_customer_id=$1,
         billing=COALESCE(billing,'{}'::jsonb)||jsonb_build_object('stripe_customer_id',$1::text),
         updated_at=NOW() WHERE id=$2`,
        [customerId,user.id]
      );
    }
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: checkoutPriceId, quantity: 1 }],
      mode: 'subscription',
      payment_method_collection: 'if_required',
      success_url: success_url || `${SITE_ORIGIN}/dashboard?upgrade=success`,
      cancel_url: cancel_url || `${SITE_ORIGIN}/pricing`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        tier: requestedTier
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier: requestedTier
        }
      }
    });
    
    if (!session.id || !session.url) throw new Error("CHECKOUT_CONFIRMATION_MISSING");
    res.json({ success: true, data: { session_url: session.url, session_id: session.id } });
  } catch (error) {
    console.error("CHECKOUT_PREPARATION_FAILED");
    return authError(res, 503, "Unable to prepare checkout. Please try again or contact support.");
  }
});

