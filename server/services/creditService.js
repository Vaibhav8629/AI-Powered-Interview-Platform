/**
 * creditService.js
 *
 * Single source of truth for all credit-related operations.
 * Import this wherever credit logic is needed — never duplicate it.
 */

const User = require("../models/User");

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Valid question counts and the matching credit cost. */
const CREDIT_COST_MAP = {
  5: 5,
  10: 10,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the credit cost for a given number of questions.
 * Throws an error for any unsupported value so callers can return 400.
 *
 * @param {number} numberOfQuestions
 * @returns {number} credit cost
 */
function calculateInterviewCost(numberOfQuestions) {
  const n = Number(numberOfQuestions);
  const cost = CREDIT_COST_MAP[n];
  if (cost === undefined) {
    const err = new Error(
      `Invalid numberOfQuestions: ${n}. Supported values are 5 or 10.`
    );
    err.statusCode = 400;
    throw err;
  }
  return cost;
}

/**
 * Determines whether a monthly credit reset is due for the given user.
 *
 * Policy:
 *  - One calendar month is 30 days (simple rolling window).
 *  - If 30+ days have elapsed since creditsResetAt, a reset is due.
 *
 * @param {Object} user  Mongoose User document
 * @returns {boolean}
 */
function isMonthlyResetDue(user) {
  if (!user.creditsResetAt) return true;
  const msPerDay = 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - new Date(user.creditsResetAt).getTime();
  return elapsed >= 30 * msPerDay;
}

/**
 * Returns the number of credits the user's current plan provides per month.
 *
 * @param {Object} user  Mongoose User document
 * @returns {number}
 */
function planAllowance(user) {
  return User.planCredits(user.plan);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core operations (all mutate in memory; caller must call user.save())
// ─────────────────────────────────────────────────────────────────────────────

/**
 * If a monthly reset is due, replaces the user's credits with the full plan
 * allowance and updates creditsResetAt.  The document is NOT saved here so
 * this can be batched with other writes.
 *
 * @param {Object} user  Mongoose User document (mutated in place)
 * @returns {{ reset: boolean, newCredits: number }}
 */
function resetMonthlyCreditsIfNeeded(user) {
  if (!isMonthlyResetDue(user)) {
    return { reset: false, newCredits: user.credits };
  }

  const allowance = planAllowance(user);
  user.credits = allowance;           // unused credits expire
  user.creditsResetAt = new Date();   // rolling 30-day window from now

  return { reset: true, newCredits: allowance };
}

/**
 * Returns true if the user has at least `amount` credits.
 *
 * @param {Object} user
 * @param {number} amount
 * @returns {boolean}
 */
function hasEnoughCredits(user, amount) {
  return user.credits >= amount;
}

/**
 * Deducts `amount` from user.credits.  Does NOT save.
 * Throws if the balance would go negative (safety guard).
 *
 * @param {Object} user
 * @param {number} amount
 */
function deductCredits(user, amount) {
  if (user.credits < amount) {
    const err = new Error("Insufficient credits");
    err.statusCode = 402;
    throw err;
  }
  user.credits -= amount;
}

/**
 * Fetches a fresh user document from MongoDB.
 *
 * @param {string} userId
 * @returns {Promise<Object>} Mongoose User document
 */
async function getUserCredits(userId) {
  const user = await User.findById(userId).select(
    "credits creditsResetAt plan subscriptionStatus currentPeriodEnd"
  );
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  CREDIT_COST_MAP,
  calculateInterviewCost,
  isMonthlyResetDue,
  planAllowance,
  resetMonthlyCreditsIfNeeded,
  hasEnoughCredits,
  deductCredits,
  getUserCredits,
};
