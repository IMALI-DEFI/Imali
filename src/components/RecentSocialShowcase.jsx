// src/components/RecentSocialShowcase.jsx — compact social post card (same data + filters as before).
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaArrowRight, FaUsers } from "react-icons/fa";

const API = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const approvedPlatforms = new Set(["instagram", "threads", "facebook", "x", "youtube", "tiktok"]);
const PLATFORM_LABEL = { instagram: "Instagram", threads: "Threads", facebook: "Facebook", x: "X", youtube: "YouTube", tiktok: "TikTok" };

const goodPosts = (rows = []) => {
  const seen = new Set();
  return rows.filter((p) => {
    const media = p?.media_url || p?.image_url || p?.thumbnail_url;
    const caption = String(p?.caption || p?.text || "").trim();
    const platform = String(p?.platform || "").toLowerCase();
    if (!media || !p?.public_url || caption.length < 40 || !approvedPlatforms.has(platform)) return false;
    if (/logo|fallback|placeholder/i.test(media) || !/APPROVED_/i.test(media) || seen.has(media)) return false;
    seen.add(media);
    return true;
  }).slice(0, 6);
};

export default function RecentSocialShowcase() {
  const [posts, setPosts] = useState([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    let on = true;
    fetch(`${API}/api/public/social/recent?product=imali&limit=12`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => { const p = goodPosts(j?.data?.posts || j?.posts || j?.data || []); if (on) setPosts(p); })
      .catch(() => {});
    return () => { on = false; };
  }, []);

  useEffect(() => {
    if (posts.length < 2) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % posts.length), 6500);
    return () => clearInterval(t);
  }, [posts.length]);

  const p = posts.length ? posts[i % posts.length] : null;
  const rawMedia = p?.media_url || p?.image_url || p?.thumbnail_url;
  const media = rawMedia?.startsWith("/api/") ? API + rawMedia : rawMedia;
  const isVideo = /video/i.test(p?.media_type || p?.type || "") || /\.mp4(?:$|\?)/i.test(media || "");
  const platform = String(p?.platform || "").toLowerCase();
  // Preview text without links/tracking codes (they can't wrap on phones)
  const cleanCaption = String(p?.caption || p?.text || "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\S*(utm_|www\.)\S*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 min-w-0" aria-label="Latest from IMALI">
      {p && (
        <div className="fun-card">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-xl font-black">📣 Latest from IMALI</h2>
            <span className="text-xs font-bold text-white/50">{(i % posts.length) + 1} / {posts.length}</span>
          </div>
          <div key={p.public_url} className="flex gap-3 fun-slide-in">
            <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-white/10 bg-black/30">
              {media && (isVideo
                ? <video className="h-full w-full object-cover" src={media} muted playsInline />
                : <img className="h-full w-full object-cover" src={media} alt={p.title || "IMALI social post"} loading="lazy" />)}
            </div>
            <div className="min-w-0 flex-1">
              <span className="fun-pill" style={{ fontSize: ".7rem", padding: "2px 8px" }}>{PLATFORM_LABEL[platform] || "IMALI Social"}</span>
              <h3 className="mt-1 font-black leading-tight line-clamp-2">{p.title || p.topic || "Latest IMALI update"}</h3>
              <p className="mt-1 text-sm text-white/70 line-clamp-3 break-words">{cleanCaption}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" aria-label="Previous post" onClick={() => setI((x) => (x - 1 + posts.length) % posts.length)} className="fun-btn fun-ghost fun-small"><FaArrowLeft /></button>
            <button type="button" aria-label="Next post" onClick={() => setI((x) => (x + 1) % posts.length)} className="fun-btn fun-ghost fun-small"><FaArrowRight /></button>
            <a href={p.public_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-sm font-black text-[#8dffc4] underline">
              View on {PLATFORM_LABEL[platform] || "social"} →
            </a>
          </div>
        </div>
      )}

      <div className={`fun-card flex flex-col justify-center ${p ? "" : "lg:col-span-2"}`}>
        <h3 className="text-xl font-black">🎁 Share IMALI. Earn recurring commission.</h3>
        <p className="fun-help text-sm mt-1">Join the partner program and earn 25% recurring commission on eligible referred subscriptions.</p>
        <Link to="/referrals" className="fun-btn fun-green mt-4 self-start"><FaUsers /> Join the Partner Program</Link>
      </div>
    </section>
  );
}
