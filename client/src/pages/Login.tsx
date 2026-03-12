import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      setLocation("/");
    }
  }, [user, loading, setLocation]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-amber-50 via-orange-50 to-teal-50 px-4">
      <img src="/logo-color.svg" alt="Aviary Manager" className="w-72 h-auto" />
      <div className="w-full max-w-sm px-8 py-10 bg-white rounded-2xl shadow-elevated text-center space-y-6">
        <Button
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 text-white font-semibold shadow-md"
          onClick={() => { window.location.href = getLoginUrl(); }}
        >
          Sign in to continue
        </Button>
        <p className="text-xs text-muted-foreground">
          Secure login powered by Manus OAuth
        </p>
      </div>
    </div>
  );
}
