import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  AlertTriangle, Bird, Check, CreditCard, Loader2, Sparkles, Star, Zap
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

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
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [loadingInterval, setLoadingInterval] = useState<"monthly" | "yearly" | "lifetime" | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly" | "lifetime">("yearly");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const isPro = user?.plan === "pro";
  // Lifetime users have Pro but no stripeSubscriptionId (one-time payment, not a subscription)
  const isLifetime = isPro && !user?.stripeSubscriptionId;

  // Trial status
  const trialEnd = user && !isPro
    ? (user.planExpiresAt
        ? new Date(user.planExpiresAt)
        : new Date(new Date(user.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000))
    : null;
  const isOnTrial = trialEnd && trialEnd > new Date();
  const trialExpired = trialEnd && trialEnd <= new Date();
  const trialDaysLeft = isOnTrial
    ? Math.max(1, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

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

  async function handleDeleteAccount() {
    setLoadingDelete(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Could not delete account"); return; }
      toast.success("Account deleted. Sorry to see you go.");
      // Give toast time to show, then redirect to landing
      setTimeout(() => { logout?.(); navigate("/"); }, 1500);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingDelete(false);
      setShowDeleteConfirm(false);
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
            <p className="text-amber-800">Checkout was cancelled. Subscribe anytime before your trial ends.</p>
          </div>
        )}

        {/* Trial status banner */}
        {isOnTrial && !justUpgraded && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-center gap-3">
            <Zap className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="text-blue-800">
              You're on a free trial — <strong>{trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} remaining</strong>. Subscribe below to keep full access after your trial ends.
            </p>
          </div>
        )}
        {trialExpired && !isPro && !justUpgraded && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-red-800 font-medium">Your free trial has ended. Subscribe below to regain full access to your data.</p>
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
                  <span className="text-xl font-bold text-gray-900">{isPro ? "Pro" : "Free Trial"}</span>
                  {isPro && <Badge className="bg-teal-600 text-white text-xs">Active</Badge>}
                  {isOnTrial && <Badge className="bg-blue-500 text-white text-xs">{trialDaysLeft}d left</Badge>}
                  {trialExpired && !isPro && <Badge className="bg-red-500 text-white text-xs">Expired</Badge>}
                </div>
              </div>
            </div>
            {isPro && isLifetime && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-100 border border-teal-300 text-teal-800 text-sm font-medium">
                <Zap className="w-4 h-4 text-teal-600 shrink-0" />
                Lifetime Access
              </div>
            )}
            {isPro && !isLifetime && (
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

            {/* Plan card — single Pro */}
            <Card className="border-2 border-teal-500 relative overflow-hidden shadow-lg max-w-lg mx-auto w-full">
              {isOnTrial && (
                <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  <Star className="w-3 h-3" /> {trialDaysLeft}d trial remaining
                </div>
              )}
              {trialExpired && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Trial ended
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg text-teal-700">Pro</CardTitle>
                <CardDescription>For serious aviary managers</CardDescription>
                <div className="mt-2">
                  {billingInterval === "lifetime" ? (
                    <>
                      <span className="text-3xl font-bold text-gray-900">$220</span>
                      <span className="text-gray-500 ml-1">AUD / forever</span>
                    </>
                  ) : billingInterval === "yearly" ? (
                    <>
                      <span className="text-3xl font-bold text-gray-900">$88</span>
                      <span className="text-gray-500 ml-1">AUD / year</span>
                      <span className="ml-2 text-sm text-teal-600 font-medium">($7.33/mo)</span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-gray-900">$8.80</span>
                      <span className="text-gray-500 ml-1">AUD / month</span>
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
                  disabled={loadingInterval !== null || billingInterval === "lifetime"}
                >
                  {loadingInterval === billingInterval && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {billingInterval === "lifetime" ? "Get Lifetime Access" : "Subscribe to Pro"}
                </Button>
                <p className="text-xs text-center text-gray-400">
                  {billingInterval === "lifetime"
                    ? "One-time payment. No recurring fees."
                    : "Cancel anytime. Have a coupon? Apply it at checkout."}
                </p>
              </CardContent>
            </Card>
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

        {/* Support & Legal */}
        <Card className="border border-gray-100 shadow-sm">
          <CardContent className="pt-5 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Need help?</p>
              <p className="text-sm text-gray-500 mt-0.5">Questions about billing, your plan, or anything else.</p>
            </div>
            <a
              href="mailto:aviarymanager@icloud.com"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-teal-200 text-teal-700 text-sm font-medium hover:bg-teal-50 transition-colors shrink-0"
            >
              Contact Support
            </a>
          </CardContent>
        </Card>
        <p className="text-xs text-center text-gray-400">
          <button onClick={() => navigate("/terms")} className="underline hover:text-gray-600 transition-colors">Terms of Service</button>
          {" · "}
          <button onClick={() => navigate("/privacy")} className="underline hover:text-gray-600 transition-colors">Privacy Policy</button>
        </p>

        {/* Danger Zone */}
        <div className="border border-red-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Danger Zone
          </h2>
          <p className="text-sm text-gray-600">
            Permanently delete your account and all data — birds, pairs, broods, events, and settings.
            {user?.stripeSubscriptionId && " Your active subscription will be cancelled immediately."}
            {" "}This cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete my account
            </Button>
          ) : (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 space-y-3">
              <p className="text-sm font-medium text-red-800">
                Are you absolutely sure? All your data will be wiped and cannot be recovered.
              </p>
              <div className="flex gap-3">
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleDeleteAccount}
                  disabled={loadingDelete}
                >
                  {loadingDelete && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Yes, delete everything
                </Button>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={loadingDelete}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
