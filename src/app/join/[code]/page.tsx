'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/app-context';
import { Home, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const { groups, joinGroupByCode, currentUser, loginWithCredentials } = useApp();

  const code = (params?.code as string)?.toUpperCase() || '';
  const matchingGroup = groups.find((g) => g.invite_code.toUpperCase() === code);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [joined, setJoined] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setError('');
    setMessage('');
    setSubmitting(true);

    // If not logged in, log in first
    if (!currentUser) {
      if (!username.trim() || !password.trim()) {
        setError('Please enter your username and password to join.');
        setSubmitting(false);
        return;
      }
      const loginRes = await loginWithCredentials(username, password);
      if (!loginRes.success) {
        setError(loginRes.message || 'Login failed.');
        setSubmitting(false);
        return;
      }
    }

    const joinRes = await joinGroupByCode(code);
    setSubmitting(false);

    if (joinRes.success) {
      setJoined(true);
      setMessage(joinRes.message || 'Joined flat successfully!');
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } else {
      setError(joinRes.message || 'Unable to join flat with this code.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative text-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-teal-500/30">
          <span className="text-3xl">🧹</span>
        </div>

        <h1 className="text-2xl font-black text-white mb-2">Join Household Flat</h1>
        <p className="text-xs text-slate-400 mb-6">
          You&apos;ve been invited to join the chore rotation!
        </p>

        <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl mb-6 text-left">
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Home className="w-4 h-4" /> Flat Invitation
          </div>
          <h3 className="text-xl font-bold text-white">{matchingGroup?.name || 'Household Flat'}</h3>
          <p className="text-xs text-slate-400 mt-1">
            Invite Code: <span className="font-mono text-teal-300 font-bold">{code}</span>
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2 mb-4 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {joined ? (
          <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5" />
            <span>{message} Redirecting...</span>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            {!currentUser && (
              <div className="space-y-3 text-left">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Your Username or Email
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. rahul"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Your Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>
            )}

            {currentUser && (
              <p className="text-xs text-slate-300 text-left mb-2">
                Joining as: <strong className="text-white">{currentUser.name}</strong> (@{currentUser.username || currentUser.email})
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-teal-500/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{submitting ? 'Joining...' : 'Accept Invitation & Join Flat'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-slate-800 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
