app.post("/api/stripe/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 15000, maxNetworkRetries: 0 })
    : null;
  if (!stripe) return res.status(503).json({success:false,error:"Billing is temporarily unavailable"});
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    return res.status(400).json({ success: false, error: "Webhook secret not configured" });
  }
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.stripeRawBody || req.body, sig, webhookSecret);
  } catch (err) {
    console.error("WEBHOOK_SIGNATURE_INVALID");
    return res.status(400).json({ success: false, error: "Invalid webhook signature" });
  }
  
  const priceIds = {
    pro: process.env.STRIPE_PRICE_PRO || process.env.STRIPE_PRO_PRICE_ID,
    elite: process.env.STRIPE_PRICE_ELITE || process.env.STRIPE_ELITE_PRICE_ID
  };
  const baseEvents = ["checkout.session.completed", "customer.subscription.created",
    "customer.subscription.updated", "customer.subscription.deleted"];
  if (!baseEvents.includes(event.type)) return res.json({received:true});
  const object = event.data.object;
  if (object.metadata?.product_type === "service_addon") return res.json({received:true});
  let client;
  try {
    let subscription = object;
    if (event.type === "checkout.session.completed") {
      if (object.mode !== "subscription" || !object.subscription) return res.json({received:true});
      subscription = await stripe.subscriptions.retrieve(object.subscription);
      if (subscription.id !== object.subscription) throw new Error("SUBSCRIPTION_MISMATCH");
    } else {
      subscription = await stripe.subscriptions.retrieve(object.id);
      if (subscription.id !== object.id) throw new Error("SUBSCRIPTION_MISMATCH");
      if (event.type === "customer.subscription.deleted" && subscription.status !== "canceled")
        throw new Error("DELETION_NOT_CONFIRMED");
    }
    if (subscription.metadata?.product_type === "service_addon") return res.json({received:true});
    const tiers = [...new Set((subscription.items?.data || []).flatMap(item =>
      Object.entries(priceIds).filter(([,id]) => id && id === item.price?.id).map(([tier])=>tier)))];
    if (tiers.length !== 1) throw new Error("BASE_PRICE_NOT_CONFIRMED");
    const customerId = String(subscription.customer?.id || subscription.customer || "");
    if (!customerId || (object.customer && String(object.customer?.id || object.customer) !== customerId))
      throw new Error("CUSTOMER_MISMATCH");
    client = await db.connect();
    await client.query("BEGIN");
    const owners = await client.query(
      `SELECT id,stripe_subscription_id,billing FROM users WHERE stripe_customer_id=$1 OR billing->>'stripe_customer_id'=$1 FOR UPDATE`,
      [customerId]
    );
    if (owners.rows.length !== 1) throw new Error("CUSTOMER_OWNERSHIP_UNCONFIRMED");
    const owner = String(owners.rows[0].id);
    const boundId = owners.rows[0].stripe_subscription_id || parseJsonField(owners.rows[0].billing, {})?.stripe_subscription_id;
    if (boundId && boundId !== subscription.id) {
      if (!["active", "trialing"].includes(subscription.status)) {
        await client.query("COMMIT");
        return res.json({received:true});
      }
      const bound = await stripe.subscriptions.retrieve(boundId);
      if (!["canceled", "incomplete_expired"].includes(bound.status))
        throw new Error("EXISTING_SUBSCRIPTION_REQUIRES_REVIEW");
    }
    for (const metadata of [object.metadata, subscription.metadata]) {
      if (metadata?.user_id && String(metadata.user_id) !== owner) throw new Error("USER_MISMATCH");
      if (metadata?.tier && metadata.tier !== tiers[0]) throw new Error("PLAN_MISMATCH");
    }
    object.metadata = {...object.metadata,user_id:owner,tier:tiers[0]};
    subscription.metadata = {...subscription.metadata,user_id:owner,tier:tiers[0]};
    if (event.type !== "checkout.session.completed") event.data.object = subscription;
    // Handle the event only after signature, price and ownership verification.
    switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.user_id;

      if (!userId) {
        console.warn("Stripe checkout completed without user_id metadata");
        break;
      }

      if (session.mode !== "subscription" || !session.subscription) {
        console.warn(`Stripe checkout ${session.id} was not a completed subscription checkout`);
        break;
      }

      const purchasedTier =
        ["pro", "elite"].includes(session.metadata?.tier)
          ? session.metadata.tier
          : "pro";

      const stripeSubscription = subscription;

      const stripeStatus = stripeSubscription.status;
      const entitled = ["active", "trialing"].includes(stripeStatus);

      if (!entitled) {
        console.warn(
          `Stripe subscription ${stripeSubscription.id} is ${stripeStatus}; access not activated`
        );
        break;
      }

      await client.query(
        `UPDATE users
         SET tier = $1,
             tier_active = $1,
             stripe_customer_id = $2,
             stripe_subscription_id = $3,
             subscription_status = $4,
             billing_complete = true,
             billing =
               COALESCE(billing, '{}'::jsonb) ||
               jsonb_build_object(
                 'stripe_customer_id', $2::text,
                 'stripe_subscription_id', $3::text,
                 'billing_complete', true,
                 'has_card_on_file', true
               ),
             trial_status = 'converted',
             updated_at = NOW()
         WHERE id = $5`,
        [
          purchasedTier,
          String(session.customer || ""),
          stripeSubscription.id,
          stripeStatus,
          userId
        ]
      );

      // Keep API-key entitlement synchronized with the verified Stripe plan.
      const purchasedLimits = getTierLimits(purchasedTier);

      await client.query(
        `UPDATE user_api_keys
         SET plan = $1,
             daily_trade_limit = $2,
             position_size_limit_usd = $3
         WHERE user_id = $4
           AND is_active = true`,
        [
          purchasedTier,
          purchasedLimits.daily_trade_limit,
          purchasedLimits.position_size_limit_usd,
          userId
        ]
      );


      // Subscription purchase grants entitlement.
      // It intentionally does NOT automatically enable real-money trading.

      console.log(
        `✅ User ${userId} activated ${purchasedTier} via Stripe subscription ${stripeSubscription.id}`
      );

      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const stripeStatus = subscription.status;
      const customerId = String(subscription.customer || "");
      const subscriptionId = subscription.id;

      // Prefer Stripe metadata. Fall back to the customer/subscription
      // already associated with the IMALI account.
      let userId = subscription.metadata?.user_id || null;

      let purchasedTier =
        ["pro", "elite"].includes(subscription.metadata?.tier)
          ? subscription.metadata.tier
          : null;

      let userResult;

      if (userId) {
        userResult = await client.query(
          `SELECT id, tier, billing
           FROM users
           WHERE id = $1
           LIMIT 1`,
          [userId]
        );
      } else {
        userResult = await client.query(
          `SELECT id, tier, billing
           FROM users
           WHERE stripe_customer_id = $1
              OR stripe_subscription_id = $2
              OR billing->>'stripe_customer_id' = $1
              OR billing->>'stripe_subscription_id' = $2
           LIMIT 1`,
          [customerId, subscriptionId]
        );

        userId = userResult.rows[0]?.id || null;
      }

      if (!userId || !userResult || userResult.rows.length === 0) {
        console.warn(
          `Stripe subscription ${subscriptionId} could not be matched to an IMALI user`
        );
        break;
      }

      // Metadata should normally provide this. Existing paid tier is a
      // safe fallback for historical subscriptions.
      if (!purchasedTier) {
        purchasedTier =
          ["pro", "elite"].includes(userResult.rows[0].tier)
            ? userResult.rows[0].tier
            : "pro";
      }

      const entitled = ["active", "trialing"].includes(stripeStatus);

      if (entitled) {
        await client.query(
          `UPDATE users
           SET tier = $1,
               tier_active = $1,
               stripe_customer_id = $2,
               stripe_subscription_id = $3,
               subscription_status = $4,
               billing_complete = true,
               billing =
                 COALESCE(billing, '{}'::jsonb) ||
                 jsonb_build_object(
                   'stripe_customer_id', $2::text,
                   'stripe_subscription_id', $3::text,
                   'billing_complete', true,
                   'has_card_on_file', true
                 ),
               trial_status =
                 CASE
                   WHEN $4 = 'active' THEN 'converted'
                   ELSE trial_status
                 END,
               updated_at = NOW()
           WHERE id = $5`,
          [
            purchasedTier,
            customerId,
            subscriptionId,
            stripeStatus,
            userId
          ]
        );

        const limits = getTierLimits(purchasedTier);

        await client.query(
          `UPDATE user_api_keys
           SET plan = $1,
               daily_trade_limit = $2,
               position_size_limit_usd = $3
           WHERE user_id = $4
             AND is_active = true`,
          [
            purchasedTier,
            limits.daily_trade_limit,
            limits.position_size_limit_usd,
            userId
          ]
        );

        console.log(
          `✅ Stripe sync: ${userId} => ${purchasedTier}/${stripeStatus} (${subscriptionId})`
        );
      } else {
        // Stripe no longer grants paid entitlement.
        const starterLimits = getTierLimits("starter");

        await client.query(
          `UPDATE users
           SET tier = 'starter',
               tier_active = 'starter',
               stripe_customer_id = $1,
               stripe_subscription_id = $2,
               subscription_status = $3,
               billing_complete = false,
               trading_enabled = false,
               paper_trading_enabled = false,
               billing =
                 COALESCE(billing, '{}'::jsonb) ||
                 jsonb_build_object(
                   'stripe_customer_id', $1::text,
                   'stripe_subscription_id', $2::text,
                   'billing_complete', false
                 ),
               updated_at = NOW()
           WHERE id = $4`,
          [customerId, subscriptionId, stripeStatus, userId]
        );

        await client.query(
          `UPDATE user_api_keys
           SET plan = 'starter',
               daily_trade_limit = $1,
               position_size_limit_usd = $2
           WHERE user_id = $3
             AND is_active = true`,
          [
            starterLimits.daily_trade_limit,
            starterLimits.position_size_limit_usd,
            userId
          ]
        );

        console.log(
          `⚠️ Stripe sync: revoked paid entitlement for ${userId}; status=${stripeStatus}`
        );
      }

      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = String(subscription.customer || "");
      const subscriptionId = subscription.id;

      const userResult = await client.query(
        `SELECT id
         FROM users
         WHERE id = $1 LIMIT 1`,
        [owner]
      );

      if (userResult.rows.length > 0) {
        const userId = userResult.rows[0].id;
        const starterLimits = getTierLimits("starter");

        await client.query(
          `UPDATE users
           SET tier = 'starter',
               tier_active = 'starter',
               subscription_status = 'cancelled',
               billing_complete = false,
               stripe_customer_id = $1,
               stripe_subscription_id = $2,
               trading_enabled = false,
               paper_trading_enabled = false,
               billing =
                 COALESCE(billing, '{}'::jsonb) ||
                 jsonb_build_object(
                   'stripe_customer_id', $1::text,
                   'stripe_subscription_id', $2::text,
                   'billing_complete', false
                 ),
               updated_at = NOW()
           WHERE id = $3`,
          [customerId, subscriptionId, userId]
        );

        await client.query(
          `UPDATE user_api_keys
           SET plan = 'starter',
               daily_trade_limit = $1,
               position_size_limit_usd = $2
           WHERE user_id = $3
             AND is_active = true`,
          [
            starterLimits.daily_trade_limit,
            starterLimits.position_size_limit_usd,
            userId
          ]
        );

        console.log(
          `⚠️ Stripe subscription deleted: revoked paid access for ${userId}`
        );
      } else {
        console.warn(
          `Stripe subscription deleted but no IMALI user matched customer ${customerId}`
        );
      }

      break;
    }

    case 'invoice.payment_failed':
      const invoice = event.data.object;
      console.log(`💳 Payment failed for customer: ${invoice.customer}`);
      // Optionally notify user
      break;
  }
  
    await client.query("COMMIT");
    return res.json({ received: true });
  } catch (error) {
    if (client) { try { await client.query("ROLLBACK"); } catch {} }
    console.error("BILLING_WEBHOOK_PROCESSING_FAILED");
    return res.status(503).json({success:false,error:"Billing event could not be processed"});
  } finally {
    if (client) client.release();
  }
});