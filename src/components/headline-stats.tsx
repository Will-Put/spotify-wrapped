import { Card, CardContent } from "@/components/ui/card";

type HeadlineStatsProps = {
  topArtist: string | null;
  topTrack: string | null;
  recentTimeLabel: string;
  recentCount: number;
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
}: HeadlineStatsProps) {
  const hasRecent = recentCount > 0;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <Stat label="Top artist" value={topArtist ?? "—"} sub="this window" />
      <Stat label="Top track" value={topTrack ?? "—"} sub="this window" />
      <Stat
        label="Lately"
        value={hasRecent ? recentTimeLabel : "—"}
        sub={hasRecent ? `${recentCount} tracks` : "no recent plays"}
      />
    </div>
  );
}
