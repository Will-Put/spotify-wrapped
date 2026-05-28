import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Spotify Wrapped</CardTitle>
          <CardDescription>
            Your listening, your year. Coming soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled className="w-full">
            Log in with Spotify
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
