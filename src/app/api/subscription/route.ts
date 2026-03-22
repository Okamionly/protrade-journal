import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// GET /api/subscription — return current user plan info
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, createdAt: true },
  });

  if (!user)
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  // Map role to plan
  const planMap: Record<string, { plan: string; price: number }> = {
    USER: { plan: "free", price: 0 },
    VIP: { plan: "vip", price: 9 },
    ADMIN: { plan: "vip", price: 0 }, // admins get VIP for free
  };

  const info = planMap[user.role] ?? { plan: "free", price: 0 };

  return NextResponse.json({
    plan: info.plan,
    price: info.price,
    billingCycle: "monthly",
    subscribedAt: user.createdAt,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  });
}

// POST /api/subscription — disabled until Stripe integration is live
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Subscription changes require a valid Stripe payment.
  // This endpoint is disabled until Stripe checkout is integrated.
  return NextResponse.json(
    { error: "Paiement requis. Contactez le support." },
    { status: 403 }
  );
}
