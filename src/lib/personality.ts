import type { SpotifyArtist, SpotifyTrack } from "@/lib/spotify";

export type ArchetypeKey = "devotee" | "curator" | "phaseShifter" | "wanderer";

export type Archetype = {
  key: ArchetypeKey;
  name: string;
  description: string;
};

export const ARCHETYPES: Record<ArchetypeKey, Archetype> = {
  devotee: {
    key: "devotee",
    name: "The Devotee",
    description: "A handful of artists, and they've been your core for ages.",
  },
  curator: {
    key: "curator",
    name: "The Curator",
    description: "Broad taste that's remarkably steady.",
  },
  phaseShifter: {
    key: "phaseShifter",
    name: "The Phase-Shifter",
    description:
      "You lock onto a few artists hard, then move to the next obsession.",
  },
  wanderer: {
    key: "wanderer",
    name: "The Wanderer",
    description: "Wide open ears, never the same month twice.",
  },
};

export type Personality = {
  explorerPct: number;
  evolvingPct: number;
  archetype: Archetype;
};

const MIN_TRACKS = 10;

/** % of top tracks whose primary artist is distinct. 0 if no tracks. */
export function computeExplorerPct(tracks: SpotifyTrack[]): number {
  if (tracks.length === 0) return 0;
  const artistIds = new Set<string>();
  for (const t of tracks) {
    const primary = t.artists[0]?.id;
    if (primary) artistIds.add(primary);
  }
  return Math.round((100 * artistIds.size) / tracks.length);
}

/** % of recent top artists NOT present in the all-time list. 0 if no recent. */
export function computeEvolvingPct(
  shortTermArtists: SpotifyArtist[],
  longTermArtists: SpotifyArtist[],
): number {
  if (shortTermArtists.length === 0) return 0;
  const longIds = new Set(longTermArtists.map((a) => a.id));
  const newCount = shortTermArtists.filter((a) => !longIds.has(a.id)).length;
  return Math.round((100 * newCount) / shortTermArtists.length);
}

export function pickArchetype(
  explorerPct: number,
  evolvingPct: number,
): Archetype {
  const explorer = explorerPct >= 50;
  const evolving = evolvingPct >= 50;
  if (explorer && evolving) return ARCHETYPES.wanderer;
  if (explorer) return ARCHETYPES.curator;
  if (evolving) return ARCHETYPES.phaseShifter;
  return ARCHETYPES.devotee;
}

export function hasEnoughData(
  tracks: SpotifyTrack[],
  shortTermArtists: SpotifyArtist[],
  longTermArtists: SpotifyArtist[],
): boolean {
  return (
    tracks.length >= MIN_TRACKS &&
    shortTermArtists.length > 0 &&
    longTermArtists.length > 0
  );
}

export function computePersonality(
  tracks: SpotifyTrack[],
  shortTermArtists: SpotifyArtist[],
  longTermArtists: SpotifyArtist[],
): Personality {
  const explorerPct = computeExplorerPct(tracks);
  const evolvingPct = computeEvolvingPct(shortTermArtists, longTermArtists);
  return {
    explorerPct,
    evolvingPct,
    archetype: pickArchetype(explorerPct, evolvingPct),
  };
}

/** Best available artist image URL (Spotify lists largest-first). */
export function artistImageUrl(artist: SpotifyArtist): string | undefined {
  return (
    artist.images?.[2]?.url ??
    artist.images?.[1]?.url ??
    artist.images?.[0]?.url
  );
}
