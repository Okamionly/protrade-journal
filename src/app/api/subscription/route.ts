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

// POST /api/subscription — mock upgrade/downgrade
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const body = await req.json();
  const { plan, billingCycle } = body as { plan: string; billingCycle?: string };

  // Allowed plans: free and vip (mock mode — in production, vip requires Stripe)
  const roleMap: Record<string, string> = {
    free: "USER",
    vip: "VIP",
  };

  const newRole = roleMap[plan];
  if (!newRole) {
    return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
  }

  // Prevent non-admin users from setting themselves as ADMIN
  if (newRole === "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // --- MOCK: In production, this would:
  // 1. Create a Stripe Checkout Session
  // 2. Redirect user to Stripe
  // 3. Handle webhook to update role
  // For now, we just update the role directly ---

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: newRole },
  });

  return NextResponse.json({
    success: true,
    plan,
    billingCycle: billingCycle ?? "monthly",
    message: `Plan mis à jour vers ${plan.toUpperCase()}`,
    // Mock Stripe response
    stripeSessionId: `mock_cs_${Date.now()}`,
    stripeSubscriptionId: plan !== "free" ? `mock_sub_${Date.now()}` : null,
  });
}
