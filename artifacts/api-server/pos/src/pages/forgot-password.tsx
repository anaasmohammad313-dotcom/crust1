import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";

type Step = "request" | "reset" | "done";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("request");

  // Step 1 — identify account
  const [loginId, setLoginId] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState("");

  // Step 2 — enter admin-provided token + new password
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim()) { setTokenError("Please enter your Username or Employee ID."); return; }
    setTokenError("");
    setTokenLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("reset");
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setTokenLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim()) { setResetError("Please enter the reset token provided by your admin."); return; }
    if (newPassword.length < 6) { setResetError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setResetError("Passwords do not match."); return; }
    setResetError("");
    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken.trim(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("done");
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center rounded-2xl overflow-hidden bg-black border border-primary/30 p-3 mb-4 shadow-xl shadow-primary/10">
            <img src={logo} alt="Crust" className="h-14 w-auto" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Crust POS</h1>
          <p className="text-sm text-muted-foreground mt-1">Password Recovery</p>
        </div>

        <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-2xl">

          {/* Step 1 — request */}
          {step === "request" && (
            <form onSubmit={handleRequestToken} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your Username or Employee ID. Your administrator will then go to <strong>Employee Management → Reset Password</strong> and share the new password with you.
              </p>
              <div className="space-y-1.5">
                <Label>Username or Employee ID</Label>
                <Input
                  placeholder="e.g. john or EMP12345"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  autoFocus
                  disabled={tokenLoading}
                />
              </div>
              {tokenError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">{tokenError}</div>
              )}
              <Button type="submit" className="w-full" size="lg" disabled={tokenLoading}>
                {tokenLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</> : "Submit Request"}
              </Button>
            </form>
          )}

          {/* Step 2 — reset */}
          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" /> Next step
                </p>
                <p className="text-xs text-muted-foreground">Your request has been noted. Ask your administrator to go to <strong>Employee Management → Reset Password</strong> and share the token or new password with you.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Reset Token (from your admin)</Label>
                <Input placeholder="Paste token here" value={resetToken} onChange={(e) => setResetToken(e.target.value)} disabled={resetLoading} />
              </div>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input type="password" placeholder="Min. 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={resetLoading} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input type="password" placeholder="Repeat new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={resetLoading} />
              </div>
              {resetError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">{resetError}</div>
              )}
              <Button type="submit" className="w-full" size="lg" disabled={resetLoading}>
                {resetLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting…</> : "Set New Password"}
              </Button>
            </form>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="text-center space-y-4">
              <div className="text-4xl">✅</div>
              <p className="font-semibold text-lg">Password reset successfully!</p>
              <p className="text-sm text-muted-foreground">You can now sign in with your new password.</p>
              <Button className="w-full" size="lg" onClick={() => navigate("/login")}>Back to Sign In</Button>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate("/login")}
          className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </button>
      </div>
    </div>
  );
}
