import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { RevenueDashboard } from "./RevenueDashboard";

export default async function RevenueAdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  // Fetch real user stats
  const totalUsers = await prisma.user.count();
  const vipUsers = await prisma.user.count({ where: { role: "VIP" } });
  const proUsers = 0; // PRO role not yet implemented — placeholder for future Stripe integration
  const freeUsers = totalUsers - vipUsers;

  // Recent VIP subscribers
  const recentSubscribers = await prisma.user.findMany({
    where: { role: "VIP" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <RevenueDashboard
      stats={{
        totalUsers,
        vipUsers,
        proUsers,
        freeUsers,
        recentSubscribers: recentSubscribers.map((u) => ({
          id: u.id,
          name: u.name ?? u.email,
          email: u.email,
          role: u.role,
          date: u.createdAt.toISOString(),
        })),
      }}
    />
  );
}
