import { ImageResponse } from "next/og";
import { getSession } from "@/lib/spotify";
import { loadPersonality } from "@/lib/loaders";
import { artistImageUrl } from "@/lib/personality";

async function toDataUrl(url: string | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const result = await loadPersonality(session.accessToken);
  if (!result.ok || !result.enough) {
    return new Response("Personality unavailable", { status: 404 });
  }

  const { personality, topArtists } = result;
  const avatars = await Promise.all(
    topArtists.map(async (a) => ({
      name: a.name,
      dataUrl: await toDataUrl(artistImageUrl(a)),
    })),
  );
  const names = avatars.map((a) => a.name).join(", ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(160deg, #0b3d2e, #0a0a0a 70%)",
          color: "white",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 28,
              letterSpacing: 6,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            LISTENING PERSONALITY
          </div>
          <div style={{ fontSize: 96, fontWeight: 800, marginTop: 16 }}>
            {personality.archetype.name}
          </div>
          <div
            style={{
              fontSize: 34,
              color: "rgba(255,255,255,0.8)",
              marginTop: 8,
            }}
          >
            {personality.archetype.description}
          </div>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: "rgba(255,255,255,0.1)",
              borderRadius: 24,
              padding: 28,
            }}
          >
            <div style={{ fontSize: 64, fontWeight: 700, color: "#1DB954" }}>
              {`${personality.explorerPct}%`}
            </div>
            <div style={{ fontSize: 26, color: "rgba(255,255,255,0.7)" }}>
              Explorer
            </div>
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: "rgba(255,255,255,0.1)",
              borderRadius: 24,
              padding: 28,
            }}
          >
            <div style={{ fontSize: 64, fontWeight: 700, color: "#1DB954" }}>
              {`${personality.evolvingPct}%`}
            </div>
            <div style={{ fontSize: 26, color: "rgba(255,255,255,0.7)" }}>
              Evolving
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 24,
              letterSpacing: 4,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            BUILT FROM YOUR TOP ARTISTS
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginTop: 16,
            }}
          >
            {avatars.map((a, i) =>
              a.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={a.dataUrl}
                  width={96}
                  height={96}
                  style={{ borderRadius: 9999 }}
                  alt=""
                />
              ) : (
                <div
                  key={i}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 9999,
                    background: "rgba(29,185,84,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 40,
                    fontWeight: 600,
                  }}
                >
                  {a.name.charAt(0)}
                </div>
              ),
            )}
            <div style={{ fontSize: 28, color: "rgba(255,255,255,0.8)" }}>
              {names}
            </div>
          </div>
          <div
            style={{
              fontSize: 24,
              color: "rgba(255,255,255,0.5)",
              marginTop: 32,
            }}
          >
            spotify-wrapped-lemon.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1000,
      height: 1250,
      headers: {
        "Content-Disposition":
          'attachment; filename="listening-personality.png"',
      },
    },
  );
}
