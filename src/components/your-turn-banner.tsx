'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import { Task } from '@/types';
import { Check, RefreshCw, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { formatDistanceToNow, isPast, parseISO, isToday } from 'date-fns';

interface YourTurnBannerProps {
  onExchangeClick: (task: Task) => void;
  onViewTaskClick: (task: Task) => void;
}

export function YourTurnBanner({ onExchangeClick, onViewTaskClick }: YourTurnBannerProps) {
  const { tasks, currentUser, markTaskCompleted } = useApp();
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  // Find active tasks currently assigned to currentUser
  const myTasks = tasks.filter(
    (t) =>
      t.is_active &&
      !t.state?.is_paused &&
      t.state?.current_assignee_id === currentUser?.id
  );

  if (myTasks.length === 0) {
    return null;
  }

  const handleComplete = async (taskId: string) => {
    setCompletingTaskId(taskId);
    await markTaskCompleted(taskId);
    setCompletingTaskId(null);
  };

  const getDueBadge = (dueDateStr: string) => {
    const due = parseISO(dueDateStr);
    const past = isPast(due) && !isToday(due);
    const today = isToday(due);

    if (today) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5 text-amber-400" /> Due Today
        </span>
      );
    }

    if (past) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Overdue ({formatDistanceToNow(due)} ago)
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
        <Clock className="w-3.5 h-3.5 text-slate-400" /> Due in {formatDistanceToNow(due)}
      </span>
    );
  };

  return (
    <section className="space-y-4 mb-8">
      {myTasks.map((task) => {
        const isCompleting = completingTaskId === task.id;

        return (
          <div
            key={task.id}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-950/90 via-slate-900 to-slate-950 border-2 border-teal-500/60 shadow-2xl shadow-teal-950/60 p-6 md:p-8"
          >
            {/* Background glowing effects */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-widest uppercase bg-teal-400 text-slate-950 shadow-md shadow-teal-400/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> YOUR TURN
                  </span>
                  {task.state && getDueBadge(task.state.next_due_at)}
                  {task.active_exchange && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Exchanged from {task.active_exchange.original_assignee?.name}
                    </span>
                  )}
                </div>

                <div>
                  <h2
                    onClick={() => onViewTaskClick(task)}
                    className="text-2xl md:text-3xl font-black text-white hover:text-teal-300 transition cursor-pointer flex items-center gap-3"
                  >
                    <span>🧹 {task.name}</span>
                  </h2>
                  {task.description && (
                    <p className="text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Mobile-first Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => handleComplete(task.id)}
                  disabled={isCompleting}
                  className="py-4 px-6 md:py-4 md:px-8 rounded-2xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-black text-base shadow-xl shadow-teal-500/30 active:scale-95 transition flex items-center justify-center gap-2.5 tracking-wide disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-6 h-6 stroke-[3]" />
                  <span>{isCompleting ? 'Marking Done...' : 'MARK COMPLETED'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onExchangeClick(task)}
                  className="py-3 px-5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-semibold text-sm transition flex items-center justify-center gap-2 hover:border-slate-600"
                >
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                  <span>Exchange Turn</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
