import Image from "next/image";

export function Hero() {
  return (
    <section
      aria-label="Treaty Oak Revival meets KETTAMA"
      className="relative grid min-h-screen grid-cols-1 lg:grid-cols-2"
    >
      <h1 className="sr-only">
        Treaty Oak Revival × KETTAMA — a fanmade mood board
      </h1>
      {/* Country side */}
      <div
        className="relative flex flex-col justify-end overflow-hidden px-8 py-16 sm:px-12 lg:py-20"
        style={{ color: "var(--tor-text)" }}
      >
        <Image
          src="/images/hero-country.jpg"
          alt="Dusty open-air country landscape at golden hour"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          style={{ filter: "grayscale(0.6) sepia(0.5) contrast(0.95)" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, color-mix(in oklab, var(--tor-cream) 85%, transparent) 0%, color-mix(in oklab, var(--tor-rust) 88%, transparent) 100%)",
          }}
        />
        <div className="relative">
          <p
            className="mb-6 text-xs uppercase tracking-[0.3em]"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Side A · Texas
          </p>
          <h2
            className="font-black leading-[0.85] tracking-tight"
            style={{
              fontFamily: "var(--font-playfair)",
              fontSize: "clamp(3.5rem, 11vw, 10rem)",
            }}
          >
            Treaty
            <br />
            Oak
            <br />
            Revival
          </h2>
          <p
            className="mt-8 text-lg sm:text-xl"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Texas. Dirt. Denim.
          </p>
        </div>
      </div>

      {/* Rave side */}
      <div
        className="relative flex flex-col justify-end overflow-hidden px-8 py-16 sm:px-12 lg:py-20"
        style={{ color: "var(--kett-text)" }}
      >
        <Image
          src="/images/hero-rave.jpg"
          alt="Foggy nightclub crowd lit by strobes"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          style={{ filter: "grayscale(0.85) contrast(1.1) brightness(0.55)" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 80% 20%, color-mix(in oklab, var(--kett-acid) 30%, transparent), transparent 55%), color-mix(in oklab, var(--kett-black) 82%, transparent)",
          }}
        />
        <div className="relative">
          <p
            className="mb-6 text-xs uppercase tracking-[0.3em]"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            Side B · Galway
          </p>
          <h2
            className="font-bold uppercase leading-[0.85] tracking-tight"
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "clamp(3.5rem, 11vw, 10rem)",
            }}
          >
            KETT
            <br />
            AMA
          </h2>
          <p
            className="mt-8 text-lg uppercase tracking-widest sm:text-xl"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            Galway. Bass. Fog.
          </p>
        </div>
      </div>

      {/* Divider label — sits on the seam between halves */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden items-center justify-center lg:flex"
      >
        <span
          className="rounded-full border px-3 py-1 text-xs uppercase tracking-[0.4em]"
          style={{
            fontFamily: "var(--font-jetbrains)",
            backgroundColor: "var(--kett-black)",
            color: "var(--kett-text)",
            borderColor: "var(--tor-gold)",
          }}
        >
          ×
        </span>
      </div>
    </section>
  );
}
