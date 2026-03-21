import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Stripe Webhook URL: https://marketphase.vercel.app/api/webhooks/stripe
// Events: checkout.session.completed, customer.subscription.deleted

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

function verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const parts = signature.split(",").reduce((acc, part) => {
      const [key, value] = part.split("=");
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = parts["t"];
    const sig = parts["v1"];

    if (!timestamp || !sig) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") || "";

    // Reject if no webhook secret is configured
    if (!WEBHOOK_SECRET) {
      console.error("[Stripe] STRIPE_WEBHOOK_SECRET not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }

    if (!verifyStripeSignature(body, signature, WEBHOOK_SECRET)) {
      console.error("[Stripe] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const customerEmail =
        session.customer_email || session.customer_details?.email;

      if (customerEmail) {
        // Upgrade user to VIP
        await prisma.user.updateMany({
          where: { email: customerEmail },
          data: { role: "VIP" },
        });
        console.log(`[Stripe] Upgraded ${customerEmail} to VIP`);
      }
    }

    // Handle customer.subscription.deleted (cancellation)
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      // We'd need to find the user by Stripe customer ID
      // For now, log it
      console.log("[Stripe] Subscription cancelled:", subscription.id);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook Error]", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
