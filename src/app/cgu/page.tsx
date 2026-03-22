import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions Generales d'Utilisation",
  description:
    "Conditions generales d'utilisation de MarketPhase. Regles d'utilisation du journal de trading, abonnement VIP, propriete du contenu et responsabilites.",
};

export default function CGU() {
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
          Conditions generales d&apos;utilisation
        </h1>
        <p className="mb-12 text-sm text-gray-500">
          Derniere mise a jour : 22 mars 2026
        </p>

        {/* Objet */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">1. Objet</h2>
          <p className="leading-relaxed text-gray-700">
            Les presentes Conditions Generales d&apos;Utilisation (ci-apres
            &laquo;&nbsp;CGU&nbsp;&raquo;) definissent les modalites et
            conditions d&apos;utilisation du site{" "}
            <strong>marketphase.vercel.app</strong> (ci-apres &laquo;&nbsp;le
            Site&nbsp;&raquo;) edite par MarketPhase. En accedant au Site et en
            creant un compte, vous acceptez sans reserve les presentes CGU.
          </p>
        </section>

        {/* Inscription */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            2. Creation de compte
          </h2>
          <p className="mb-3 leading-relaxed text-gray-700">
            L&apos;acces a certaines fonctionnalites du Site necessite la
            creation d&apos;un compte utilisateur. Lors de l&apos;inscription,
            vous vous engagez a :
          </p>
          <ul className="ml-6 list-disc space-y-1 text-gray-700">
            <li>Fournir des informations exactes et a jour</li>
            <li>
              Maintenir la confidentialite de vos identifiants de connexion
            </li>
            <li>
              Ne pas creer plusieurs comptes pour une meme personne physique
            </li>
            <li>
              Nous informer immediatement en cas d&apos;utilisation non
              autorisee de votre compte
            </li>
          </ul>
          <p className="mt-3 leading-relaxed text-gray-700">
            Vous etes seul responsable de toute activite effectuee sous votre
            compte. MarketPhase se reserve le droit de suspendre ou de supprimer
            tout compte en cas de non-respect des presentes CGU.
          </p>
        </section>

        {/* Utilisation acceptable */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            3. Utilisation acceptable
          </h2>
          <p className="mb-3 leading-relaxed text-gray-700">
            En utilisant le Site, vous vous engagez a ne pas :
          </p>
          <ul className="ml-6 list-disc space-y-1 text-gray-700">
            <li>
              Utiliser le Site a des fins illegales ou non autorisees
            </li>
            <li>
              Tenter d&apos;acceder de maniere non autorisee aux systemes ou
              reseaux du Site
            </li>
            <li>
              Diffuser des virus, logiciels malveillants ou tout autre code
              nuisible
            </li>
            <li>
              Collecter ou stocker les donnees personnelles d&apos;autres
              utilisateurs
            </li>
            <li>
              Reproduire, dupliquer ou copier tout contenu du Site a des fins
              commerciales
            </li>
            <li>
              Utiliser des systemes automatises (bots, scrapers) pour acceder au
              Site
            </li>
            <li>
              Interferer avec le bon fonctionnement du Site ou surcharger
              l&apos;infrastructure
            </li>
          </ul>
        </section>

        {/* Abonnement VIP */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            4. Abonnement VIP
          </h2>

          <h3 className="mb-2 mt-4 text-base font-medium text-gray-800">
            4.1 Description
          </h3>
          <p className="mb-3 leading-relaxed text-gray-700">
            MarketPhase propose un abonnement VIP donnant acces a des
            fonctionnalites avancees (analyses approfondies, outils premium,
            coaching IA, etc.). Les details des offres et tarifs sont presentes
            sur le Site.
          </p>

          <h3 className="mb-2 mt-4 text-base font-medium text-gray-800">
            4.2 Paiement et facturation
          </h3>
          <p className="mb-3 leading-relaxed text-gray-700">
            Les paiements sont traites de maniere securisee par Stripe. En
            souscrivant un abonnement, vous autorisez le prelevement automatique
            selon la periodicite choisie (mensuelle ou annuelle). Les prix sont
            indiques en euros, toutes taxes comprises.
          </p>

          <h3 className="mb-2 mt-4 text-base font-medium text-gray-800">
            4.3 Renouvellement et resiliation
          </h3>
          <p className="mb-3 leading-relaxed text-gray-700">
            L&apos;abonnement VIP est reconduit automatiquement a son terme.
            Vous pouvez resilier votre abonnement a tout moment depuis les
            parametres de votre compte. La resiliation prend effet a la fin de la
            periode en cours et vous conservez l&apos;acces aux fonctionnalites
            VIP jusqu&apos;a cette date.
          </p>

          <h3 className="mb-2 mt-4 text-base font-medium text-gray-800">
            4.4 Remboursement
          </h3>
          <p className="leading-relaxed text-gray-700">
            Conformement a la legislation en vigueur, vous disposez d&apos;un
            droit de retractation de 14 jours a compter de la souscription de
            votre abonnement. Passe ce delai, aucun remboursement ne sera
            effectue pour la periode en cours. Pour toute demande de
            remboursement, contactez-nous a{" "}
            <a
              href="mailto:contact@marketphase.fr"
              className="underline hover:text-gray-600"
            >
              contact@marketphase.fr
            </a>
            .
          </p>
        </section>

        {/* Propriete du contenu */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            5. Propriete du contenu
          </h2>

          <h3 className="mb-2 mt-4 text-base font-medium text-gray-800">
            5.1 Contenu de l&apos;utilisateur
          </h3>
          <p className="mb-3 leading-relaxed text-gray-700">
            Vous conservez l&apos;integralite des droits de propriete
            intellectuelle sur le contenu que vous saisissez sur le Site
            (donnees de trading, notes, analyses, etc.). En utilisant le Site,
            vous accordez a MarketPhase une licence limitee, non exclusive et
            revocable d&apos;utiliser ce contenu uniquement dans le but de
            fournir et ameliorer les services du Site.
          </p>

          <h3 className="mb-2 mt-4 text-base font-medium text-gray-800">
            5.2 Contenu de MarketPhase
          </h3>
          <p className="leading-relaxed text-gray-700">
            L&apos;ensemble des elements constituant le Site (design, textes,
            logiciels, graphismes, bases de donnees, marques) est la propriete
            exclusive de MarketPhase et est protege par les lois sur la propriete
            intellectuelle. Toute reproduction non autorisee est interdite.
          </p>
        </section>

        {/* Responsabilite */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            6. Limitation de responsabilite
          </h2>
          <p className="mb-3 leading-relaxed text-gray-700">
            Le Site est fourni &laquo;&nbsp;en l&apos;etat&nbsp;&raquo; sans
            garantie d&apos;aucune sorte. MarketPhase ne saurait etre tenue
            responsable :
          </p>
          <ul className="ml-6 list-disc space-y-1 text-gray-700">
            <li>
              Des decisions d&apos;investissement prises sur la base des
              informations fournies par le Site
            </li>
            <li>
              Des pertes financieres resultant de l&apos;utilisation du Site ou
              de l&apos;impossibilite de l&apos;utiliser
            </li>
            <li>
              Des interruptions temporaires du service pour maintenance ou
              raisons techniques
            </li>
            <li>
              De la perte de donnees resultant de circonstances hors de son
              controle
            </li>
            <li>
              Des contenus publies par des tiers ou accessibles via des liens
              externes
            </li>
          </ul>
          <p className="mt-3 leading-relaxed text-gray-700">
            <strong>Avertissement :</strong> Le Site est un outil de suivi et
            d&apos;analyse de trading. Il ne fournit pas de conseils en
            investissement. Le trading comporte des risques de perte en capital
            et ne convient pas a tous les profils d&apos;investisseurs.
          </p>
        </section>

        {/* Disponibilite */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            7. Disponibilite du service
          </h2>
          <p className="leading-relaxed text-gray-700">
            MarketPhase s&apos;efforce de maintenir le Site accessible 24 heures
            sur 24, 7 jours sur 7. Toutefois, l&apos;acces peut etre
            temporairement interrompu pour des raisons de maintenance, de mise a
            jour ou en cas de force majeure. MarketPhase ne garantit pas un acces
            ininterrompu au Site.
          </p>
        </section>

        {/* Modification des CGU */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            8. Modification des CGU
          </h2>
          <p className="leading-relaxed text-gray-700">
            MarketPhase se reserve le droit de modifier les presentes CGU a tout
            moment. Les modifications entrent en vigueur des leur publication sur
            le Site. L&apos;utilisation continue du Site apres publication des
            modifications vaut acceptation des nouvelles CGU. Nous vous invitons
            a consulter regulierement cette page.
          </p>
        </section>

        {/* Droit applicable */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            9. Droit applicable et litiges
          </h2>
          <p className="mb-3 leading-relaxed text-gray-700">
            Les presentes CGU sont regies par le droit francais. En cas de
            litige relatif a l&apos;interpretation ou a l&apos;execution des
            presentes CGU, les parties s&apos;efforceront de trouver une
            solution amiable.
          </p>
          <p className="leading-relaxed text-gray-700">
            A defaut d&apos;accord amiable, tout litige sera soumis a la
            competence exclusive des tribunaux francais. Conformement a la
            reglementation en vigueur, vous pouvez egalement recourir a un
            mediateur de la consommation.
          </p>
        </section>

        {/* Contact */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">10. Contact</h2>
          <p className="leading-relaxed text-gray-700">
            Pour toute question relative aux presentes CGU, contactez-nous a :{" "}
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
