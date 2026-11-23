import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const AuthPage: React.FC = () => {
  const { user, loginWithEmail, registerWithEmail, loginWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isSignUp) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-navy-900/90 border border-cyan-500/25 p-8 backdrop-blur-xl shadow-2xl shadow-cyan-950/50"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Compass className="h-6 w-6 text-navy-950 stroke-[2.25]" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-wider text-white">
              KALYSTRAL
            </h1>
            <p className="text-xs text-cyan-400">Intelligence Beyond the Horizon.</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="font-display text-lg font-semibold text-white">
            {isSignUp ? "Register Charter Operator" : "Command Bridge Access"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            East Coast India Maritime Freight Intelligence • Team Rizzalytics
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
              Operator Email
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="chartering@enterprise.in"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-navy-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
              Passcode
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-navy-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-navy-950 font-semibold text-sm transition-all disabled:opacity-50"
          >
            {submitting
              ? "Authenticating..."
              : isSignUp
              ? "Create Operator Account"
              : "Enter Command Center"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-slate-800" />
          <span>OR</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-navy-950 hover:bg-navy-800 border border-slate-700 text-slate-200 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4 text-cyan-400" />
          Continue with Google
        </button>

        <div className="mt-6 text-center text-xs text-slate-400">
          {isSignUp ? "Already registered?" : "Need operator credentials?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-cyan-400 hover:underline font-medium"
          >
            {isSignUp ? "Sign in" : "Create account"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};