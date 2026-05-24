"use client";
import { useFeedStore } from "@/store/feedStore";

const CATEGORIES = ["All", "Baroque", "Renaissance", "Portraits", "Modern", "New 3D"];

export default function CategoryFilter() {
  const activeCategory = useFeedStore((s) => s.activeCategory);
  const setCategory = useFeedStore((s) => s.setCategory);

  return (
    <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide shrink-0">
      {CATEGORIES.map((cat) => {
        const active = activeCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="shrink-0 px-4 py-1.5 rounded-pill text-sm font-medium transition-colors"
            style={{
              backgroundColor: active ? "#1A1A1A" : "#DCC3AA",
              color: active ? "#F1E2D1" : "#1A1A1A",
              border: `1px solid ${active ? "#1A1A1A" : "#C2A07A"}`,
            }}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
