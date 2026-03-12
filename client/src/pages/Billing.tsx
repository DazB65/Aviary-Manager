import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Bird, Check, CreditCard, Loader2, Sparkles, Star, Zap
} from "lucide-react";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

const FREE_FEATURES = [
  "Up to 10 birds total",
  "1-generation pedigree view",
  "Event reminders",
  "Species database (36 species)",
];

const PRO_FEATURES = [
  "Unlimited birds",
  "Unlimited breeding pairs & broods",
  "5-generation pedigree tree",
  "Inbreeding coefficient calculator",
  "Sibling detection",
  "Descendant view",
  "Clutch egg outcome tracking",
  "PDF pedigree export",
  "Photo uploads",
  "Priority support",
];

export default function Billing() {
  const { user } = useAuth();
  const [loadingInterval, setLoadingInterval] = useState<"monthly" | "yearly" | "lifetime" | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly" | "lifetime">("yearly");

  const isPro = user?.plan === "pro";

  // Check for success/cancel from Stripe redirect
  const params = new URLSearchParams(window.location.search);
  const justUpgraded = params.get("success") === "1";
  const cancelled = params.get("cancelled") === "1";

  async function handleCheckout(interval: "monthly" | "yearly" | "lifetime") {
    setLoadingInterval(interval);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ interval }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Checkout failed"); return; }
      toast.info("Redirecting to checkout...");
      window.open(data.url, "_blank");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingInterval(null);
    }
  }

  async function handlePortal() {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Could not open billing portal"); return; }
      window.open(data.url, "_blank");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingPortal(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-teal-600" />
            Billing & Plan
          </h1>
          <p className="text-gray-500 mt-1">Manage your subscription and billing details.</p>
        </div>

        {/* Success / cancel banners */}
        {justUpgraded && (
          <div className="rounded-xl bg-teal-50 border border-teal-200 p-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-teal-600 shrink-0" />
            <p className="text-teal-800 font-medium">Welcome to Pro! Your account has been upgraded. Enjoy unlimited access.</p>
          </div>
        )}
        {cancelled && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-amber-800">Checkout was cancelled. You're still on the Free plan.</p>
          </div>
        )}

        {/* Current plan */}
        <Card className="border-0 shadow-md bg-gradient-to-r from-teal-50 to-amber-50">
          <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white shadow flex items-center justify-center">
                <Bird className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Current plan</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xl font-bold text-gray-900">{isPro ? "Pro" : "Free"}</span>
                  {isPro && <Badge className="bg-teal-600 text-white text-xs">Active</Badge>}
                </div>
              </div>
            </div>
            {isPro && user?.stripeCustomerId && (
              <Button variant="outline" onClick={handlePortal} disabled={loadingPortal}>
                {loadingPortal && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Manage Subscription
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pricing toggle */}
        {!isPro && (
          <>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4 bg-white border border-gray-200 p-1.5 rounded-full shadow-sm max-w-sm mx-auto">
              <button
                onClick={() => setBillingInterval("monthly")}
                className={`flex-1 py-1.5 px-3 rounded-full text-sm font-medium transition-all ${billingInterval === "monthly" ? "bg-teal-600 text-white shadow" : "text-gray-500 hover:text-gray-900"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval("yearly")}
                className={`flex-1 py-1.5 px-3 rounded-full text-sm font-medium transition-all ${billingInterval === "yearly" ? "bg-teal-600 text-white shadow" : "text-gray-500 hover:text-gray-900"}`}
              >
                Yearly
              </button>
              <button
                onClick={() => setBillingInterval("lifetime")}
                className={`flex-1 py-1.5 px-3 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-1 ${billingInterval === "lifetime" ? "bg-teal-600 text-white shadow" : "text-gray-500 hover:text-gray-900"}`}
              >
                Lifetime
                <Badge className={`px-1 py-0 border-0 ${billingInterval === "lifetime" ? "bg-white/20 text-white" : "bg-teal-100 text-teal-700"} text-[10px]`}>BEST</Badge>
              </button>
            </div>

            {/* Plan cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Free card */}
              <Card className="border-2 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg">Free</CardTitle>
                  <CardDescription>Perfect for getting started</CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">$0</span>
                    <span className="text-gray-500 ml-1">/ forever</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {FREE_FEATURES.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-gray-400 shrink-0" />
                      {f}
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                </CardContent>
              </Card>

              {/* Pro card */}
              <Card className="border-2 border-teal-500 relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  <Star className="w-3 h-3" /> Most Popular
                </div>
                <CardHeader>
                  <CardTitle className="text-lg text-teal-700">Pro</CardTitle>
                  <CardDescription>For serious aviary managers</CardDescription>
                  <div className="mt-2">
                    {billingInterval === "lifetime" ? (
                      <>
                        <span className="text-3xl font-bold text-gray-900">$220</span>
                        <span className="text-gray-500 ml-1">/ forever</span>
                      </>
                    ) : billingInterval === "yearly" ? (
                      <>
                        <span className="text-3xl font-bold text-gray-900">$88</span>
                        <span className="text-gray-500 ml-1">/ year</span>
                        <span className="ml-2 text-sm text-teal-600 font-medium">($7.33/mo)</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-gray-900">$8.80</span>
                        <span className="text-gray-500 ml-1">/ month</span>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {PRO_FEATURES.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-teal-500 shrink-0" />
                      {f}
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => handleCheckout(billingInterval)}
                    disabled={loadingInterval !== null}
                  >
                    {loadingInterval === billingInterval && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Upgrade to Pro
                  </Button>
                  <p className="text-xs text-center text-gray-400">Cancel anytime. No lock-in.</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Pro — already subscribed */}
        {isPro && (
          <Card className="border-2 border-teal-200 bg-teal-50/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-teal-700">
                <Sparkles className="w-5 h-5" /> You're on Pro
              </CardTitle>
              <CardDescription>You have full access to all features.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-2">
              {PRO_FEATURES.map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-teal-500 shrink-0" />
                  {f}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-center text-gray-400">
          Questions about your plan? Email us at{" "}
          <a href="mailto:aviarymanager@icloud.com" className="underline hover:text-gray-200 transition-colors">aviarymanager@icloud.com</a>
        </p>
      </div>
    </DashboardLayout>
  );
}
