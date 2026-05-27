import { Badge } from "@/components/ui/badge";

export function IdentityStrip() {
  return (
    <section
      aria-label="Who they are"
      className="grid grid-cols-1 lg:grid-cols-2"
    >
      {/* Country side */}
      <div
        className="flex flex-col gap-6 px-8 py-20 sm:px-12 lg:py-28"
        style={{
          backgroundColor: "var(--tor-cream)",
          color: "var(--tor-text)",
        }}
      >
        <Badge
          className="w-fit border"
          style={{
            backgroundColor: "transparent",
            color: "var(--tor-text)",
            borderColor: "var(--tor-gold)",
            fontFamily: "var(--font-playfair)",
          }}
        >
          EST. 2019 · TX
        </Badge>
        <p
          className="max-w-xl text-xl leading-relaxed sm:text-2xl"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Four sons of East Texas chasing the same broken highway outlaw country
          has always chased. Honky-tonk grit, pedal steel, and writing that
          knows how the last beer at last call tastes. Built for porch lights
          and dirt-road taillights.
        </p>
      </div>

      {/* Rave side */}
      <div
        className="flex flex-col gap-6 px-8 py-20 sm:px-12 lg:py-28"
        style={{
          backgroundColor: "var(--kett-black)",
          color: "var(--kett-text)",
        }}
      >
        <Badge
          className="w-fit border"
          style={{
            backgroundColor: "transparent",
            color: "var(--kett-acid)",
            borderColor: "var(--kett-acid)",
            fontFamily: "var(--font-jetbrains)",
          }}
        >
          LIVE · GALWAY · DUBLIN
        </Badge>
        <p
          className="max-w-xl text-xl leading-relaxed sm:text-2xl"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          Galway-born, Dublin-warehouse-shaped, club-mythology-incarnate.
          Doesn&apos;t DJ a set — detonates one. Hard-edged house with rave-era
          pulse, engineered for systems loud enough to feel in your sternum.
        </p>
      </div>
    </section>
  );
}
