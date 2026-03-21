"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/context";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { VipContentManager } from "../VipContentManager";

export default function VipContentPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/role")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.role) {
          setUserRole(data.role);
          if (data.role !== "ADMIN") {
            router.push("/dashboard");
          }
        }
      })
      .catch(() => router.push("/dashboard"));
  }, [router]);

  if (userRole !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin")}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition hover:opacity-80"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            {t("adminPanel")}
          </span>
        </div>
      </div>

      {/* VIP Content Manager */}
      <VipContentManager />
    </div>
  );
}
