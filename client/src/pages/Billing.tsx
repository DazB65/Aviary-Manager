import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  AlertTriangle, Bird, Bot, Check, CreditCard, Loader2, Sparkles, Star, Zap
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

const STARTER_FEATURES = [
  "Unlimited birds",
  "Unlimited breeding pairs & broods",
  "4-generation pedigree tree",
  "Inbreeding coefficient calculator",
  "Sibling detection",
  "Descendant view",
  "Clutch egg outcome tracking",
  "PDF pedigree export",
  "Photo uploads",
  "Priority support",
];

const PRO_EXTRAS = [
  "AI Assistant — pair birds by chat",
  "AI clutch & event management",
  "AI breeding recommendations",
  "Smart mutation advice",
];

export default function Billing() {
  const { user, logout, refresh } = useAuth();
  const [, navigate] = useLocation();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const isPro = user?.plan === "pro";
  const isStarter = user?.plan === "starter";
  const isPaid = isPro || isStarter;

  // Trial status
  const trialEnd = user && !isPaid
    ? (user.planExpiresAt
        ? new Date(user.planExpiresAt)
        : new Date(new Date(user.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000))
    : null;
  const isOnTrial = trialEnd && trialEnd > new Date();
  const trialExpired = trialEnd && trialEnd <= new Date();
  const trialDaysLeft = isOnTrial
    ? Math.max(1, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const params = new URLSearchParams(window.location.search);
  const justUpgraded = params.get("success") === "1";
  const cancelled = params.get("cancelled") === "1";
  const checkoutSessionId = params.get("session_id");
  const isSyncingPaidReturn = justUpgraded && !isPaid;

  useEffect(() => {
    if (!justUpgraded) return;

    let cancelled = false;

    async function syncCheckout() {
      try {
        if (checkoutSessionId) {
          const res = await fetch("/api/stripe/sync-checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ sessionId: checkoutSessionId }),
          });
          if (!res.ok && res.status !== 409) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Could not confirm checkout");
          }
        }

        if (!cancelled) await refresh();
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err?.message || "Payment received, but your plan is still syncing. Please refresh in a moment.");
        }
      }
    }

    syncCheckout();

    return () => {
      cancelled = true;
    };
  }, [checkoutSessionId, justUpgraded, refresh]);

  async function handleCheckout(plan: "starter" | "pro") {
    const key = `${plan}-${billingInterval}`;
    setLoadingPlan(key);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ interval: billingInterval, plan }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Checkout failed"); return; }
      toast.info("Redirecting to checkout...");
      window.open(data.url, "_blank");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingPlan(null);
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
      setTimeout(() => { logout?.(); navigate("/"); }, 1500);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingDelete(false);
      setShowDeleteConfirm(false);
    }
  }

  const starterMonthly = "$4.99";
  const starterYearly = "$49";
  const proMonthly = "$9.99";
  const proYearly = "$99";

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

        {/* Banners */}
        {justUpgraded && (
          <div className="rounded-xl bg-teal-50 border border-teal-200 p-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-teal-600 shrink-0" />
            <p className="text-teal-800 font-medium">
              {isPaid ? "Welcome! Your account has been upgraded." : "Payment received. Finalising your plan..."}
            </p>
          </div>
        )}
        {cancelled && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-amber-800">Checkout was cancelled. Subscribe anytime before your trial ends.</p>
          </div>
        )}
        {isOnTrial && !justUpgraded && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-center gap-3">
            <Zap className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="text-blue-800">
              You're on a Pro trial — <strong>{trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} remaining</strong>. Subscribe below to keep access after your trial ends.
            </p>
          </div>
        )}
        {trialExpired && !isPaid && !justUpgraded && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-red-800 font-medium">Your trial has ended. Subscribe below to regain access.</p>
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
                  <span className="text-xl font-bold text-gray-900">
                    {isPro ? "Pro" : isStarter ? "Starter" : isSyncingPaidReturn ? "Finalising" : "Trial"}
                  </span>
                  {isPaid && <Badge className="bg-teal-600 text-white text-xs">Active</Badge>}
                  {isSyncingPaidReturn && <Badge className="bg-teal-600 text-white text-xs">Syncing</Badge>}
                  {isOnTrial && !isSyncingPaidReturn && <Badge className="bg-blue-500 text-white text-xs">{trialDaysLeft}d left</Badge>}
                  {trialExpired && !isPaid && !isSyncingPaidReturn && <Badge className="bg-red-500 text-white text-xs">Expired</Badge>}
                </div>
              </div>
            </div>
            {isPaid && (
              <Button variant="outline" onClick={handlePortal} disabled={loadingPortal}>
                {loadingPortal && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Manage Subscription
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pricing toggle */}
        {!isPaid && !isSyncingPaidReturn && (
          <>
            <div className="flex items-center justify-center gap-2 bg-white border border-gray-200 p-1.5 rounded-full shadow-sm max-w-xs mx-auto">
              <button
                onClick={() => setBillingInterval("monthly")}
                className={`flex-1 py-1.5 px-4 rounded-full text-sm font-medium transition-all ${billingInterval === "monthly" ? "bg-teal-600 text-white shadow" : "text-gray-500 hover:text-gray-900"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval("yearly")}
                className={`flex-1 py-1.5 px-4 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-1 ${billingInterval === "yearly" ? "bg-teal-600 text-white shadow" : "text-gray-500 hover:text-gray-900"}`}
              >
                Yearly
                <Badge className={`px-1 py-0 border-0 text-[10px] ${billingInterval === "yearly" ? "bg-white/20 text-white" : "bg-teal-100 text-teal-700"}`}>Save</Badge>
              </button>
            </div>

            {/* Plan cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Starter */}
              <Card className="border-2 border-gray-200 relative overflow-hidden shadow-sm">
                {isOnTrial && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                    <Star className="w-3 h-3" /> {trialDaysLeft}d trial
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg text-gray-700">Starter</CardTitle>
                  <CardDescription>All the essentials for your aviary</CardDescription>
                  <div className="mt-2">
                    {billingInterval === "yearly" ? (
                      <>
                        <span className="text-3xl font-bold text-gray-900">{starterYearly}</span>
                        <span className="text-gray-500 ml-1">USD / year</span>
                        <span className="ml-2 text-sm text-teal-600 font-medium">($4.08/mo)</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-gray-900">{starterMonthly}</span>
                        <span className="text-gray-500 ml-1">USD / month</span>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {STARTER_FEATURES.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-teal-500 shrink-0" />
                      {f}
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <Button
                    variant="outline"
                    className="w-full border-gray-300"
                    onClick={() => handleCheckout("starter")}
                    disabled={loadingPlan !== null}
                  >
                    {loadingPlan === `starter-${billingInterval}` && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Subscribe to Starter
                  </Button>
                  <p className="text-xs text-center text-gray-400">Cancel anytime.</p>
                </CardContent>
              </Card>

              {/* Pro */}
              <Card className="border-2 border-teal-500 relative overflow-hidden shadow-lg">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-400" />
                <div className="absolute top-1 right-0 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Most Popular
                </div>
                {isOnTrial && (
                  <div className="absolute top-1 left-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-br-lg flex items-center gap-1">
                    <Star className="w-3 h-3" /> Trialling now
                  </div>
                )}
                <CardHeader className="pt-6">
                  <CardTitle className="text-lg text-teal-700">Pro</CardTitle>
                  <div className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl px-3 py-2 mt-2">
                    <Bot className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="text-xs font-bold">Includes AI Assistant</p>
                      <p className="text-[11px] text-teal-100">Manage your aviary by chat</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    {billingInterval === "yearly" ? (
                      <>
                        <span className="text-3xl font-bold text-gray-900">{proYearly}</span>
                        <span className="text-gray-500 ml-1">USD / year</span>
                        <span className="ml-2 text-sm text-teal-600 font-medium">($10.75/mo)</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-gray-900">{proMonthly}</span>
                        <span className="text-gray-500 ml-1">USD / month</span>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {STARTER_FEATURES.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-gray-400 shrink-0" />
                      {f}
                    </div>
                  ))}
                  <Separator className="my-1" />
                  <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 space-y-2">
                    <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide flex items-center gap-1">
                      <Zap className="w-3 h-3" /> AI-powered actions
                    </p>
                    {PRO_EXTRAS.map(f => (
                      <div key={f} className="flex items-center gap-2 text-sm text-teal-800 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                  <Separator className="my-2" />
                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                    onClick={() => handleCheckout("pro")}
                    disabled={loadingPlan !== null}
                  >
                    {loadingPlan === `pro-${billingInterval}` ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Subscribe to Pro
                  </Button>
                  <p className="text-xs text-center text-gray-400">Cancel anytime. Have a coupon? Apply it at checkout.</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Already subscribed */}
        {isPaid && (
          <Card className="border-2 border-teal-200 bg-teal-50/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-teal-700">
                <Sparkles className="w-5 h-5" /> You're on {isPro ? "Pro" : "Starter"}
              </CardTitle>
              <CardDescription>
                {isPro
                  ? "You have full access to all features including the AI Assistant."
                  : "You have access to all Starter features. Upgrade to Pro to unlock the AI Assistant."}
              </CardDescription>
            </CardHeader>
            {isStarter && (
              <CardContent>
                <Button
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={() => handleCheckout("pro")}
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Upgrade to Pro
                </Button>
              </CardContent>
            )}
          </Card>
        )}

        {/* Support */}
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
