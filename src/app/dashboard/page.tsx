import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Spotify Wrapped",
  description: "A fake Spotify Wrapped poster — playground PR 2.",
};

export default function DashboardPage() {
  return (
    <main
      className="min-h-dvh w-full"
      style={{ backgroundColor: "#000", color: "var(--orange-cream)" }}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card slots go here. Hero spans both columns; the next four cards
              fill the 2×2 grid in order: Artists, Tracks, Genres, Personality. */}
          <div
            className="lg:col-span-2 rounded-xl border border-dashed p-12 text-center text-sm uppercase tracking-widest opacity-60"
            style={{
              borderColor: "var(--orange-flame)",
              fontFamily: "var(--font-jetbrains)",
            }}
          >
            Dashboard scaffold · cards coming
          </div>
        </div>
      </div>
    </main>
  );
}
