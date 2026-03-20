import { NextRequest, NextResponse } from "next/server";

/**
 * Maps country codes to supported locales.
 * Used as a fallback when navigator.language detection is ambiguous.
 */
const COUNTRY_TO_LOCALE: Record<string, string> = {
  // French
  FR: "fr", BE: "fr", LU: "fr", MC: "fr", SN: "fr", CI: "fr",
  ML: "fr", BF: "fr", NE: "fr", TG: "fr", BJ: "fr", GA: "fr",
  CG: "fr", CD: "fr", CM: "fr", MG: "fr", HT: "fr", RE: "fr",
  GP: "fr", MQ: "fr", GF: "fr", PF: "fr", NC: "fr",
  // Spanish
  ES: "es", MX: "es", AR: "es", CO: "es", PE: "es", VE: "es",
  CL: "es", EC: "es", GT: "es", CU: "es", BO: "es", DO: "es",
  HN: "es", PY: "es", SV: "es", NI: "es", CR: "es", PA: "es",
  UY: "es", PR: "es",
  // German
  DE: "de", AT: "de", CH: "de", LI: "de",
  // Arabic
  SA: "ar", AE: "ar", MA: "ar", DZ: "ar", TN: "ar", EG: "ar",
  IQ: "ar", JO: "ar", LB: "ar", LY: "ar", SD: "ar", SY: "ar",
  YE: "ar", OM: "ar", QA: "ar", BH: "ar", KW: "ar", MR: "ar",
  // English (explicit)
  US: "en", GB: "en", CA: "en", AU: "en", NZ: "en", IE: "en",
  ZA: "en", IN: "en", PH: "en", SG: "en", NG: "en", KE: "en",
};

export async function GET(request: NextRequest) {
  // 1. Try Cloudflare header (works on Cloudflare-proxied deployments)
  let country = request.headers.get("cf-ipcountry");

  // 2. Try Vercel's geo header
  if (!country) {
    country = request.headers.get("x-vercel-ip-country");
  }

  // 3. Fallback: parse Accept-Language header
  let locale = country ? COUNTRY_TO_LOCALE[country.toUpperCase()] || "en" : null;

  if (!locale) {
    const acceptLang = request.headers.get("accept-language");
    if (acceptLang) {
      // Parse "fr-FR,fr;q=0.9,en;q=0.8" format
      const langs = acceptLang
        .split(",")
        .map((part) => {
          const [lang, qPart] = part.trim().split(";");
          const q = qPart ? parseFloat(qPart.replace("q=", "")) : 1;
          return { lang: lang.split("-")[0].toLowerCase(), q };
        })
        .sort((a, b) => b.q - a.q);

      const supported = ["fr", "en", "ar", "es", "de"];
      for (const { lang } of langs) {
        if (supported.includes(lang)) {
          locale = lang;
          break;
        }
      }
    }
  }

  return NextResponse.json({
    locale: locale || "en",
    country: country?.toUpperCase() || null,
  });
}
