import { NextResponse } from "next/server";
import { getNowPlaying, getSession } from "@/lib/spotify";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ playing: false });
  const result = await getNowPlaying(session.accessToken);
  return NextResponse.json(result);
}
