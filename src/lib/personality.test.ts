import { describe, it, expect } from "vitest";
import {
  computeExplorerPct,
  computeEvolvingPct,
  pickArchetype,
  hasEnoughData,
  computePersonality,
  ARCHETYPES,
} from "@/lib/personality";
import type { SpotifyArtist, SpotifyTrack } from "@/lib/spotify";

// A track whose primary artist is `primaryArtistId` (or no artist if null).
function track(primaryArtistId: string | null): SpotifyTrack {
  return {
    id: "t",
    name: "Track",
    artists: primaryArtistId
      ? [{ id: primaryArtistId, name: primaryArtistId }]
      : [],
    album: { name: "Album", images: [] },
  };
}
function artist(id: string): SpotifyArtist {
  return { id, name: id };
}

describe("computeExplorerPct", () => {
  it("returns 0 for no tracks", () => {
    expect(computeExplorerPct([])).toBe(0);
  });
  it("returns 100 when every track is a different artist", () => {
    expect(
      computeExplorerPct([track("a"), track("b"), track("c"), track("d")]),
    ).toBe(100);
  });
  it("returns 50 when tracks share artists", () => {
    expect(
      computeExplorerPct([track("a"), track("a"), track("b"), track("b")]),
    ).toBe(50);
  });
  it("ignores tracks with no primary artist in the unique count", () => {
    // unique {a, b} = 2 over 4 tracks = 50
    expect(
      computeExplorerPct([track("a"), track(null), track("b"), track("a")]),
    ).toBe(50);
  });
});

describe("computeEvolvingPct", () => {
  it("returns 0 when there are no recent artists", () => {
    expect(computeEvolvingPct([], [artist("a")])).toBe(0);
  });
  it("returns 0 when all recent artists are also all-time", () => {
    const list = [artist("a"), artist("b"), artist("c")];
    expect(computeEvolvingPct(list, list)).toBe(0);
  });
  it("returns 100 when no recent artist is in the all-time list", () => {
    expect(
      computeEvolvingPct([artist("a"), artist("b"), artist("c")], []),
    ).toBe(100);
  });
  it("returns the fraction of recent artists that are new", () => {
    // recent a,b,c,d ; all-time a,b -> new c,d = 2/4 = 50
    expect(
      computeEvolvingPct(
        [artist("a"), artist("b"), artist("c"), artist("d")],
        [artist("a"), artist("b")],
      ),
    ).toBe(50);
  });
});

describe("pickArchetype", () => {
  it("maps the four quadrants", () => {
    expect(pickArchetype(60, 60)).toBe(ARCHETYPES.wanderer);
    expect(pickArchetype(60, 40)).toBe(ARCHETYPES.curator);
    expect(pickArchetype(40, 60)).toBe(ARCHETYPES.phaseShifter);
    expect(pickArchetype(40, 40)).toBe(ARCHETYPES.devotee);
  });
  it("treats exactly 50 as the high side on each axis", () => {
    expect(pickArchetype(50, 50)).toBe(ARCHETYPES.wanderer);
    expect(pickArchetype(49, 50)).toBe(ARCHETYPES.phaseShifter);
    expect(pickArchetype(50, 49)).toBe(ARCHETYPES.curator);
    expect(pickArchetype(49, 49)).toBe(ARCHETYPES.devotee);
  });
});

describe("hasEnoughData", () => {
  const tenTracks = Array.from({ length: 10 }, (_, i) => track(String(i)));
  it("is false with fewer than 10 tracks", () => {
    expect(hasEnoughData([track("a")], [artist("a")], [artist("a")])).toBe(
      false,
    );
  });
  it("is false with no recent artists", () => {
    expect(hasEnoughData(tenTracks, [], [artist("a")])).toBe(false);
  });
  it("is false with no all-time artists", () => {
    expect(hasEnoughData(tenTracks, [artist("a")], [])).toBe(false);
  });
  it("is true with enough of everything", () => {
    expect(hasEnoughData(tenTracks, [artist("a")], [artist("a")])).toBe(true);
  });
});

describe("computePersonality", () => {
  it("combines both scores into an archetype", () => {
    const tracks = [track("a"), track("b"), track("c"), track("d")]; // 100 explorer
    const short = [artist("x"), artist("y")]; // both new vs long -> 100 evolving
    const long = [artist("a")];
    expect(computePersonality(tracks, short, long)).toEqual({
      explorerPct: 100,
      evolvingPct: 100,
      archetype: ARCHETYPES.wanderer,
    });
  });
});
