import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="font-heading text-2xl leading-snug font-medium">
            Spotify Wrapped
          </h1>
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
