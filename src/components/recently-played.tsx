import type { RecentlyPlayedItem } from "@/lib/spotify";
import { formatRelativeTime } from "@/lib/time";

export function RecentlyPlayed({ items }: { items: RecentlyPlayedItem[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Recently played
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing played recently. Go listen to something!
        </p>
      ) : (
        <ol className="space-y-2">
          {items.map((item) => {
            const track = item.track;
            const thumbnail =
              track.album.images[2] ??
              track.album.images[1] ??
              track.album.images[0];
            return (
              <li key={item.playedAt} className="flex items-center gap-3">
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
                <span className="text-xs whitespace-nowrap text-muted-foreground">
                  {formatRelativeTime(item.playedAt)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
