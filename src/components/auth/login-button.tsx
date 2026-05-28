import { Button } from "@/components/ui/button";

export function LoginButton({
  label = "Log in with Spotify",
}: {
  label?: string;
}) {
  return (
    <Button
      render={<a href="/api/auth/login" />}
      nativeButton={false}
      className="w-full"
    >
      {label}
    </Button>
  );
}
