import type { Metadata } from "next";
import { HeroCard } from "@/components/dashboard/HeroCard";

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
          <div className="lg:col-span-2">
            <HeroCard />
          </div>
        </div>
      </div>
    </main>
  );
}
