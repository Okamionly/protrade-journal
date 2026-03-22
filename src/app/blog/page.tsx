import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts } from "@/data/blog-posts";

export const metadata: Metadata = {
  title: "Blog Trading - Guides, Analyses et Conseils | MarketPhase",
  description:
    "Articles et guides sur le trading : journal de trading, améliorer son win rate, psychologie, erreurs courantes. Conseils pratiques pour progresser.",
  keywords: [
    "blog trading",
    "conseils trading",
    "guide trading",
    "journal de trading",
    "psychologie trading",
    "erreurs trading",
  ],
  openGraph: {
    title: "Blog Trading - Guides et Conseils | MarketPhase",
    description:
      "Articles et guides sur le trading : journal de trading, améliorer son win rate, psychologie, erreurs courantes.",
    url: "https://marketphase.vercel.app/blog",
    siteName: "MarketPhase",
    locale: "fr_FR",
    type: "website",
  },
  alternates: {
    canonical: "https://marketphase.vercel.app/blog",
  },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 transition"
          >
            &larr; Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Blog Trading
          </h1>
          <p className="text-lg text-gray-500 mb-12 max-w-2xl">
            Guides pratiques, analyses et conseils pour améliorer votre trading.
            Découvrez comment tirer le meilleur parti de votre journal de
            trading.
          </p>

          <div className="space-y-10">
            {blogPosts.map((post) => (
              <article
                key={post.slug}
                className="group border-b border-gray-100 pb-10 last:border-0"
              >
                <Link href={`/blog/${post.slug}`} className="block">
                  <time
                    dateTime={post.date}
                    className="text-sm text-gray-400 mb-2 block"
                  >
                    {formatDate(post.date)} &middot; {post.readingTime} min de
                    lecture
                  </time>
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 group-hover:text-blue-600 transition mb-3">
                    {post.title}
                  </h2>
                  <p className="text-gray-500 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <span className="inline-block mt-4 text-sm font-medium text-blue-600 group-hover:underline">
                    Lire l&apos;article &rarr;
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-8 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} MarketPhase. Tous droits
            r&eacute;serv&eacute;s.
          </p>
        </div>
      </footer>
    </div>
  );
}
