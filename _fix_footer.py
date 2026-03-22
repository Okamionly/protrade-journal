import sys

filepath = 'src/components/LandingContent.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old = '''            <footer className="border-t border-gray-100 py-8 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Image src="/logo-icon.png" alt="MarketPhase \u2014 journal de trading" width={28} height={28} sizes="28px" className="w-7 h-7 rounded-lg" />
                      <span className="font-bold text-gray-900">MarketPhase</span>
                    </div>
                    <p className="text-xs text-gray-400 max-w-xs">{t("landing_footerDesc")}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t("landing_footerProduct")}</h5>
                      <ul className="space-y-2">
                        {[
                          { l: t("landing_navFeatures"), slide: 6 },
                          { l: t("landing_navPreview"), slide: 3 },
                          { l: t("landing_navPricing"), slide: 9 },
                          { l: t("landing_navCompare"), slide: 7 },
                        ].map((i, idx) => (
                          <li key={idx}><button onClick={() => goToSlide(i.slide)} className="text-xs text-gray-400 hover:text-gray-900 transition">{i.l}</button></li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t("landing_footerAccount")}</h5>
                      <ul className="space-y-2">
                        {[
                          { l: t("landing_login"), h: "/login" },
                          { l: t("landing_footerSignup"), h: "/register" },
                          { l: t("landing_footerDemo"), h: "/login" },
                        ].map(i => (
                          <li key={i.l}><Link href={i.h} className="text-xs text-gray-400 hover:text-gray-900 transition">{i.l}</Link></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-4">
                    <div className="flex items-center gap-3">
                      <a href="https://twitter.com/marketphase" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                        <Globe className="w-4 h-4 text-gray-500" />
                      </a>
                    </div>
                    <p className="text-xs text-gray-400">{t("landing_footerCopyright")}</p>
                  </div>
                </div>
              </div>
            </footer>'''

new = '''            <footer className="border-t border-gray-100 py-12 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-8 sm:gap-10">
                  {/* Brand */}
                  <div className="col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                      <Image src="/logo-icon.png" alt="MarketPhase \u2014 journal de trading" width={28} height={28} sizes="28px" className="w-7 h-7 rounded-lg" />
                      <span className="font-bold text-gray-900">MarketPhase</span>
                    </div>
                    <p className="text-xs text-gray-400 max-w-xs">{t("landing_footerDesc")}</p>
                    <div className="flex items-center gap-3 mt-4">
                      <a href="https://twitter.com/marketphase" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                        <Globe className="w-4 h-4 text-gray-500" />
                      </a>
                    </div>
                  </div>

                  {/* Produit */}
                  <nav aria-label="Produit">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t("landing_footerProduct")}</h5>
                    <ul className="space-y-2">
                      <li><button onClick={() => goToSlide(3)} className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerJournal")}</button></li>
                      <li><button onClick={() => goToSlide(4)} className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerAnalytics")}</button></li>
                      <li><button onClick={() => goToSlide(5)} className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerAiCoach")}</button></li>
                      <li><button onClick={() => goToSlide(8)} className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerChallenges")}</button></li>
                      <li><button onClick={() => goToSlide(8)} className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerCommunity")}</button></li>
                    </ul>
                  </nav>

                  {/* Ressources */}
                  <nav aria-label="Ressources">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t("landing_footerResources")}</h5>
                    <ul className="space-y-2">
                      <li><Link href="/blog" className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerBlog")}</Link></li>
                      <li><Link href="/blog/journal-de-trading-gratuit-guide-complet" className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerGuide")}</Link></li>
                      <li><Link href="/features" className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerFAQ")}</Link></li>
                      <li><Link href="/blog/marketphase-vs-tradezella-comparatif" className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerComparatifs")}</Link></li>
                    </ul>
                  </nav>

                  {/* Entreprise */}
                  <nav aria-label="Entreprise">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t("landing_footerCompany")}</h5>
                    <ul className="space-y-2">
                      <li><Link href="/about" className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerAbout")}</Link></li>
                      <li><Link href="/contact" className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerContact")}</Link></li>
                      <li><Link href="/mentions-legales" className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerLegal")}</Link></li>
                      <li><Link href="/confidentialite" className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerPrivacy")}</Link></li>
                    </ul>
                  </nav>

                  {/* Compte */}
                  <nav aria-label="Compte">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t("landing_footerAccount")}</h5>
                    <ul className="space-y-2">
                      <li><Link href="/login" className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_login")}</Link></li>
                      <li><Link href="/register" className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerSignup")}</Link></li>
                      <li><Link href="/login" className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerDemo")}</Link></li>
                    </ul>
                  </nav>
                </div>

                {/* Bottom bar */}
                <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-gray-400">{t("landing_footerCopyright")}</p>
                  <div className="flex items-center gap-4">
                    <Link href="/mentions-legales" className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerLegal")}</Link>
                    <Link href="/confidentialite" className="text-xs text-gray-400 hover:text-gray-900 transition">{t("landing_footerPrivacy")}</Link>
                  </div>
                </div>
              </div>
            </footer>'''

if old in content:
    content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: footer replaced')
else:
    print('ERROR: old string not found')
    # Debug: show what's around "footer"
    idx = content.find('<footer')
    if idx >= 0:
        print(f'Footer found at char {idx}')
        print(repr(content[idx:idx+200]))
