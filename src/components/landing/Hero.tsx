export function Hero() {
  return (
    <section
      aria-label="Treaty Oak Revival meets KETTAMA"
      className="relative grid min-h-screen grid-cols-1 lg:grid-cols-2"
    >
      {/* Country side */}
      <div
        className="relative flex flex-col justify-end overflow-hidden px-8 py-16 sm:px-12 lg:py-20"
        style={{
          background:
            "linear-gradient(to bottom, var(--tor-cream) 0%, var(--tor-rust) 100%)",
          color: "var(--tor-text)",
        }}
      >
        <p
          className="mb-6 text-xs uppercase tracking-[0.3em]"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Side A · Texas
        </p>
        <h1
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
        </h1>
        <p
          className="mt-8 text-lg sm:text-xl"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Texas. Dirt. Denim.
        </p>
      </div>

      {/* Rave side */}
      <div
        className="relative flex flex-col justify-end overflow-hidden px-8 py-16 sm:px-12 lg:py-20"
        style={{
          background:
            "radial-gradient(circle at 80% 20%, color-mix(in oklab, var(--kett-acid) 25%, transparent), transparent 55%), var(--kett-black)",
          color: "var(--kett-text)",
        }}
      >
        <p
          className="mb-6 text-xs uppercase tracking-[0.3em]"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          Side B · Galway
        </p>
        <h1
          className="font-bold uppercase leading-[0.85] tracking-tight"
          style={{
            fontFamily: "var(--font-jetbrains)",
            fontSize: "clamp(3.5rem, 11vw, 10rem)",
          }}
        >
          KETT
          <br />
          AMA
        </h1>
        <p
          className="mt-8 text-lg uppercase tracking-widest sm:text-xl"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          Galway. Bass. Fog.
        </p>
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
