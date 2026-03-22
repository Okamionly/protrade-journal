import { prisma } from "@/lib/prisma";

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
}) {
  return prisma.notification.create({ data: params });
}
