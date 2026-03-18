import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get user email to pre-fill Stripe checkout
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { email: true },
  });

  const STRIPE_PAYMENT_LINK =
    "https://buy.stripe.com/3cI14g3Ca4cAaUYdXN87K00";

  // Append prefilled_email parameter so Stripe captures their email
  const url = `${STRIPE_PAYMENT_LINK}?prefilled_email=${encodeURIComponent(user?.email || session.user.email)}`;

  return NextResponse.json({ url });
}
