"use client";

import { useState, useEffect } from "react";

interface VipAccess {
  isVip: boolean | null;
  isAdmin: boolean;
  role: string | null;
}

export function useVipAccess(): VipAccess {
  const [state, setState] = useState<VipAccess>({
    isVip: null,
    isAdmin: false,
    role: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/role")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const role = data.role ?? null;
        setState({
          isVip: role === "VIP" || role === "PRO" || role === "ADMIN",
          isAdmin: role === "ADMIN",
          role,
        });
      })
      .catch(() => {
        if (!cancelled)
          setState({ isVip: false, isAdmin: false, role: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
