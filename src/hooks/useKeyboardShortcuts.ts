"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useKeyboardShortcuts() {
  const router = useRouter();
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only trigger with Ctrl (or Cmd on Mac)
      if (!(e.ctrlKey || e.metaKey)) return;

      switch (e.key.toLowerCase()) {
        case "n":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("open-trade-form"));
          break;
        case "j":
          e.preventDefault();
          router.push("/journal");
          break;
        case "d":
          e.preventDefault();
          router.push("/dashboard");
          break;
        case "k":
          e.preventDefault();
          router.push("/chart");
          break;
        case "/":
          e.preventDefault();
          setShowShortcutsHelp((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  return { showShortcutsHelp, setShowShortcutsHelp };
}
