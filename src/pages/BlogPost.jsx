import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import Header from "../components/Header";

const API_URL = "https://api.imali-defi.com";

function removeFrontMatter(markdown = "") {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
}

export default function BlogPost() {
  const { slug } = useParams();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadPost() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/blog/${encodeURIComponent(slug)}`
        );

        if (response.status === 404) {
          throw new Error("NOT_FOUND");
        }

        if (!response.ok) {
          throw new Error("LOAD_ERROR");
        }

        const data = await response.json();

        if (mounted) {
          setPost(data.post || null);
        }
      } catch (err) {
        console.error("Blog article error:", err);

        if (mounted) {
          setError(
            err.message === "NOT_FOUND"
              ? "This article could not be found."
              : "We couldn't load this article."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPost();

    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!post) return;

    const cleanTitle = String(post.title || "").replace(
      /^["']+|["']+$/g,
      ""
    );

    document.title = `${cleanTitle} | IMALI`;

    let meta = document.querySelector('meta[name="description"]');

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }

    meta.content = post.excerpt || "";
  }, [post]);

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <Header />

      <main className="pt-32 pb-24">
        <article className="max-w-4xl mx-auto px-6">
          <Link
            to="/blog"
            className="inline-flex items-center text-sm font-semibold text-emerald-400 hover:text-emerald-300 mb-10"
          >
            ← Back to IMALI Insights
          </Link>

          {loading && (
            <div className="py-20 text-center text-white/60">
              Loading article...
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8">
              <h1 className="text-2xl font-bold">{error}</h1>

              <Link
                to="/blog"
                className="inline-block mt-5 text-emerald-400 font-semibold"
              >
                View all articles
              </Link>
            </div>
          )}

          {!loading && !error && post && (
            <>
              <header className="mb-12 border-b border-white/10 pb-10">
                <div className="text-emerald-400 text-sm font-bold uppercase tracking-[0.2em] mb-5">
                  IMALI Insights
                </div>

                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
                  {String(post.title || "").replace(
                    /^["']+|["']+$/g,
                    ""
                  )}
                </h1>

                <p className="mt-6 text-xl text-white/60 leading-relaxed">
                  {post.excerpt}
                </p>

                {post.publishedAt && (
                  <div className="mt-6 text-sm text-white/40">
                    Published{" "}
                    {new Date(post.publishedAt).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </div>
                )}
              </header>

              <div className="text-white/80 leading-8">
                <ReactMarkdown
                  components={{
                    h1: () => null,

                    h2: ({ children }) => (
                      <h2 className="text-3xl font-bold text-white mt-12 mb-5">
                        {children}
                      </h2>
                    ),

                    h3: ({ children }) => (
                      <h3 className="text-2xl font-bold text-white mt-9 mb-4">
                        {children}
                      </h3>
                    ),

                    p: ({ children }) => (
                      <p className="mb-6 text-lg text-white/75 leading-8">
                        {children}
                      </p>
                    ),

                    ul: ({ children }) => (
                      <ul className="list-disc pl-7 mb-6 space-y-2">
                        {children}
                      </ul>
                    ),

                    ol: ({ children }) => (
                      <ol className="list-decimal pl-7 mb-6 space-y-2">
                        {children}
                      </ol>
                    ),

                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 underline"
                      >
                        {children}
                      </a>
                    ),

                    strong: ({ children }) => (
                      <strong className="font-bold text-white">
                        {children}
                      </strong>
                    ),
                  }}
                >
                  {removeFrontMatter(post.content)}
                </ReactMarkdown>
              </div>

              <div className="mt-16 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-8 md:p-10">
                <h2 className="text-2xl font-bold">
                  Explore automated trading with IMALI
                </h2>

                <p className="mt-3 text-white/60">
                  Connect your supported trading account while keeping
                  custody of your assets.
                </p>

                <Link
                  to="/signup"
                  className="inline-block mt-6 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold transition"
                >
                  Get Started
                </Link>
              </div>
            </>
          )}
        </article>
      </main>
    </div>
  );
}
