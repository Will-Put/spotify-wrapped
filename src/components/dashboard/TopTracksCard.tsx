import { Card } from "@/components/ui/card";
import { TOP_TRACKS } from "@/lib/fake-spotify-data";

export function TopTracksCard() {
  return (
    <Card
      className="h-full gap-0 p-0 ring-0"
      style={{
        backgroundColor: "var(--orange-cream)",
        color: "var(--orange-deep)",
      }}
    >
      <div className="px-6 py-8 sm:px-8">
        <h2
          className="mb-6 text-xs uppercase tracking-[0.3em]"
          style={{
            fontFamily: "var(--font-jetbrains)",
            color: "var(--orange-mid)",
          }}
        >
          Top Tracks · 2026
        </h2>
        <ol className="flex flex-col gap-5">
          {TOP_TRACKS.map((track) => (
            <li key={track.rank} className="flex items-center gap-4">
              <span
                aria-hidden
                className="font-black leading-none tabular-nums"
                style={{
                  fontSize: "2.5rem",
                  color: "var(--orange-mid)",
                  fontFamily: "var(--font-jetbrains)",
                }}
              >
                {track.rank}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-base font-semibold sm:text-lg">
                  {track.title}
                </span>
                <span
                  className="truncate text-xs uppercase tracking-wider opacity-70"
                  style={{ fontFamily: "var(--font-jetbrains)" }}
                >
                  {track.artist}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
