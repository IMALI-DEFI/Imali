app.get("/api/billing/subscription", authenticateToken, async (req, res) => {
  try {
    const stripe = process.env.STRIPE_SECRET_KEY
      ? new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 15000, maxNetworkRetries: 0 })
      : null;
    if (!stripe) return authError(res, 503, "Billing is temporarily unavailable");
    const user = await getUserById(req.user.id);
    if (!user) return authError(res, 404, "Account not found");
    const billing = parseJsonField(user.billing, {});
    const stripeCustomerId = billing.stripe_customer_id;

    if (!stripeCustomerId) {
      return res.json({
        success: true,
        data: {
          has_subscription: false,
          status: null,
          plan: null,
          amount: null,
          currency: null,
          interval: null
        }
      });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
      limit: 1
    });

    if (!Array.isArray(subscriptions?.data)) throw new Error("SUBSCRIPTION_RESPONSE_INVALID");
    const subscription = subscriptions.data[0];
    if (!subscription) {
      return res.json({
        success: true,
        data: {
          has_subscription: false,
          status: null,
          plan: null,
          amount: null,
          currency: null,
          interval: null
        }
      });
    }

    const item = subscription.items?.data?.[0];
    const plan = item?.price;
    
    return res.json({
      success: true,
      data: {
        has_subscription: true,
        subscription_id: subscription.id,
        status: subscription.status,
        plan: plan?.nickname || plan?.id || 'Unknown',
        amount: plan?.unit_amount || 0,
        currency: plan?.currency || 'usd',
        interval: plan?.recurring?.interval || 'month',
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end
      }
    });

  } catch (error) {
    console.error('BILLING_SUBSCRIPTION_READ_FAILED', {
      type: /^[A-Za-z]+$/.test(error.type || '') ? error.type : 'ReadError',
      http: Number.isInteger(error.statusCode) ? error.statusCode : null
    });
    return authError(res, 503, "Billing is temporarily unavailable. Please try again.");
  }
});
