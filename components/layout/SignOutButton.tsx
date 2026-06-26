"use client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import ToggleThemeButton from "./ToggleThemeButton";

export default function SignOutButton() {
  const { signOut } = useAuth();

  return (
    <div className="flex items-center gap-2">
      <ToggleThemeButton />
      <Button variant="outline" onClick={signOut}>
        Sair
      </Button>
    </div>
  );
}
