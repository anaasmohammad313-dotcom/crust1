import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";

export default function Login() {
  const { login } = useAuth();
  const [, navigate] = useLocation();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) {
      setError("Please enter your Username/Employee ID and Password.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await login(loginId.trim(), password, rememberMe);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo + brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center rounded-2xl overflow-hidden bg-black border border-primary/30 p-3 mb-4 shadow-xl shadow-primary/10">
            <img src={logo} alt="Crust" className="h-14 w-auto" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Crust POS</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="loginId">Username or Employee ID</Label>
              <Input
                id="loginId"
                placeholder="e.g. john or EMP12345"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                autoComplete="username"
                autoFocus
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me + forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded"
                />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>
              <a
                href="/forgot-password"
                onClick={(e) => { e.preventDefault(); navigate("/forgot-password"); }}
                className="text-sm text-primary hover:underline"
              >
                Forgot Password?
              </a>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full btn-glow shadow-lg" size="lg" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Crust — The Street Food &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
