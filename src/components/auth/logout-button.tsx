import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <Button type="submit" variant="outline" className="w-full">
        Log out
      </Button>
    </form>
  );
}
