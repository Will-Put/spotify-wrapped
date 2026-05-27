import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TOP_ARTISTS } from "@/lib/fake-spotify-data";

export function TopArtistsCard() {
  return (
    <Card
      className="h-full gap-0 p-0 ring-0"
      style={{
        backgroundColor: "var(--orange-deep)",
        color: "var(--orange-cream)",
      }}
    >
      <div className="px-6 py-8 sm:px-8">
        <h2
          className="mb-6 text-xs uppercase tracking-[0.3em]"
          style={{
            fontFamily: "var(--font-jetbrains)",
            color: "var(--orange-flame)",
          }}
        >
          Top Artists · 2026
        </h2>
        <ol className="flex flex-col gap-5">
          {TOP_ARTISTS.map((artist) => (
            <li key={artist.rank} className="flex items-center gap-4">
              <span
                aria-hidden
                className="font-black leading-none tabular-nums"
                style={{
                  fontSize: "2.5rem",
                  color: "var(--orange-flame)",
                  fontFamily: "var(--font-jetbrains)",
                }}
              >
                {artist.rank}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-base font-semibold sm:text-lg">
                  {artist.name}
                </span>
                <Badge
                  variant="outline"
                  className="w-fit"
                  style={{
                    fontFamily: "var(--font-jetbrains)",
                    borderColor:
                      "color-mix(in oklab, var(--orange-flame) 60%, transparent)",
                    color: "var(--orange-cream)",
                    backgroundColor: "transparent",
                  }}
                >
                  {artist.genre}
                </Badge>
              </div>
              <span
                className="shrink-0 text-sm tabular-nums opacity-75"
                style={{ fontFamily: "var(--font-jetbrains)" }}
              >
                {artist.minutes.toLocaleString()} min
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
