import { useEffect, useState } from "react";

const FEEDS = [
  "https://feeds.feedburner.com/TheHackersNews",
  "https://venturebeat.com/feed",
];

async function fetchFeed(url) {
  const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
  const res  = await fetch(api);
  const data = await res.json();
  return data.items || [];
}

export default function NewsModal({ onClose }) {
  const [news,    setNews]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const results = await Promise.all(FEEDS.map(fetchFeed));
        const merged  = results
          .flat()
          .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
          .slice(0, 15)
          .map((item) => ({
            title:   item.title,
            summary: (item.description || "")
              .replace(/<[^>]+>/g, "")
              .trim()
              .slice(0, 180),
            link:   item.link,
            date:   item.pubDate
              ? new Date(item.pubDate).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })
              : "",
            source: item.author || "News",
          }));
        setNews(merged);
      } catch (err) {
        console.error("Failed to load news:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#111118] border border-border rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">📡</span>
            <div>
              <span className="font-bold text-[15px] text-primary">Daily AI &amp; Security News</span>
              <p className="text-[10px] text-muted mt-0.5">Live feed · The Hacker News · VentureBeat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-soft text-lg w-7 h-7 flex items-center justify-center rounded hover:bg-subtle cursor-pointer bg-transparent border-none"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3 sidebar-scroll">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[12px] text-muted">Fetching latest news…</span>
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-10">
              <div className="text-2xl mb-2">⚠️</div>
              <div className="text-[12px] text-muted">Could not load news feed.</div>
              <div className="text-[11px] text-muted mt-1">Check your connection or try again.</div>
            </div>
          )}

          {!loading && !error && news.length === 0 && (
            <div className="text-center text-muted text-[12px] py-10">
              No news items available right now.
            </div>
          )}

          {!loading && !error && news.map((item, i) => (
            <div
              key={i}
              className="p-3 bg-card rounded-lg border border-border/40 hover:border-border/80 transition-colors"
            >
              <div className="flex items-center justify-between text-[10px] text-muted mb-1.5">
                <span>{item.date}</span>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Read ↗
                </a>
              </div>
              <div className="text-[12px] font-semibold text-primary mb-1 leading-snug">
                {item.title}
              </div>
              <div className="text-[11px] text-dim leading-relaxed">
                {item.summary}{item.summary.length === 180 ? "…" : ""}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex-shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-muted">
            Sources: The Hacker News · VentureBeat
          </span>
          <button
            onClick={onClose}
            className="text-[11px] px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 rounded text-white cursor-pointer transition-colors border-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}