"use client";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import ToggleThemeButton from "./ToggleThemeButton";

export default function SignOutButton() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <ToggleThemeButton />
      <Button
        variant="outline"
        onClick={async () => {
          await supabase.auth.signOut();
          router.push("/login");
        }}
      >
        Sair
      </Button>
    </div>
  );
}
