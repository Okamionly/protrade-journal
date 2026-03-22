import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts, getBlogPost, getAllSlugs } from "@/data/blog-posts";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://marketphase.vercel.app/blog/${post.slug}`,
      siteName: "MarketPhase",
      locale: "fr_FR",
      type: "article",
      publishedTime: post.date,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
    alternates: {
      canonical: `https://marketphase.vercel.app/blog/${post.slug}`,
    },
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function markdownToHtml(markdown: string): string {
  return markdown
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";

      // Headers
      if (trimmed.startsWith("### "))
        return `<h3>${trimmed.slice(4)}</h3>`;
      if (trimmed.startsWith("## "))
        return `<h2>${trimmed.slice(3)}</h2>`;
      if (trimmed.startsWith("# "))
        return `<h1>${trimmed.slice(2)}</h1>`;

      // Table
      if (trimmed.includes("|") && trimmed.includes("---")) {
        const rows = trimmed
          .split("\n")
          .filter((r) => !r.match(/^\|[\s-|]+\|$/));
        const headerRow = rows[0];
        const dataRows = rows.slice(1);
        const headers = headerRow
          .split("|")
          .filter(Boolean)
          .map((h) => h.trim());
        let html = '<div class="overflow-x-auto my-6"><table class="w-full text-sm border-collapse"><thead><tr>';
        headers.forEach(
          (h) =>
            (html += `<th class="border border-gray-200 px-4 py-2 bg-gray-50 text-left font-semibold text-gray-700">${h}</th>`)
        );
        html += "</tr></thead><tbody>";
        dataRows.forEach((row) => {
          const cells = row
            .split("|")
            .filter(Boolean)
            .map((c) => c.trim());
          html += "<tr>";
          cells.forEach(
            (c) =>
              (html += `<td class="border border-gray-200 px-4 py-2 text-gray-600">${c}</td>`)
          );
          html += "</tr>";
        });
        html += "</tbody></table></div>";
        return html;
      }

      // Unordered list
      if (trimmed.match(/^- /m)) {
        const items = trimmed.split("\n").map((line) => {
          const content = line.replace(/^- /, "");
          return `<li>${inlineFormat(content)}</li>`;
        });
        return `<ul>${items.join("")}</ul>`;
      }

      // Ordered list
      if (trimmed.match(/^\d+\. /m)) {
        const items = trimmed.split("\n").map((line) => {
          const content = line.replace(/^\d+\.\s/, "");
          return `<li>${inlineFormat(content)}</li>`;
        });
        return `<ol>${items.join("")}</ol>`;
      }

      // Paragraph
      return `<p>${inlineFormat(trimmed)}</p>`;
    })
    .join("\n");
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const currentIndex = blogPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;
  const nextPost =
    currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: {
      "@type": "Organization",
      name: "MarketPhase",
    },
    publisher: {
      "@type": "Organization",
      name: "MarketPhase",
      url: "https://marketphase.vercel.app",
    },
    mainEntityOfPage: `https://marketphase.vercel.app/blog/${post.slug}`,
    keywords: post.keywords.join(", "),
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <Link
            href="/blog"
            className="text-sm text-gray-500 hover:text-gray-900 transition"
          >
            &larr; Tous les articles
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-gray-900 hover:text-blue-600 transition"
          >
            MarketPhase
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article>
          <header className="mb-10">
            <time
              dateTime={post.date}
              className="text-sm text-gray-400 mb-3 block"
            >
              {formatDate(post.date)} &middot; {post.readingTime} min de lecture
            </time>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
              {post.title}
            </h1>
            <p className="text-lg text-gray-500">{post.excerpt}</p>
          </header>

          <div
            className="
              prose prose-gray max-w-none
              prose-headings:font-semibold prose-headings:text-gray-900
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-gray-600 prose-p:leading-relaxed prose-p:mb-4
              prose-strong:text-gray-900
              prose-ul:my-4 prose-ul:pl-6 prose-ul:list-disc
              prose-ol:my-4 prose-ol:pl-6 prose-ol:list-decimal
              prose-li:text-gray-600 prose-li:mb-2
              prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-table:my-6
            "
            dangerouslySetInnerHTML={{ __html: markdownToHtml(post.content) }}
          />
        </article>

        {/* CTA */}
        <div className="mt-16 p-8 bg-gray-50 rounded-2xl text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Prêt à améliorer votre trading ?
          </h2>
          <p className="text-gray-500 mb-6">
            Créez votre journal de trading gratuit avec MarketPhase. Analytics
            avancés, AI Coach et données de marché en temps réel.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
          >
            Commencer gratuitement
          </Link>
        </div>

        {/* Navigation articles */}
        {(prevPost || nextPost) && (
          <nav className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {prevPost ? (
              <Link
                href={`/blog/${prevPost.slug}`}
                className="group text-left"
              >
                <span className="text-xs text-gray-400 mb-1 block">
                  &larr; Article précédent
                </span>
                <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition">
                  {prevPost.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
            {nextPost && (
              <Link
                href={`/blog/${nextPost.slug}`}
                className="group text-right"
              >
                <span className="text-xs text-gray-400 mb-1 block">
                  Article suivant &rarr;
                </span>
                <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition">
                  {nextPost.title}
                </span>
              </Link>
            )}
          </nav>
        )}
      </main>

      <footer className="border-t border-gray-100 py-8 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} MarketPhase. Tous droits
            r&eacute;serv&eacute;s.
          </p>
        </div>
      </footer>
    </div>
  );
}
