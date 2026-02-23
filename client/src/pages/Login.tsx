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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-teal-50">
      <div className="w-full max-w-md px-8 py-12 bg-white rounded-2xl shadow-elevated text-center space-y-8">
        <div className="space-y-3">
          <div className="text-6xl">🦜</div>
          <h1 className="font-display text-3xl font-bold text-foreground">Aviary Manager</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your personal bird breeding management system. Track your flock, manage breeding pairs, and never miss a hatch date.
          </p>
        </div>
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
