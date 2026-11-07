import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Building2, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        throw error;
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('OAuth error:', err);
      setErrorMsg(err.message || 'Failed to authenticate with Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-cream-50 w-full max-w-md rounded-3xl border border-cream-300 shadow-2xl p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-stone-900 text-white rounded-2xl mx-auto flex items-center justify-center shadow-md">
            <Building2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">PropertyFlow OS</h2>
          <p className="text-xs text-stone-600">Enterprise Real Estate & Multi-Portfolio Management</p>
        </div>

        <div className="bg-white/80 rounded-2xl p-4 border border-cream-200 text-xs text-stone-700 space-y-2.5">
          <div className="flex items-center gap-2 text-stone-900 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Secure Stakeholder Single Sign-On
          </div>
          <p className="text-stone-500 leading-relaxed">
            Sign in with your Google corporate account to synchronize your real-time portfolio data, tenant files, and automated operations.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-white hover:bg-stone-50 text-stone-800 border border-cream-300 rounded-2xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {loading ? 'Connecting with Google...' : 'Continue with Google'}
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors"
          >
            Continue as Administrator (Local Workspace)
          </button>
        </div>

        <div className="pt-2 text-center text-[10px] text-stone-400">
          Protected by Supabase Auth & Google Cloud OAuth 2.0
        </div>
      </div>
    </div>
  );
};
