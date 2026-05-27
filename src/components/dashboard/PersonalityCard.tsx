import { Card } from "@/components/ui/card";
import { PERSONALITY } from "@/lib/fake-spotify-data";

export function PersonalityCard() {
  return (
    <Card
      className="h-full gap-0 p-0 ring-0"
      style={{
        background:
          "linear-gradient(225deg, var(--orange-mid) 0%, var(--orange-deep) 100%)",
        color: "var(--orange-cream)",
      }}
    >
      <div className="flex h-full flex-col justify-between gap-8 px-6 py-8 sm:px-8">
        <h2
          className="text-xs uppercase tracking-[0.3em] opacity-85"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          Your 2026 Identity
        </h2>
        <p
          className="font-black italic leading-[0.95]"
          style={{
            fontFamily: "var(--font-playfair)",
            fontSize: "clamp(2.5rem, 6vw, 4rem)",
            color: "var(--orange-cream)",
          }}
        >
          {PERSONALITY.label}
        </p>
        <p
          className="text-sm leading-relaxed opacity-90 sm:text-base"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          {PERSONALITY.tagline}
        </p>
      </div>
    </Card>
  );
}
