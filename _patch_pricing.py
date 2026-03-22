import sys

filepath = 'src/components/LandingContent.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add ChevronDown, Crown, Star imports (if not already present)
if 'ChevronDown' not in content:
    content = content.replace(
        '  Globe,\n} from "lucide-react";',
        '  Globe,\n  ChevronDown,\n  Crown,\n  Star,\n} from "lucide-react";'
    )

# 2. Replace the pricing section
# Find the start marker
start_marker = '            {/* Pricing */}'
start_idx = content.find(start_marker)
if start_idx < 0:
    print("ERROR: Could not find pricing start marker")
    sys.exit(1)

# Find the end: the closing </div> before {/* Final CTA */}
end_marker = '            {/* Final CTA */}'
end_idx = content.find(end_marker)
if end_idx < 0:
    print("ERROR: Could not find Final CTA marker")
    sys.exit(1)

# We need to go back to find the blank line before Final CTA
# The structure is: </div>\n\n            {/* Final CTA */}
# So we want to replace up to just before the blank line
# Let's find the last </div> + newlines before Final CTA
chunk_before_final = content[start_idx:end_idx]

new_pricing = """            {/* Pricing */}
            <div className="max-w-5xl mx-auto text-center px-4 mb-16">
              <p className="text-blue-600 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-3">{t("landing_pricingTag")}</p>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black mb-4 text-gray-900">{t("landing_pricingTitle")}</h2>
              <p className="text-gray-400 text-sm sm:text-lg mb-8 sm:mb-10">{t("landing_pricingSub")}</p>

              {/* Two-card comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
                {/* Free card */}
                <div className="relative rounded-3xl p-6 sm:p-8 bg-white/70 backdrop-blur-md border border-gray-200 shadow-lg">
                  <div className="text-4xl sm:text-5xl font-black text-gray-900 mb-1">0&#8364;</div>
                  <p className="text-gray-400 mb-1 text-sm sm:text-base font-semibold">Free</p>
                  <p className="text-gray-400 mb-6 text-xs">{t("landing_pricingPerMonth")}</p>
                  <div className="w-full h-px bg-gray-100 mb-5" />
                  <p className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t("landing_pricingFreeLabel")}</p>
                  <ul className="space-y-2 text-left mb-8">
                    {[
                      t("landing_pricingItem1"), t("landing_pricingItem2"), t("landing_pricingItem3"),
                      t("landing_pricingItem4"), t("landing_pricingItem5"),
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-gray-600 text-xs sm:text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="group w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-gray-700 px-6 py-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all">
                    {t("landing_pricingCta")}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* VIP card */}
                <div className="relative rounded-3xl p-6 sm:p-8 bg-white/70 backdrop-blur-md border-2 border-amber-400/60 shadow-xl shadow-amber-500/10">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-lg">
                    <Star className="w-3 h-3 fill-white" />
                    {t("landing_pricingVipBadge")}
                  </div>
                  <div className="flex items-baseline gap-1 justify-center">
                    <span className="text-4xl sm:text-5xl font-black text-gray-900">9.99&#8364;</span>
                  </div>
                  <p className="text-amber-600 mb-1 text-sm sm:text-base font-semibold flex items-center justify-center gap-1.5">
                    <Crown className="w-4 h-4" /> VIP
                  </p>
                  <p className="text-gray-400 mb-6 text-xs">{t("landing_pricingVipPer")}</p>
                  <div className="w-full h-px bg-amber-200/50 mb-5" />
                  <p className="text-left text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">{t("landing_pricingVipLabel")}</p>
                  <ul className="space-y-2 text-left mb-8">
                    {[
                      t("landing_pricingVip1"), t("landing_pricingVip2"), t("landing_pricingVip3"),
                      t("landing_pricingVip4"), t("landing_pricingVip5"),
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="text-gray-600 text-xs sm:text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="group w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-white px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:shadow-xl hover:shadow-amber-500/25 transition-all">
                    {t("landing_pricingVipCta")}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* FAQ */}
              <div className="max-w-2xl mx-auto text-left">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-6">{t("landing_faqTitle")}</h3>
                {([
                  { q: t("landing_faqQ1"), a: t("landing_faqA1") },
                  { q: t("landing_faqQ2"), a: t("landing_faqA2") },
                  { q: t("landing_faqQ3"), a: t("landing_faqA3") },
                ] as { q: string; a: string }[]).map((faq, idx) => (
                  <details key={idx} className="group border-b border-gray-100 last:border-0">
                    <summary className="flex items-center justify-between cursor-pointer py-4 text-sm sm:text-base font-medium text-gray-800 hover:text-gray-900 transition-colors [&::-webkit-details-marker]:hidden list-none">
                      {faq.q}
                      <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" />
                    </summary>
                    <p className="pb-4 text-xs sm:text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>

"""

content = content[:start_idx] + new_pricing + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("OK - LandingContent.tsx patched successfully")
