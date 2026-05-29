import { describe, it, expect } from "vitest";
import {
  summarizeRecentListening,
  formatListeningTime,
} from "@/lib/listening";
import type { RecentlyPlayedItem } from "@/lib/spotify";

// Minimal RecentlyPlayedItem factory for tests.
function item(durationMs: number | undefined): RecentlyPlayedItem {
  return {
    track: {
      id: "t",
      name: "Track",
      artists: [{ id: "a", name: "Artist" }],
      album: { name: "Album", images: [] },
      duration_ms: durationMs,
    },
    playedAt: "2026-05-29T00:00:00.000Z",
  };
}

describe("summarizeRecentListening", () => {
  it("returns zeros for an empty list", () => {
    expect(summarizeRecentListening([])).toEqual({ totalMs: 0, trackCount: 0 });
  });

  it("sums durations and counts tracks", () => {
    const result = summarizeRecentListening([item(200000), item(220000)]);
    expect(result).toEqual({ totalMs: 420000, trackCount: 2 });
  });

  it("treats a missing duration as 0 but still counts the track", () => {
    const result = summarizeRecentListening([item(200000), item(undefined)]);
    expect(result).toEqual({ totalMs: 200000, trackCount: 2 });
  });
});

describe("formatListeningTime", () => {
  it("formats zero as ~0m", () => {
    expect(formatListeningTime(0)).toBe("~0m");
  });

  it("formats a sub-hour total as minutes only", () => {
    expect(formatListeningTime(720000)).toBe("~12m"); // 12 min
  });

  it("formats a multi-hour total as hours and minutes", () => {
    expect(formatListeningTime(11520000)).toBe("~3h 12m"); // 192 min
  });

  it("rounds to the nearest minute", () => {
    expect(formatListeningTime(90000)).toBe("~2m"); // 1.5 min rounds to 2
  });
});
