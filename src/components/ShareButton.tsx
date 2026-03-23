"use client";

import { useState } from "react";
import { Share2, Check, Link2 } from "lucide-react";

interface ShareButtonProps {
  /** If provided, generates a /track/share?u=username link instead of current URL */
  username?: string;
}

export default function ShareButton({ username }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const getShareUrl = () => {
    if (username) {
      const base = window.location.origin;
      return `${base}/track/share?u=${encodeURIComponent(username)}`;
    }
    return window.location.href;
  };

  const handleCopy = async (url?: string) => {
    const textToCopy = url || getShareUrl();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setShowMenu(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setShowMenu(false);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!username) {
    // Simple mode: copy current URL
    return (
      <button
        onClick={() => handleCopy()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors border border-gray-300 dark:border-gray-700"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-green-600">Lien copié !</span>
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            <span>Partager</span>
          </>
        )}
      </button>
    );
  }

  // Enhanced mode with share options
  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
        style={{
          background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
          color: "white",
          boxShadow: "0 4px 15px rgba(6,182,212,0.3)",
        }}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Lien copié !
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            Partager votre profil
          </>
        )}
      </button>

      {showMenu && !copied && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-xl p-2 z-50 shadow-xl"
          style={{
            background: "rgba(15,23,42,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(20px)",
          }}
        >
          <button
            onClick={() => handleCopy()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm hover:bg-white/5 transition-colors"
            style={{ color: "#e2e8f0" }}
          >
            <Link2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <div>
              <p className="font-medium">Copier le lien public</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Carte de profil partageable</p>
            </div>
          </button>
          <button
            onClick={() => handleCopy(window.location.href)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm hover:bg-white/5 transition-colors"
            style={{ color: "#e2e8f0" }}
          >
            <Share2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <div>
              <p className="font-medium">Copier le lien direct</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Track record complet</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
