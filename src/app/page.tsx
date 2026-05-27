import { Hero } from "@/components/landing/Hero";
import { IdentityStrip } from "@/components/landing/IdentityStrip";
import { QuoteClash } from "@/components/landing/QuoteClash";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <IdentityStrip />
      <QuoteClash />
    </main>
  );
}
