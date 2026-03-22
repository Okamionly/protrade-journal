import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions Legales",
  description:
    "Mentions legales du site MarketPhase. Informations sur l'editeur, l'hebergeur et les conditions d'utilisation du journal de trading.",
};

export default function MentionsLegales() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="mb-10 inline-block text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          &larr; Retour a l&apos;accueil
        </Link>

        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Mentions legales
        </h1>
        <p className="mb-12 text-sm text-gray-500">
          Derniere mise a jour : 22 mars 2026
        </p>

        {/* Editeur */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            1. Editeur du site
          </h2>
          <p className="mb-2 leading-relaxed text-gray-700">
            Le site <strong>marketphase.vercel.app</strong> (ci-apres
            &laquo;&nbsp;le Site&nbsp;&raquo;) est edite par :
          </p>
          <ul className="ml-6 list-disc space-y-1 text-gray-700">
            <li>
              <strong>Raison sociale :</strong> MarketPhase
            </li>
            <li>
              <strong>Site internet :</strong>{" "}
              <a
                href="https://marketphase.vercel.app"
                className="underline hover:text-gray-600"
              >
                https://marketphase.vercel.app
              </a>
            </li>
            <li>
              <strong>Email de contact :</strong>{" "}
              <a
                href="mailto:contact@marketphase.fr"
                className="underline hover:text-gray-600"
              >
                contact@marketphase.fr
              </a>
            </li>
          </ul>
        </section>

        {/* Hebergement */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            2. Hebergement
          </h2>
          <p className="mb-2 leading-relaxed text-gray-700">
            Le Site est heberge par :
          </p>
          <ul className="ml-6 list-disc space-y-1 text-gray-700">
            <li>
              <strong>Raison sociale :</strong> Vercel Inc.
            </li>
            <li>
              <strong>Adresse :</strong> 440 N Barranca Ave #4133, Covina, CA
              91723, Etats-Unis
            </li>
            <li>
              <strong>Site internet :</strong>{" "}
              <a
                href="https://vercel.com"
                className="underline hover:text-gray-600"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://vercel.com
              </a>
            </li>
          </ul>
        </section>

        {/* Propriete intellectuelle */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            3. Propriete intellectuelle
          </h2>
          <p className="leading-relaxed text-gray-700">
            L&apos;ensemble des contenus presents sur le Site (textes, images,
            graphismes, logo, icones, logiciels, base de donnees) est protege
            par les lois en vigueur relatives a la propriete intellectuelle.
            Toute reproduction, representation, modification, publication ou
            adaptation de tout ou partie des elements du Site, quel que soit le
            moyen ou le procede utilise, est interdite sans l&apos;autorisation
            ecrite prealable de MarketPhase.
          </p>
        </section>

        {/* Responsabilite */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            4. Limitation de responsabilite
          </h2>
          <p className="mb-3 leading-relaxed text-gray-700">
            MarketPhase s&apos;efforce de fournir des informations aussi precises
            que possible sur le Site. Toutefois, MarketPhase ne saurait etre
            tenue responsable des omissions, inexactitudes ou carences dans la
            mise a jour de ces informations.
          </p>
          <p className="mb-3 leading-relaxed text-gray-700">
            Le Site propose un journal de trading et des outils d&apos;analyse a
            titre informatif uniquement. Les informations fournies ne
            constituent en aucun cas des conseils en investissement, des
            recommandations d&apos;achat ou de vente d&apos;instruments
            financiers, ni une sollicitation d&apos;ordre de quelque nature que
            ce soit.
          </p>
          <p className="leading-relaxed text-gray-700">
            L&apos;utilisateur est seul responsable de ses decisions
            d&apos;investissement et de l&apos;utilisation qu&apos;il fait des
            informations disponibles sur le Site.
          </p>
        </section>

        {/* Liens hypertextes */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            5. Liens hypertextes
          </h2>
          <p className="leading-relaxed text-gray-700">
            Le Site peut contenir des liens vers d&apos;autres sites internet.
            MarketPhase ne dispose d&apos;aucun controle sur le contenu de ces
            sites tiers et decline toute responsabilite quant a leur contenu ou
            aux eventuels dommages pouvant resulter de leur utilisation.
          </p>
        </section>

        {/* Droit applicable */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            6. Droit applicable
          </h2>
          <p className="leading-relaxed text-gray-700">
            Les presentes mentions legales sont regies par le droit francais.
            Tout litige relatif a l&apos;utilisation du Site sera soumis a la
            competence exclusive des tribunaux francais.
          </p>
        </section>

        {/* Contact */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">7. Contact</h2>
          <p className="leading-relaxed text-gray-700">
            Pour toute question relative aux presentes mentions legales, vous
            pouvez nous contacter par email a l&apos;adresse :{" "}
            <a
              href="mailto:contact@marketphase.fr"
              className="underline hover:text-gray-600"
            >
              contact@marketphase.fr
            </a>
          </p>
        </section>

        <div className="mt-16 border-t border-gray-200 pt-8 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} MarketPhase. Tous droits reserves.
        </div>
      </div>
    </main>
  );
}
