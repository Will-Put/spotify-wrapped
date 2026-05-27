export function QuoteClash() {
  return (
    <section
      aria-label="In their own voices"
      className="grid grid-cols-1 lg:grid-cols-2"
    >
      {/* Country side */}
      <div
        className="flex items-center px-8 py-24 sm:px-12 lg:py-32"
        style={{
          backgroundColor: "var(--tor-rust)",
          color: "var(--tor-cream)",
        }}
      >
        <blockquote
          className="max-w-xl text-3xl leading-tight italic sm:text-4xl lg:text-5xl"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          &ldquo;Whiskey ran the credits
          <br />
          while the porch light kept the count.&rdquo;
        </blockquote>
      </div>

      {/* Rave side */}
      <div
        className="flex items-center px-8 py-24 sm:px-12 lg:py-32"
        style={{
          backgroundColor: "var(--kett-black)",
          color: "var(--kett-acid)",
        }}
      >
        <blockquote
          className="max-w-xl text-3xl leading-tight uppercase tracking-wide sm:text-4xl lg:text-5xl"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          All city
          <br />
          all night
          <br />
          no encore.
        </blockquote>
      </div>
    </section>
  );
}
