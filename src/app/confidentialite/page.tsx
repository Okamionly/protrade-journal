import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de Confidentialite",
  description:
    "Politique de confidentialite de MarketPhase. Decouvrez comment nous collectons, utilisons et protegeons vos donnees personnelles conformement au RGPD.",
};

export default function Confidentialite() {
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
          Politique de confidentialite
        </h1>
        <p className="mb-12 text-sm text-gray-500">
          Derniere mise a jour : 22 mars 2026
        </p>

        {/* Introduction */}
        <section className="mb-10">
          <p className="leading-relaxed text-gray-700">
            MarketPhase (ci-apres &laquo;&nbsp;nous&nbsp;&raquo;) s&apos;engage
            a proteger la vie privee des utilisateurs de son site{" "}
            <strong>marketphase.vercel.app</strong> (ci-apres &laquo;&nbsp;le
            Site&nbsp;&raquo;). La presente politique de confidentialite decrit
            les types de donnees que nous collectons, la maniere dont nous les
            utilisons et les droits dont vous disposez conformement au Reglement
            General sur la Protection des Donnees (RGPD).
          </p>
        </section>

        {/* Donnees collectees */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            1. Donnees collectees
          </h2>

          <h3 className="mb-2 mt-4 text-base font-medium text-gray-800">
            1.1 Donnees fournies directement
          </h3>
          <p className="mb-2 leading-relaxed text-gray-700">
            Lors de la creation de votre compte ou de l&apos;utilisation du
            Site, nous pouvons collecter :
          </p>
          <ul className="ml-6 list-disc space-y-1 text-gray-700">
            <li>Adresse email</li>
            <li>Nom d&apos;utilisateur</li>
            <li>
              Donnees de trading saisies volontairement (journal, notes,
              analyses)
            </li>
            <li>
              Informations de paiement (traitees directement par Stripe, nous ne
              stockons pas vos donnees bancaires)
            </li>
          </ul>

          <h3 className="mb-2 mt-6 text-base font-medium text-gray-800">
            1.2 Donnees collectees automatiquement
          </h3>
          <ul className="ml-6 list-disc space-y-1 text-gray-700">
            <li>Adresse IP</li>
            <li>Type de navigateur et systeme d&apos;exploitation</li>
            <li>Pages visitees et duree des visites</li>
            <li>
              Donnees de navigation via des cookies et technologies similaires
            </li>
          </ul>
        </section>

        {/* Utilisation */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            2. Utilisation des donnees
          </h2>
          <p className="mb-2 leading-relaxed text-gray-700">
            Vos donnees personnelles sont utilisees pour :
          </p>
          <ul className="ml-6 list-disc space-y-1 text-gray-700">
            <li>Creer et gerer votre compte utilisateur</li>
            <li>
              Fournir les fonctionnalites du journal de trading et des outils
              d&apos;analyse
            </li>
            <li>Traiter les abonnements et les paiements VIP</li>
            <li>
              Ameliorer l&apos;experience utilisateur et optimiser le Site
            </li>
            <li>Envoyer des communications relatives a votre compte</li>
            <li>
              Assurer la securite du Site et prevenir les activites frauduleuses
            </li>
          </ul>
        </section>

        {/* Cookies */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">3. Cookies</h2>
          <p className="mb-3 leading-relaxed text-gray-700">
            Le Site utilise des cookies pour assurer son bon fonctionnement et
            ameliorer votre experience de navigation.
          </p>

          <h3 className="mb-2 mt-4 text-base font-medium text-gray-800">
            3.1 Cookies essentiels
          </h3>
          <p className="mb-3 leading-relaxed text-gray-700">
            Necessaires au fonctionnement du Site (authentification, session
            utilisateur, preferences). Ces cookies ne peuvent pas etre
            desactives.
          </p>

          <h3 className="mb-2 mt-4 text-base font-medium text-gray-800">
            3.2 Cookies analytiques
          </h3>
          <p className="mb-3 leading-relaxed text-gray-700">
            Utilises pour mesurer l&apos;audience et comprendre comment les
            visiteurs interagissent avec le Site. Ces donnees sont anonymisees et
            nous aident a ameliorer nos services.
          </p>

          <p className="leading-relaxed text-gray-700">
            Vous pouvez gerer vos preferences en matiere de cookies via les
            parametres de votre navigateur. La desactivation de certains cookies
            peut affecter le fonctionnement du Site.
          </p>
        </section>

        {/* Services tiers */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            4. Services tiers
          </h2>
          <p className="mb-3 leading-relaxed text-gray-700">
            Nous faisons appel a des prestataires tiers pour le fonctionnement
            du Site :
          </p>

          <h3 className="mb-2 mt-4 text-base font-medium text-gray-800">
            4.1 Stripe
          </h3>
          <p className="mb-3 leading-relaxed text-gray-700">
            Le traitement des paiements est assure par{" "}
            <strong>Stripe Inc.</strong> Lorsque vous souscrivez un abonnement
            VIP, vos informations de paiement sont transmises directement a
            Stripe selon sa propre{" "}
            <a
              href="https://stripe.com/fr/privacy"
              className="underline hover:text-gray-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              politique de confidentialite
            </a>
            . Nous ne stockons jamais vos numeros de carte bancaire.
          </p>

          <h3 className="mb-2 mt-4 text-base font-medium text-gray-800">
            4.2 Hebergement et infrastructure
          </h3>
          <p className="mb-3 leading-relaxed text-gray-700">
            Le Site est heberge par <strong>Vercel Inc.</strong> Les donnees
            peuvent etre traitees sur des serveurs situes aux Etats-Unis, dans le
            cadre de garanties appropriees conformement au RGPD.
          </p>

          <h3 className="mb-2 mt-4 text-base font-medium text-gray-800">
            4.3 Outils d&apos;analyse
          </h3>
          <p className="leading-relaxed text-gray-700">
            Nous pouvons utiliser des outils d&apos;analyse web pour mesurer le
            trafic et l&apos;utilisation du Site. Les donnees collectees sont
            anonymisees et ne permettent pas de vous identifier personnellement.
          </p>
        </section>

        {/* Conservation */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            5. Conservation des donnees
          </h2>
          <p className="leading-relaxed text-gray-700">
            Vos donnees personnelles sont conservees aussi longtemps que votre
            compte est actif ou que necessaire pour fournir nos services. En cas
            de suppression de votre compte, vos donnees seront supprimees dans un
            delai de 30 jours, sauf obligation legale de conservation.
          </p>
        </section>

        {/* Droits RGPD */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            6. Vos droits (RGPD)
          </h2>
          <p className="mb-3 leading-relaxed text-gray-700">
            Conformement au Reglement General sur la Protection des Donnees,
            vous disposez des droits suivants :
          </p>
          <ul className="ml-6 list-disc space-y-2 text-gray-700">
            <li>
              <strong>Droit d&apos;acces :</strong> obtenir la confirmation que
              vos donnees sont traitees et en obtenir une copie.
            </li>
            <li>
              <strong>Droit de rectification :</strong> faire corriger vos
              donnees inexactes ou incompletes.
            </li>
            <li>
              <strong>Droit a l&apos;effacement :</strong> demander la
              suppression de vos donnees personnelles.
            </li>
            <li>
              <strong>Droit a la limitation du traitement :</strong> demander la
              restriction du traitement de vos donnees.
            </li>
            <li>
              <strong>Droit a la portabilite :</strong> recevoir vos donnees
              dans un format structure et lisible par machine.
            </li>
            <li>
              <strong>Droit d&apos;opposition :</strong> vous opposer au
              traitement de vos donnees pour des motifs legitimes.
            </li>
          </ul>
          <p className="mt-4 leading-relaxed text-gray-700">
            Pour exercer vos droits, contactez-nous a l&apos;adresse :{" "}
            <a
              href="mailto:contact@marketphase.fr"
              className="underline hover:text-gray-600"
            >
              contact@marketphase.fr
            </a>
            . Nous nous engageons a repondre dans un delai de 30 jours.
          </p>
        </section>

        {/* Securite */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            7. Securite des donnees
          </h2>
          <p className="leading-relaxed text-gray-700">
            Nous mettons en oeuvre des mesures techniques et organisationnelles
            appropriees pour proteger vos donnees personnelles contre tout acces
            non autorise, toute perte, destruction ou alteration. Les
            communications entre votre navigateur et le Site sont chiffrees via
            le protocole HTTPS.
          </p>
        </section>

        {/* Modifications */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">
            8. Modifications de la politique
          </h2>
          <p className="leading-relaxed text-gray-700">
            Nous nous reservons le droit de modifier la presente politique de
            confidentialite a tout moment. Toute modification sera publiee sur
            cette page avec la date de mise a jour. Nous vous encourageons a
            consulter regulierement cette page pour rester informe de nos
            pratiques en matiere de protection des donnees.
          </p>
        </section>

        {/* Contact */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">9. Contact</h2>
          <p className="leading-relaxed text-gray-700">
            Pour toute question relative a la presente politique de
            confidentialite ou a la protection de vos donnees, contactez-nous
            a :{" "}
            <a
              href="mailto:contact@marketphase.fr"
              className="underline hover:text-gray-600"
            >
              contact@marketphase.fr
            </a>
          </p>
          <p className="mt-3 leading-relaxed text-gray-700">
            Vous disposez egalement du droit d&apos;introduire une reclamation
            aupres de la Commission Nationale de l&apos;Informatique et des
            Libertes (CNIL) :{" "}
            <a
              href="https://www.cnil.fr"
              className="underline hover:text-gray-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.cnil.fr
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
