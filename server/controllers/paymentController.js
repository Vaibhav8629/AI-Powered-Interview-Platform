const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User");
const { resetMonthlyCreditsIfNeeded } = require("../services/creditService");

// ─────────────────────────────────────────────────────────────────────────────
// Plan config — add future plans here without changing logic elsewhere
// ─────────────────────────────────────────────────────────────────────────────
function getPlanConfig() {
  return {
    [process.env.STRIPE_PRICE_ID_STANDARD]: {
      plan: "standard",
      monthlyCredits: 50,
    },
    [process.env.STRIPE_PRICE_ID_PREMIUM]: {
      plan: "premium",
      monthlyCredits: 100,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/create-checkout-session
// ─────────────────────────────────────────────────────────────────────────────
const createCheckoutSession = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { priceId } = req.body;
    const planConfig = getPlanConfig();

    if (!priceId || !planConfig[priceId]) {
      return res.status(400).json({ success: false, message: "Invalid or missing priceId" });
    }

    // Reuse existing Stripe customer if available
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: String(user._id) },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const config = planConfig[priceId];

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/payment/cancel`,

      // ── FIX: session.metadata carries userId + plan info reliably ──
      // This is what the webhook reads. Session metadata is always
      // accessible on the checkout.session.completed event object.
      metadata: {
        userId: String(user._id),
        priceId,
        plan: config.plan,
        monthlyCredits: String(config.monthlyCredits),
      },

      // Also set on the subscription so renewal events can find the user
      subscription_data: {
        metadata: {
          userId: String(user._id),
          priceId,
        },
      },
    });

    console.log(`[Checkout] Session created: ${session.id} for user ${user._id} (${config.plan})`);
    return res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    console.error("[Checkout] createCheckoutSession error:", error);
    return res.status(500).json({ success: false, message: "Failed to create checkout session" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/webhook
// IMPORTANT: express.raw() is applied to this path in server.js BEFORE
// express.json(), so req.body is a raw Buffer here — required by Stripe.
// ─────────────────────────────────────────────────────────────────────────────
const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  console.log("[Webhook] Event received");

  // ── Step 1: Verify Stripe signature ─────────────────────────────────────
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,                        // raw Buffer — must NOT be JSON-parsed first
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[Webhook] Signature verification FAILED:", err.message);
    // Return 400 so Stripe knows this delivery failed and will retry
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Webhook] Event type: ${event.type} | Event ID: ${event.id}`);

  const planConfig = getPlanConfig();

  try {
    switch (event.type) {

      // ── PRIMARY: Checkout completed — payment confirmed ──────────────────
      // This is the ONLY place new subscriptions grant credits.
      // The session object reliably contains our metadata.
      case "checkout.session.completed": {
        await handleCheckoutSessionCompleted(event.data.object, planConfig);
        break;
      }

      // ── Subscription status updates (payment method changes, etc.) ───────
      // We sync plan/status fields but do NOT re-grant initial credits here.
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event.data.object, planConfig);
        break;
      }

      // ── Subscription cancelled ───────────────────────────────────────────
      case "customer.subscription.deleted": {
        await handleSubscriptionCancelled(event.data.object);
        break;
      }

      // ── Monthly renewal — allocate fresh credits for the new period ──────
      case "invoice.paid": {
        const invoice = event.data.object;
        // Only act on renewal cycles, not the first payment (handled above)
        if (invoice.billing_reason === "subscription_cycle") {
          await handleSubscriptionRenewal(invoice, planConfig);
        }
        break;
      }

      // ── Payment failure ──────────────────────────────────────────────────
      case "invoice.payment_failed": {
        await handlePaymentFailed(event.data.object);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type} — ignored`);
        break;
    }
  } catch (err) {
    console.error(`[Webhook] Handler error for ${event.type}:`, err);
    // Return 200 so Stripe does not keep retrying for logic/DB errors.
    // The error is logged for investigation.
    return res.status(200).json({ received: true, warning: "Handler error — check server logs" });
  }

  return res.status(200).json({ received: true });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/create-portal-session
// ─────────────────────────────────────────────────────────────────────────────
const createPortalSession = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: "No Stripe customer found. Please subscribe first.",
      });
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${clientUrl}/pricing`,
    });

    return res.status(200).json({ success: true, url: portalSession.url });
  } catch (error) {
    console.error("[Portal] createPortalSession error:", error);
    return res.status(500).json({ success: false, message: "Failed to create portal session" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payment/subscription
// ─────────────────────────────────────────────────────────────────────────────
const getSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "credits creditsResetAt plan subscriptionStatus currentPeriodStart currentPeriodEnd stripeCustomerId stripeSubscriptionId"
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { reset } = resetMonthlyCreditsIfNeeded(user);
    if (reset) await user.save();

    return res.status(200).json({
      success: true,
      credits: user.credits,
      creditsResetAt: user.creditsResetAt,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodStart: user.currentPeriodStart,
      currentPeriodEnd: user.currentPeriodEnd,
      hasActiveSubscription: user.plan !== "free" && user.subscriptionStatus === "active",
    });
  } catch (error) {
    console.error("[Subscription] getSubscription error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal webhook handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle checkout.session.completed
 *
 * This is called exactly once per successful payment. We use the session ID
 * for idempotency — if Stripe delivers the same event twice, we detect the
 * duplicate and skip without re-granting credits.
 *
 * @param {Object} session     Stripe CheckoutSession object
 * @param {Object} planConfig  priceId → { plan, monthlyCredits }
 */
async function handleCheckoutSessionCompleted(session, planConfig) {
  const sessionId = session.id;

  console.log(`[Webhook] checkout.session.completed | Session: ${sessionId}`);

  // ── Read userId from session metadata (reliably set at session creation) ──
  const userId = session.metadata?.userId;
  const priceId = session.metadata?.priceId;
  const plan = session.metadata?.plan;
  const monthlyCredits = parseInt(session.metadata?.monthlyCredits, 10);

  console.log("========== STRIPE CHECKOUT DEBUG ==========");
console.log("[Webhook] Session ID:", session.id);
console.log("[Webhook] Customer ID:", session.customer);
console.log("[Webhook] Subscription ID:", session.subscription);
console.log("[Webhook] Metadata:", session.metadata);
console.log("[Webhook] userId:", userId);
console.log("[Webhook] priceId:", priceId);
console.log("[Webhook] plan:", plan);
console.log("[Webhook] monthlyCredits:", monthlyCredits);
console.log("============================================");

  if (!userId) {
    console.error("[Webhook] No userId in session metadata — cannot grant credits. Session:", sessionId);
    return;
  }

  if (!plan || isNaN(monthlyCredits)) {
    console.error("[Webhook] Missing plan/monthlyCredits in session metadata. Session:", sessionId);
    return;
  }

  // ── Fetch user with idempotency field ──────────────────────────────────
  const user = await User.findById(userId).select("+processedCheckoutSessions");
  if (!user) {
    console.error(`[Webhook] User not found for userId: ${userId}`);
    return;
  }

  console.log(`[Webhook] User found: ${user.email} (${user._id})`);

  console.log("[Webhook] DB User ID:", user._id.toString());
console.log("[Webhook] DB User Email:", user.email);
console.log("[Webhook] DB Credits BEFORE:", user.credits);
console.log("[Webhook] DB Plan BEFORE:", user.plan);
console.log("[Webhook] DB Subscription Status BEFORE:", user.subscriptionStatus);

  // ── Idempotency check ──────────────────────────────────────────────────
  if (user.processedCheckoutSessions.includes(sessionId)) {
    console.warn(`[Webhook] DUPLICATE detected — session ${sessionId} already processed for user ${userId}. Skipping.`);
    return;
  }

  const creditsBefore = user.credits;
  console.log(`[Webhook] Credits BEFORE update: ${creditsBefore}`);

  // ── Update plan, status, and credits ──────────────────────────────────
  user.plan = plan;
  user.subscriptionStatus = "active";
  user.credits = monthlyCredits;        // full plan allowance for the new period
  user.creditsResetAt = new Date();
  user.stripeCustomerId = session.customer;
  user.stripeSubscriptionId = session.subscription;

  // Retrieve period dates from the Stripe subscription object if available
if (session.subscription) {
  try {   
    const sub = await stripe.subscriptions.retrieve(session.subscription);

    if (
      typeof sub.current_period_start === "number" &&
      typeof sub.current_period_end === "number"
    ) {
      user.currentPeriodStart = new Date(
        sub.current_period_start * 1000
      );

      user.currentPeriodEnd = new Date(
        sub.current_period_end * 1000
      );
    }
  } catch (err) {
    console.warn(
      "[Webhook] Could not retrieve subscription period dates:",
      err.message
    );
  }
}

  // ── Mark session as processed (idempotency) ────────────────────────────
  user.processedCheckoutSessions.push(sessionId);

  // Keep the array bounded so it doesn't grow indefinitely
  if (user.processedCheckoutSessions.length > 100) {
    user.processedCheckoutSessions = user.processedCheckoutSessions.slice(-100);
  }

  console.log("---------- BEFORE SAVE ----------");
console.log("user.credits:", user.credits);
console.log("user.plan:", user.plan);
console.log("user.subscriptionStatus:", user.subscriptionStatus);
console.log("user.creditsResetAt:", user.creditsResetAt);
console.log("user.stripeCustomerId:", user.stripeCustomerId);
console.log("user.stripeSubscriptionId:", user.stripeSubscriptionId);
console.log("--------------------------------");

  await user.save();

  const creditsAfter = user.credits;
  console.log(`[Webhook] Credits AFTER update: ${creditsAfter}`);
  console.log(`[Webhook] ✅ Plan activated: ${plan} | User: ${user.email} | Credits: ${creditsBefore} → ${creditsAfter}`);
}

/**
 * Handle customer.subscription.updated
 *
 * Syncs plan/status changes (e.g., payment method update, past_due recovery).
 * Does NOT re-grant credits — that already happened in checkout.session.completed.
 *
 * @param {Object} subscription  Stripe Subscription object
 * @param {Object} planConfig
 */
async function handleSubscriptionUpdated(subscription, planConfig) {
  const customerId = subscription.customer;
  const subId = subscription.id;
  const stripeStatus = subscription.status;

  console.log(`[Webhook] subscription.updated | Sub: ${subId} | Status: ${stripeStatus}`);

  // Find user by stripeSubscriptionId (most reliable after checkout.session.completed set it)
  // Fall back to customerId or subscription metadata
  const userId = subscription.metadata?.userId;
  let user = await User.findOne({ stripeSubscriptionId: subId });

  if (!user && userId) {
    user = await User.findById(userId);
  }
  if (!user) {
    user = await User.findOne({ stripeCustomerId: customerId });
  }

  if (!user) {
    console.warn(`[Webhook] subscription.updated: user not found for sub ${subId} / customer ${customerId}`);
    return;
  }

  // Determine plan from price ID
  const priceId = subscription.items?.data?.[0]?.price?.id || subscription.metadata?.priceId;
  const config = planConfig[priceId];

  if (config) {
    user.plan = config.plan;
  }

  user.subscriptionStatus = stripeStatus;
  user.stripeSubscriptionId = subId;
  user.stripeCustomerId = customerId;

  // Guard against invalid timestamps from Stripe
  if (
    typeof subscription.current_period_start === "number" &&
    !isNaN(subscription.current_period_start)
  ) {
    user.currentPeriodStart = new Date(subscription.current_period_start * 1000);
  }
  if (
    typeof subscription.current_period_end === "number" &&
    !isNaN(subscription.current_period_end)
  ) {
    user.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  }

  await user.save();
  console.log(`[Webhook] subscription.updated synced for user: ${user.email} | Status: ${stripeStatus}`);
}

/**
 * Handle customer.subscription.deleted
 *
 * @param {Object} subscription  Stripe Subscription object
 */
async function handleSubscriptionCancelled(subscription) {
  const subId = subscription.id;
  const customerId = subscription.customer;

  console.log(`[Webhook] subscription.deleted | Sub: ${subId}`);

  let user = await User.findOne({ stripeSubscriptionId: subId });
  if (!user) {
    user = await User.findOne({ stripeCustomerId: customerId });
  }

  if (!user) {
    console.warn(`[Webhook] subscription.deleted: user not found for sub ${subId}`);
    return;
  }

  user.plan = "free";
  user.subscriptionStatus = "canceled";
  user.stripeSubscriptionId = null;
  user.currentPeriodStart = null;
  user.currentPeriodEnd = null;
  // Credits remain until next monthly reset

  await user.save();
  console.log(`[Webhook] Subscription cancelled for user: ${user.email}`);
}

/**
 * Handle invoice.paid for subscription_cycle (monthly renewal)
 *
 * Allocates fresh monthly credits at the start of each new billing period.
 * Unused credits from the previous period expire (replaced, not added).
 *
 * @param {Object} invoice     Stripe Invoice object
 * @param {Object} planConfig
 */
async function handleSubscriptionRenewal(invoice, planConfig) {
  const customerId = invoice.customer;
  const subId = invoice.subscription;

  console.log(`[Webhook] invoice.paid (renewal) | Sub: ${subId} | Customer: ${customerId}`);

  let user = await User.findOne({ stripeSubscriptionId: subId });
  if (!user) {
    user = await User.findOne({ stripeCustomerId: customerId });
  }

  if (!user) {
    console.warn(`[Webhook] invoice.paid renewal: user not found for customer ${customerId}`);
    return;
  }

  const priceId = invoice.lines?.data?.[0]?.price?.id;
  const config = planConfig[priceId];

  if (!config) {
    console.warn(`[Webhook] invoice.paid renewal: unknown priceId ${priceId}`);
    return;
  }

  const creditsBefore = user.credits;
  user.credits = config.monthlyCredits;   // reset — unused credits expire
  user.creditsResetAt = new Date();
  user.subscriptionStatus = "active";

  await user.save();
  console.log(`[Webhook] ✅ Renewal credits granted for ${user.email}: ${creditsBefore} → ${user.credits}`);
}

/**
 * Handle invoice.payment_failed
 *
 * @param {Object} invoice  Stripe Invoice object
 */
async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;

  console.log(`[Webhook] invoice.payment_failed | Customer: ${customerId}`);

  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) return;

  user.subscriptionStatus = "past_due";
  await user.save();
  console.log(`[Webhook] Marked past_due for user: ${user.email}`);
}

module.exports = {
  createCheckoutSession,
  handleWebhook,
  createPortalSession,
  getSubscription,
};
