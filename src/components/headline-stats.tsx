import { Card, CardContent } from "@/components/ui/card";

type HeadlineStatsProps = {
  topArtist: string | null;
  topTrack: string | null;
  // null when there's no usable time estimate (e.g. Spotify omitted every
  // duration) — the card then shows "—" instead of a misleading "~0m".
  recentTimeLabel: string | null;
  recentCount: number;
  // true when the recently-played call failed. Distinguishes "loaded, genuinely
  // zero plays" from "failed to load" so the card never claims "no recent plays"
  // for data that simply didn't arrive.
  recentUnavailable?: boolean;
};

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card size="sm" className="justify-center">
      <CardContent className="space-y-0.5">
        <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate text-sm font-medium">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

export function HeadlineStats({
  topArtist,
  topTrack,
  recentTimeLabel,
  recentCount,
  recentUnavailable = false,
}: HeadlineStatsProps) {
  const hasPlays = recentCount > 0;
  const latelySub = recentUnavailable
    ? "unavailable"
    : hasPlays
      ? `${recentCount} plays`
      : "no recent plays";
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <Stat label="Top artist" value={topArtist ?? "—"} sub="this window" />
      <Stat label="Top track" value={topTrack ?? "—"} sub="this window" />
      <Stat label="Lately" value={recentTimeLabel ?? "—"} sub={latelySub} />
    </div>
  );
}
