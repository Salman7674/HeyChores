'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import { Plane, Calendar, X, Info, CheckCircle2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface AwayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AwayModal({ isOpen, onClose }: AwayModalProps) {
  const { currentUser, members, awayPeriods, setMemberAway, clearMemberAway } = useApp();

  const currentMember = members.find((m) => m.user_id === currentUser?.id);
  const activeAway = awayPeriods.find((a) => a.user_id === currentUser?.id);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const nextWeekStr = format(addDays(new Date(), 5), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(nextWeekStr);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);
    const startIso = new Date(startDate + 'T00:00:00Z').toISOString();
    const endIso = new Date(endDate + 'T23:59:59Z').toISOString();
    await setMemberAway(currentUser.id, startIso, endIso);
    setSubmitting(false);
    onClose();
  };

  const handleClear = async () => {
    if (activeAway) {
      setSubmitting(true);
      await clearMemberAway(activeAway.id);
      setSubmitting(false);
      onClose();
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

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">I&apos;m Away / On Vacation</h3>
            <p className="text-xs text-slate-400">Skip duties while traveling without losing your slot</p>
          </div>
        </div>

        {activeAway ? (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-950/40 border border-indigo-500/40 rounded-2xl">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Currently Marked Away</span>
              </div>
              <p className="text-xs text-slate-300">
                From: <strong>{format(new Date(activeAway.start_at), 'MMM dd, yyyy')}</strong>
                <br />
                Until: <strong>{format(new Date(activeAway.end_at), 'MMM dd, yyyy')}</strong>
              </p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              When tasks advance while you are away, the system skips to the next roommate. When you return, you become eligible again automatically.
            </p>

            <button
              onClick={handleClear}
              disabled={submitting}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20"
            >
              {submitting ? 'Updating...' : "I'm Back Home (Clear Away Status)"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Departure / Start Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Return / End Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs text-slate-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <p>
                You will not be permanently removed. The system will simply bypass your turns until your return date.
              </p>
            </div>

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
                disabled={submitting}
                className="flex-1 py-3 px-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm transition shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Set as Away'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
