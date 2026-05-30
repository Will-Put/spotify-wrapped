import { loadPersonality } from "@/lib/loaders";
import { PersonalityCard } from "@/components/personality-card";
import { SectionError } from "@/components/sections/section-ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TITLE = "Your listening personality";

export async function PersonalitySection({
  accessToken,
}: {
  accessToken: string;
}) {
  const result = await loadPersonality(accessToken);

  if (!result.ok) return <SectionError title={TITLE} />;

  if (!result.enough) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">{TITLE}</h2>
        <p className="text-sm text-muted-foreground">
          Not enough listening history yet to read your personality. Come back
          after you&rsquo;ve listened to more on Spotify.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PersonalityCard
        personality={result.personality}
        topArtists={result.topArtists}
      />
      <a
        href="/api/personality/card"
        className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
      >
        Save image
      </a>
    </div>
  );
}
