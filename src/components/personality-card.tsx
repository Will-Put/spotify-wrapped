import { artistImageUrl, type Personality } from "@/lib/personality";
import type { SpotifyArtist } from "@/lib/spotify";

export function PersonalityCard({
  personality,
  topArtists,
}: {
  personality: Personality;
  topArtists: SpotifyArtist[];
}) {
  const { archetype, explorerPct, evolvingPct } = personality;
  return (
    <div className="overflow-hidden rounded-xl bg-gradient-to-b from-emerald-950 to-black p-6 text-white">
      <p className="text-[11px] tracking-[0.2em] text-white/60 uppercase">
        Listening Personality
      </p>
      <h2 className="mt-1 text-2xl font-bold">{archetype.name}</h2>
      <p className="mt-1 text-sm text-white/80">{archetype.description}</p>

      <div className="mt-4 flex gap-2">
        <PersonalityStat label="Explorer" value={explorerPct} />
        <PersonalityStat label="Evolving" value={evolvingPct} />
      </div>

      <p className="mt-4 text-[10px] tracking-wider text-white/60 uppercase">
        Built from your top artists
      </p>
      <div className="mt-2 flex items-center gap-2">
        {topArtists.map((a) => {
          const url = artistImageUrl(a);
          return url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={a.id}
              src={url}
              alt={a.name}
              width={36}
              height={36}
              className="size-9 rounded-full object-cover"
            />
          ) : (
            <span
              key={a.id}
              className="flex size-9 items-center justify-center rounded-full bg-emerald-500/30 text-sm font-medium"
            >
              {a.name.charAt(0)}
            </span>
          );
        })}
        <span className="truncate text-xs text-white/80">
          {topArtists.map((a) => a.name).join(", ")}
        </span>
      </div>

      <p className="mt-4 text-[10px] text-white/50">
        spotify-wrapped-lemon.vercel.app
      </p>
    </div>
  );
}

function PersonalityStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 rounded-lg bg-white/10 p-2.5">
      <div className="text-xl font-bold text-emerald-400">{value}%</div>
      <div className="text-[10px] text-white/70">{label}</div>
    </div>
  );
}
