'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import { Task } from '@/types';
import { RefreshCw, X, ShieldAlert, ArrowRight, Plane, AlertTriangle } from 'lucide-react';

interface ExchangeModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

export function ExchangeModal({ task, isOpen, onClose }: ExchangeModalProps) {
  const { members, currentUser, exchangeTurn } = useApp();
  
  // Rule: If a person is marked away, a task cannot be exchanged with him!
  const eligibleRoommates = members.filter(
    (m) => m.user_id !== task.state?.current_assignee_id && !m.is_away
  );
  const awayRoommates = members.filter(
    (m) => m.user_id !== task.state?.current_assignee_id && m.is_away
  );

  const [selectedUserId, setSelectedUserId] = useState<string>(eligibleRoommates[0]?.user_id || '');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setSubmitting(true);
    await exchangeTurn(task.id, selectedUserId, note);
    setSubmitting(false);
    onClose();
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
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Exchange Turn</h3>
            <p className="text-xs text-slate-400">{task.name}</p>
          </div>
        </div>

        <form onSubmit={handleExchange} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Pass this turn to:
            </label>

            {eligibleRoommates.length === 0 ? (
              <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-center text-xs text-amber-300">
                <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                <p className="font-semibold">No eligible roommates available</p>
                <p className="text-slate-400 mt-1">
                  All other roommates in the flat are currently marked as away. Tasks cannot be exchanged with away members.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {eligibleRoommates.map((member) => (
                  <label
                    key={member.user_id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
                      selectedUserId === member.user_id
                        ? 'bg-amber-500/10 border-amber-500 text-white shadow-sm'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="exchangeAssignee"
                        value={member.user_id}
                        checked={selectedUserId === member.user_id}
                        onChange={() => setSelectedUserId(member.user_id)}
                        className="sr-only"
                      />
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-amber-400">
                        {member.profile?.name?.[0] || 'U'}
                      </div>
                      <p className="font-semibold text-sm">{member.profile?.name}</p>
                    </div>
                    {selectedUserId === member.user_id && (
                      <span className="text-xs font-medium text-amber-400 flex items-center gap-1">
                        Selected <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {/* List away members as disabled with clear indicator */}
            {awayRoommates.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-800">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Plane className="w-3 h-3 text-indigo-400" /> Currently away (cannot exchange):
                </p>
                <div className="space-y-1.5">
                  {awayRoommates.map((m) => (
                    <div
                      key={m.user_id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/30 border border-slate-800 text-slate-500 text-xs opacity-75"
                    >
                      <span>{m.profile?.name}</span>
                      <span className="text-[10px] text-indigo-400 font-medium">Away on vacation</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Reason or Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Swapping because I am working late"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs text-slate-300 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              <strong>Important:</strong> Applies only to <em>this single occurrence</em>.
              The permanent rotation continues normally afterwards.
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
              disabled={submitting || !selectedUserId || eligibleRoommates.length === 0}
              className="flex-1 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {submitting ? 'Exchanging...' : 'Confirm Exchange'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
