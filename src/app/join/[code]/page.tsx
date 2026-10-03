'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/app-context';
import { Sparkles, Home, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const { groups, joinGroupByCode, currentUser } = useApp();

  const code = (params?.code as string)?.toUpperCase() || '';
  const matchingGroup = groups.find((g) => g.invite_code === code);

  const [userName, setUserName] = useState(currentUser?.name || '');
  const [joined, setJoined] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setSubmitting(true);
    setError('');
    const success = await joinGroupByCode(code);
    setSubmitting(false);

    if (success) {
      setJoined(true);
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } else {
      setError('Unable to join flat with this code.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative text-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-teal-500/30">
          <span className="text-3xl">🧹</span>
        </div>

        <h1 className="text-2xl font-black text-white mb-2">Join Household Flat</h1>
        <p className="text-sm text-slate-400 mb-6">
          You&apos;ve been invited to join the chore rotation!
        </p>

        <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl mb-6 text-left">
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Home className="w-4 h-4" /> Flat
          </div>
          <h3 className="text-xl font-bold text-white">{matchingGroup?.name || 'Green House'}</h3>
          <p className="text-xs text-slate-400 mt-1">
            Invite Code: <span className="font-mono text-teal-300 font-bold">{code}</span>
          </p>
        </div>

        {joined ? (
          <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5" />
            <span>Joined successfully! Redirecting...</span>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-base shadow-xl shadow-teal-500/20 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <span>{submitting ? 'Joining...' : 'Accept Invitation & Join'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            {error && <p className="text-xs text-rose-400">{error}</p>}
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-slate-800 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition">
            Already have an account? Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
