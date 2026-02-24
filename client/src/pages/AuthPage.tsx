import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Bird, CheckCircle2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

type AuthTab = "login" | "register";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<AuthTab>("login");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");

  // Resend verification state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const utils = trpc.useUtils();

  // Check for verified=success in URL
  const params = new URLSearchParams(window.location.search);
  const verifiedParam = params.get("verified");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setUnverifiedEmail("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setUnverifiedEmail(loginEmail);
        }
        setLoginError(data.error || "Login failed");
        return;
      }
      // Invalidate auth cache and redirect to dashboard
      await utils.auth.me.invalidate();
      setLocation("/dashboard");
    } catch {
      setLoginError("Network error. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError("");
    if (regPassword !== regConfirm) { setRegError("Passwords do not match"); return; }
    if (regPassword.length < 8) { setRegError("Password must be at least 8 characters"); return; }
    setRegLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setRegError(data.error || "Registration failed"); return; }
      setRegSuccess(true);
    } catch {
      setRegError("Network error. Please try again.");
    } finally {
      setRegLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      setForgotMessage(data.message || "If an account exists, a reset link has been sent.");
    } catch {
      setForgotMessage("Network error. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!unverifiedEmail) return;
    setResendLoading(true);
    setResendMessage("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      const data = await res.json();
      setResendMessage(data.message || "Verification email resent.");
    } catch {
      setResendMessage("Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-amber-50 to-rose-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg mb-4">
            <Bird className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Aviary Manager</h1>
          <p className="text-gray-500 mt-1">Your complete bird breeding companion</p>
        </div>

        {/* Verified success banner */}
        {verifiedParam === "success" && (
          <Alert className="mb-4 border-teal-200 bg-teal-50">
            <CheckCircle2 className="h-4 w-4 text-teal-600" />
            <AlertDescription className="text-teal-700">
              Email verified! You can now log in.
            </AlertDescription>
          </Alert>
        )}
        {verifiedParam === "expired" && (
          <Alert className="mb-4 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              That verification link has expired. Please log in and request a new one.
            </AlertDescription>
          </Alert>
        )}

        {showForgot ? (
          /* Forgot Password Form */
          <Card className="shadow-xl border-0">
            <CardHeader>
              <CardTitle>Reset your password</CardTitle>
              <CardDescription>Enter your email and we'll send you a reset link.</CardDescription>
            </CardHeader>
            <CardContent>
              {forgotMessage ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-10 h-10 text-teal-500 mx-auto mb-3" />
                  <p className="text-gray-700">{forgotMessage}</p>
                  <Button variant="link" className="mt-4" onClick={() => { setShowForgot(false); setForgotMessage(""); }}>
                    Back to login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <Label>Email address</Label>
                    <Input
                      type="email" className="mt-1" required
                      value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={forgotLoading}>
                    {forgotLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Send reset link
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgot(false)}>
                    Back to login
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl border-0">
            <Tabs value={tab} onValueChange={v => { setTab(v as AuthTab); setLoginError(""); setRegError(""); }}>
              <CardHeader className="pb-2">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="register">Create Account</TabsTrigger>
                </TabsList>
              </CardHeader>

              {/* ── Login Tab ── */}
              <TabsContent value="login">
                <CardContent className="pt-4">
                  {regSuccess && tab === "login" && (
                    <Alert className="mb-4 border-teal-200 bg-teal-50">
                      <CheckCircle2 className="h-4 w-4 text-teal-600" />
                      <AlertDescription className="text-teal-700">
                        Account created! Check your email to verify your address before logging in.
                      </AlertDescription>
                    </Alert>
                  )}
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label>Email address</Label>
                      <Input
                        type="email" className="mt-1" required autoComplete="email"
                        value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>Password</Label>
                        <button type="button" onClick={() => setShowForgot(true)}
                          className="text-xs text-teal-600 hover:underline">
                          Forgot password?
                        </button>
                      </div>
                      <Input
                        type="password" className="mt-1" required autoComplete="current-password"
                        value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    {loginError && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <AlertDescription className="text-red-700">{loginError}</AlertDescription>
                      </Alert>
                    )}
                    {unverifiedEmail && (
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-2">Didn't receive the verification email?</p>
                        <Button type="button" variant="outline" size="sm" onClick={handleResendVerification} disabled={resendLoading}>
                          {resendLoading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                          Resend verification email
                        </Button>
                        {resendMessage && <p className="text-xs text-teal-600 mt-2">{resendMessage}</p>}
                      </div>
                    )}
                    <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={loginLoading}>
                      {loginLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Sign In
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>

              {/* ── Register Tab ── */}
              <TabsContent value="register">
                <CardContent className="pt-4">
                  {regSuccess ? (
                    <div className="text-center py-6">
                      <CheckCircle2 className="w-12 h-12 text-teal-500 mx-auto mb-4" />
                      <h3 className="font-semibold text-gray-900 text-lg mb-2">Check your inbox!</h3>
                      <p className="text-gray-600 text-sm mb-4">
                        We've sent a verification link to <strong>{regEmail}</strong>.
                        Click it to activate your account, then sign in.
                      </p>
                      <Button onClick={() => { setRegSuccess(false); setTab("login"); }} className="bg-teal-600 hover:bg-teal-700 text-white">
                        Go to Sign In
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div>
                        <Label>Your name</Label>
                        <Input
                          className="mt-1" required
                          value={regName} onChange={e => setRegName(e.target.value)}
                          placeholder="Jane Smith"
                        />
                      </div>
                      <div>
                        <Label>Email address</Label>
                        <Input
                          type="email" className="mt-1" required autoComplete="email"
                          value={regEmail} onChange={e => setRegEmail(e.target.value)}
                          placeholder="you@example.com"
                        />
                      </div>
                      <div>
                        <Label>Password</Label>
                        <Input
                          type="password" className="mt-1" required autoComplete="new-password"
                          value={regPassword} onChange={e => setRegPassword(e.target.value)}
                          placeholder="At least 8 characters"
                        />
                      </div>
                      <div>
                        <Label>Confirm password</Label>
                        <Input
                          type="password" className="mt-1" required autoComplete="new-password"
                          value={regConfirm} onChange={e => setRegConfirm(e.target.value)}
                          placeholder="Repeat your password"
                        />
                      </div>
                      {regError && (
                        <Alert className="border-red-200 bg-red-50">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <AlertDescription className="text-red-700">{regError}</AlertDescription>
                        </Alert>
                      )}
                      <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={regLoading}>
                        {regLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create Free Account
                      </Button>
                      <p className="text-xs text-center text-gray-500">
                        By signing up you agree to our Terms of Service and Privacy Policy.
                      </p>
                    </form>
                  )}
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        )}
      </div>
    </div>
  );
}
