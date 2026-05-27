import { Card } from "@/components/ui/card";
import { TOTAL_MINUTES } from "@/lib/fake-spotify-data";

const HOURS = Math.round(TOTAL_MINUTES / 60);
const DAYS = Math.round(TOTAL_MINUTES / (60 * 24));

export function HeroCard() {
  return (
    <Card
      className="gap-0 p-0 ring-0"
      style={{
        background:
          "linear-gradient(135deg, var(--orange-flame) 0%, var(--orange-deep) 100%)",
        color: "var(--orange-cream)",
      }}
    >
      <div className="px-8 py-12 sm:px-12 sm:py-16 lg:py-20">
        <p
          className="mb-4 text-xs uppercase tracking-[0.3em] opacity-90"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          Your 2026 in Sound
        </p>
        <h1
          className="font-black leading-[0.85] tracking-tight tabular-nums"
          style={{ fontSize: "clamp(4rem, 14vw, 11rem)" }}
        >
          {TOTAL_MINUTES.toLocaleString()}
        </h1>
        <p
          className="mt-2 text-2xl font-medium opacity-95 sm:text-3xl"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          minutes
        </p>
        <div
          className="mt-8 flex flex-wrap gap-3 text-xs uppercase tracking-widest opacity-90"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          <span className="rounded-full border border-current px-3 py-1">
            ≈ {HOURS.toLocaleString()} hours
          </span>
          <span className="rounded-full border border-current px-3 py-1">
            ≈ {DAYS} days nonstop
          </span>
        </div>
      </div>
    </Card>
  );
}
