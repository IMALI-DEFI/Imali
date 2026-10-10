app.post("/api/billing/cancel-subscription", authenticateToken, async (req, res) => {
  try {
    const stripe = process.env.STRIPE_SECRET_KEY
      ? new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 15000, maxNetworkRetries: 0 })
      : null;
    if (!stripe) return authError(res, 503, "Subscription cancellation is temporarily unavailable. Please contact support.");
    const user = await getUserById(req.user.id);
    if (!user) return authError(res, 404, "Account not found");
    const billing = parseJsonField(user.billing, {});
    const customerId = user.stripe_customer_id || billing.stripe_customer_id;
    const subscriptionId = user.stripe_subscription_id || billing.stripe_subscription_id;
    const prices = [process.env.STRIPE_PRICE_PRO || process.env.STRIPE_PRO_PRICE_ID,
      process.env.STRIPE_PRICE_ELITE || process.env.STRIPE_ELITE_PRICE_ID].filter(Boolean);
    const isBase = subscription => (subscription.items?.data || []).some(item => prices.includes(item.price?.id));
    if (!customerId || !prices.length)
      return authError(res, 409, "Subscription ownership or plan configuration needs support review");
    let subscription;
    if (subscriptionId) {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (subscription.id !== subscriptionId) throw new Error("SUBSCRIPTION_MISMATCH");
    } else {
      const list = await stripe.subscriptions.list({customer:customerId,status:"all",limit:100});
      if (!Array.isArray(list?.data) || list.has_more)
        return authError(res, 409, "Subscription lookup needs support review");
      const candidates = list.data.filter(s => isBase(s) && !["canceled","incomplete_expired"].includes(s.status));
      if (candidates.length > 1) return authError(res, 409, "Multiple subscriptions need support review");
      subscription = candidates[0];
      if (!subscription) return res.json({success:true,cancellation_scheduled:false,message:"No active base-plan subscription was found"});
    }
    const actualCustomer = String(subscription.customer?.id || subscription.customer || "");
    if (actualCustomer !== String(customerId) || !isBase(subscription) ||
        (subscription.metadata?.user_id && String(subscription.metadata.user_id) !== String(user.id)))
      return authError(res, 409, "Subscription ownership needs support review");
    if (["canceled","incomplete_expired"].includes(subscription.status))
      return res.json({success:true,cancellation_scheduled:false,message:"This subscription has already ended"});
    if (!["active","trialing","past_due","unpaid"].includes(subscription.status))
      return authError(res, 409, "This subscription state needs support review");
    const expectedId = subscription.id;
    if (!subscription.cancel_at_period_end) {
      subscription = await stripe.subscriptions.update(subscription.id,{cancel_at_period_end:true});
      if (subscription.id !== expectedId || String(subscription.customer?.id || subscription.customer || "") !== String(customerId))
        throw new Error("CANCELLATION_CONFIRMATION_MISMATCH");
    }
    if (subscription.cancel_at_period_end !== true)
      throw new Error("CANCELLATION_NOT_CONFIRMED");
    // Provider confirmation precedes all local writes. Paid access remains
    // authoritative until the verified subscription-ended webhook arrives.
    try {
      await db.query(
        `UPDATE users SET billing=COALESCE(billing,'{}'::jsonb)||
         jsonb_build_object('cancel_at_period_end',true,'cancellation_requested_at',$1::text,
                           'stripe_subscription_id',$2::text), updated_at=NOW() WHERE id=$3`,
        [new Date().toISOString(),subscription.id,user.id]
      );
      await addAuditLog(user.id,"CANCEL_SUBSCRIPTION_SCHEDULED",{stripe_subscription_id:subscription.id},req);
    } catch (error) {
      // Do not falsely tell the customer that a confirmed cancellation failed.
      // A repeated request can safely repair local bookkeeping without another
      // provider mutation, and the subscription endpoint reads Stripe directly.
      console.error("CANCELLATION_CONFIRMED_LOCAL_RECORD_FAILED");
    }
    return res.json({success:true,cancellation_scheduled:true,
      message:"Subscription will cancel at the end of the current billing period",
      data:{subscription_status:subscription.status,cancel_at_period_end:true}});
  } catch (error) {
    console.error("CANCELLATION_REQUEST_FAILED");
    return authError(res,503,"Unable to confirm cancellation. Please retry or contact support.");
  }
});
