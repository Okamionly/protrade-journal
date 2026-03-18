import { NextResponse } from "next/server";

export async function POST() {
  // For now, redirect to a Stripe Payment Link
  // The user will set up their Stripe account and replace this URL
  const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/3cI14g3Ca4cAaUYdXN87K00";

  return NextResponse.json({ url: STRIPE_PAYMENT_LINK });
}
