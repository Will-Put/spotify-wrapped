import { Card } from "@/components/ui/card";
import { GENRES } from "@/lib/fake-spotify-data";

export function GenreCard() {
  return (
    <Card
      className="h-full gap-0 p-0 ring-0"
      style={{
        backgroundColor: "var(--orange-flame)",
        color: "var(--orange-deep)",
      }}
    >
      <div className="px-6 py-8 sm:px-8">
        <h2
          className="mb-6 text-xs uppercase tracking-[0.3em] opacity-85"
          style={{
            fontFamily: "var(--font-jetbrains)",
            color: "var(--orange-deep)",
          }}
        >
          Genres · 2026
        </h2>
        <ul className="flex flex-col gap-6">
          {GENRES.map((g) => (
            <li key={g.name} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xl font-bold sm:text-2xl">{g.name}</span>
                <span
                  className="font-black tracking-tight tabular-nums"
                  style={{
                    fontSize: "clamp(2rem, 5vw, 3rem)",
                    fontFamily: "var(--font-jetbrains)",
                  }}
                >
                  {g.percent}%
                </span>
              </div>
              <div
                aria-hidden
                className="h-1 w-full rounded-full"
                style={{
                  backgroundColor:
                    "color-mix(in oklab, var(--orange-deep) 20%, transparent)",
                }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${g.percent}%`,
                    backgroundColor: "var(--orange-deep)",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
