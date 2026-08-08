import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm" className="gap-2">
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </form>
  );
}
