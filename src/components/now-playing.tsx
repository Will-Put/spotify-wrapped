"use client";

import { useEffect, useState } from "react";
import type { NowPlayingResult } from "@/lib/spotify";

const POLL_MS = 20_000;

export function NowPlaying() {
  const [state, setState] = useState<NowPlayingResult>({ playing: false });

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("/api/now-playing");
        if (!res.ok) return;
        const data = (await res.json()) as NowPlayingResult;
        if (active) setState(data);
      } catch {
        // transient network error — keep the last known state
      }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (!state.playing) return null;

  const track = state.track;
  const thumbnail =
    track.album.images[2] ?? track.album.images[1] ?? track.album.images[0];

  return (
    <div className="flex items-center gap-3 rounded-lg border p-2">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-green-500" />
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
        <p className="truncate text-xs text-muted-foreground">Now playing</p>
        <p className="truncate text-sm font-medium">{track.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {track.artists.map((a) => a.name).join(", ")}
        </p>
      </div>
    </div>
  );
}
