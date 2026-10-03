'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import { Users, X } from 'lucide-react';

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinGroupModal({ isOpen, onClose }: JoinGroupModalProps) {
  const { joinGroupByCode } = useApp();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setError('');
    setSubmitting(true);
    const success = await joinGroupByCode(code.trim());
    setSubmitting(false);

    if (success) {
      onClose();
    } else {
      setError('Invalid invite code. Please check and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-teal-500/20 text-teal-400 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Join Flat</h3>
            <p className="text-xs text-slate-400">Enter the 6-character code from your roommate</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Invite Code
            </label>
            <input
              type="text"
              maxLength={8}
              required
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="e.g. X7K92P"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-center text-xl tracking-widest font-mono font-bold text-teal-300 placeholder-slate-600 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 uppercase"
            />
          </div>

          {error && <p className="text-xs text-rose-400 text-center">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !code.trim()}
              className="flex-1 py-3 px-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {submitting ? 'Joining...' : 'Join Flat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
