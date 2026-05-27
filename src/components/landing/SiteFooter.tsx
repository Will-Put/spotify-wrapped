export function SiteFooter() {
  return (
    <footer
      className="px-8 py-8 text-center text-xs uppercase tracking-[0.3em] sm:px-12"
      style={{
        backgroundColor: "var(--tor-text)",
        color: "var(--tor-cream)",
        fontFamily: "var(--font-jetbrains)",
      }}
    >
      <p>A fanmade mood board · built with shadcn · not affiliated</p>
    </footer>
  );
}
