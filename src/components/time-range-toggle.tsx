import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TimeRange } from "@/lib/spotify";

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "short_term", label: "Last 4 weeks" },
  { value: "medium_term", label: "Last 6 months" },
  { value: "long_term", label: "All time" },
];

export function TimeRangeToggle({ current }: { current: TimeRange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((opt) => (
        <Link
          key={opt.value}
          href={`/?range=${opt.value}`}
          className={cn(
            buttonVariants({
              size: "sm",
              variant: opt.value === current ? "default" : "outline",
            }),
          )}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}
