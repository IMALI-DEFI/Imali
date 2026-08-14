import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";

const API_URL = "https://api.imali-defi.com";

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadPosts() {
      try {
        const response = await fetch(`${API_URL}/api/blog`);

        if (!response.ok) {
          throw new Error("Unable to load articles");
        }

        const data = await response.json();

        if (mounted) {
          setPosts(Array.isArray(data.posts) ? data.posts : []);
        }
      } catch (err) {
        console.error("Blog load error:", err);

        if (mounted) {
          setError("We couldn't load the latest articles.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <Header />

      <main className="pt-32 pb-20">
        <section className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-14">
            <div className="text-emerald-400 text-sm font-bold uppercase tracking-[0.2em] mb-4">
              IMALI Insights
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
              Trading, AI & Automation
            </h1>

            <p className="mt-5 text-lg text-white/60 leading-relaxed">
              Practical guides about automated trading, AI signals,
              noncustodial trading, risk management and building better
              financial technology.
            </p>
          </div>

          {loading && (
            <div className="py-20 text-center text-white/60">
              Loading articles...
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
              {error}
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="py-20 text-center text-white/60">
              New articles are coming soon.
            </div>
          )}

          {!loading && !error && posts.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <article
                  key={post.slug}
                  className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 hover:border-emerald-500/40 hover:bg-white/[0.06] transition"
                >
                  <div className="text-xs uppercase tracking-widest text-emerald-400 mb-4">
                    IMALI Insights
                  </div>

                  <h2 className="text-xl font-bold leading-snug group-hover:text-emerald-300 transition">
                    {String(post.title || "").replace(/^["']+|["']+$/g, "")}
                  </h2>

                  <p className="mt-4 text-white/60 leading-relaxed line-clamp-4">
                    {post.excerpt}
                  </p>

                  <div className="mt-6 flex items-center justify-between gap-4">
                    <span className="text-xs text-white/40">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )
                        : ""}
                    </span>

                    <Link
                      to={`/blog/${post.slug}`}
                      className="text-sm font-bold text-emerald-400 hover:text-emerald-300"
                    >
                      Read article →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
