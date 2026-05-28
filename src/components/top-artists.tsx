import type { SpotifyArtist } from "@/lib/spotify";

export function TopArtists({ artists }: { artists: SpotifyArtist[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">Top artists</h2>
      {artists.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No top artists yet. Listen to some music on Spotify and come back in a
          few days.
        </p>
      ) : (
        <ol className="space-y-2">
          {artists.map((artist, i) => {
            // Spotify can omit `images`/`genres` on some artists, so index
            // defensively (?.) — the type says these are always present, but
            // the live API doesn't always agree.
            const photo =
              artist.images?.[2] ?? artist.images?.[1] ?? artist.images?.[0];
            const topGenre = artist.genres?.[0];
            return (
              <li key={artist.id} className="flex items-center gap-3">
                <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.url}
                    alt={artist.name}
                    width={40}
                    height={40}
                    className="rounded"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{artist.name}</p>
                  {topGenre && (
                    <p className="truncate text-xs text-muted-foreground">
                      {topGenre}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
