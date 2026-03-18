import { NextResponse } from "next/server";

export async function POST() {
  // For now, redirect to a Stripe Payment Link
  // The user will set up their Stripe account and replace this URL
  const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_PLACEHOLDER";

  return NextResponse.json({ url: STRIPE_PAYMENT_LINK });
}
