import { Hero } from "@/components/landing/Hero";
import { IdentityStrip } from "@/components/landing/IdentityStrip";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <IdentityStrip />
    </main>
  );
}
