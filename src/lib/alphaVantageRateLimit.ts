// ---------------------------------------------------------------------------
// Shared Alpha Vantage rate limiter
// Free tier: 25 requests/day, 5 requests/minute
// ---------------------------------------------------------------------------

interface RateLimitState {
  minuteRequests: number[];  // timestamps of requests in current minute window
  dailyCount: number;
  dailyResetAt: number;      // timestamp when daily counter resets
}

const state: RateLimitState = {
  minuteRequests: [],
  dailyCount: 0,
  dailyResetAt: Date.now() + 24 * 60 * 60 * 1000,
};

const MAX_PER_MINUTE = 4; // stay under the 5/min limit
const MAX_PER_DAY = 20;   // stay under the 25/day limit

/**
 * Check if we can make a request to Alpha Vantage.
 * Returns true if under rate limits, false otherwise.
 */
export function canMakeRequest(): boolean {
  const now = Date.now();

  // Reset daily counter if needed
  if (now > state.dailyResetAt) {
    state.dailyCount = 0;
    state.dailyResetAt = now + 24 * 60 * 60 * 1000;
  }

  // Clean up minute window
  state.minuteRequests = state.minuteRequests.filter(
    (ts) => now - ts < 60 * 1000
  );

  return (
    state.minuteRequests.length < MAX_PER_MINUTE &&
    state.dailyCount < MAX_PER_DAY
  );
}

/**
 * Record that a request was made.
 */
export function recordRequest(): void {
  const now = Date.now();
  state.minuteRequests.push(now);
  state.dailyCount++;
}

/**
 * Get current rate limit status for debugging/display.
 */
export function getRateLimitStatus() {
  const now = Date.now();
  const minuteReqs = state.minuteRequests.filter(
    (ts) => now - ts < 60 * 1000
  ).length;

  return {
    minuteUsed: minuteReqs,
    minuteLimit: MAX_PER_MINUTE,
    dailyUsed: state.dailyCount,
    dailyLimit: MAX_PER_DAY,
    canRequest: canMakeRequest(),
  };
}
