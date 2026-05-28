import type { SpotifyTrack } from "@/lib/spotify";

export function TopTracks({ tracks }: { tracks: SpotifyTrack[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Your top tracks (last 4 weeks)
      </h2>
      {tracks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No top tracks yet. Listen to some music on Spotify and come back in a
          few days.
        </p>
      ) : (
        <ol className="space-y-2">
          {tracks.map((track, i) => {
            // Spotify usually returns 3 sizes (640/300/64). Prefer the
            // smallest for a thumbnail; fall back up the chain if absent.
            const thumbnail =
              track.album.images[2] ??
              track.album.images[1] ??
              track.album.images[0];
            return (
              <li key={track.id} className="flex items-center gap-3">
                <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                {thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnail.url}
                    alt={track.album.name}
                    width={40}
                    height={40}
                    className="rounded"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{track.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {track.artists.map((a) => a.name).join(", ")}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
