// Fake Spotify-Wrapped-style data for the /dashboard playground page.
// Single source of truth — components import from here, never hardcode their own copies.

export type Artist = {
  rank: number;
  name: string;
  genre: string;
  minutes: number;
};

export type Track = {
  rank: number;
  title: string;
  artist: string;
};

export type GenreSplit = {
  name: string;
  percent: number;
};

export type Personality = {
  label: string;
  tagline: string;
};

export const TOTAL_MINUTES = 47283;

export const TOP_ARTISTS: Artist[] = [
  { rank: 1, name: "Treaty Oak Revival", genre: "country",           minutes: 4892 },
  { rank: 2, name: "KETTAMA",            genre: "house",             minutes: 4201 },
  { rank: 3, name: "John Summit",        genre: "house",             minutes: 3847 },
  { rank: 4, name: "Slightly Stoopid",   genre: "reggae rock",       minutes: 2103 },
  { rank: 5, name: "Eric Prydz",         genre: "progressive house", minutes: 1956 },
];

export const TOP_TRACKS: Track[] = [
  { rank: 1, title: "Whole Lotta Lovin'", artist: "Treaty Oak Revival" },
  { rank: 2, title: "Where You Are",      artist: "John Summit, HAYLA" },
  { rank: 3, title: "Opus",               artist: "Eric Prydz" },
  { rank: 4, title: "Last Time",          artist: "KETTAMA" },
  { rank: 5, title: "Closer to the Sun",  artist: "Slightly Stoopid" },
];

export const GENRES: GenreSplit[] = [
  { name: "House",   percent: 62 },
  { name: "Country", percent: 24 },
  { name: "Rap",     percent: 14 },
];

export const PERSONALITY: Personality = {
  label: "House Horse",
  tagline:
    "Half stallion, half subwoofer. Built for back roads and basslines, equally at home in a Galway warehouse and on a back porch at last call.",
};
