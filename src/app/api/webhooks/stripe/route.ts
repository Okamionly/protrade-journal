import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Stripe Webhook URL to configure in Stripe Dashboard:
// https://marketphase.vercel.app/api/webhooks/stripe
// Events to listen: checkout.session.completed, customer.subscription.deleted

// Stripe sends raw body, we need to handle it
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
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
