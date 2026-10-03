'use client';

import React from 'react';
import { Task } from '@/types';
import { useApp } from '@/context/app-context';
import { Clock, Check, RefreshCw, Pause, ChevronRight, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, isPast, parseISO, isToday } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onViewDetails: (task: Task) => void;
  onExchangeClick: (task: Task) => void;
}

export function TaskCard({ task, onViewDetails, onExchangeClick }: TaskCardProps) {
  const { currentUser, markTaskCompleted } = useApp();
  const isMyTurn = task.state?.current_assignee_id === currentUser?.id;
  const isPaused = task.state?.is_paused;

  const due = task.state?.next_due_at ? parseISO(task.state.next_due_at) : new Date();
  const past = isPast(due) && !isToday(due);
  const today = isToday(due);

  const getIntervalLabel = () => {
    const val = task.interval_value;
    const type = task.interval_type;
    if (type === 'days') return val === 1 ? 'Every day' : `Every ${val} days`;
    if (type === 'weeks') return val === 1 ? 'Every week' : `Every ${val} weeks`;
    if (type === 'months') return val === 1 ? 'Every month' : `Every ${val} months`;
    return `Every ${val} ${type}`;
  };

  return (
    <div
      onClick={() => onViewDetails(task)}
      className={`group relative rounded-3xl p-5 border transition-all duration-200 cursor-pointer ${
        isMyTurn
          ? 'bg-gradient-to-b from-teal-950/40 via-slate-900 to-slate-900 border-teal-500/50 hover:border-teal-400 shadow-lg shadow-teal-950/40'
          : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900 shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-teal-400 border border-slate-700 mb-1.5">
            {getIntervalLabel()}
          </span>
          <h3 className="text-lg font-bold text-white group-hover:text-teal-300 transition flex items-center gap-2">
            <span>{task.name}</span>
            {isPaused && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <Pause className="w-2.5 h-2.5" /> PAUSED
              </span>
            )}
          </h3>
        </div>

        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-300 transition mt-1" />
      </div>

      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Assignee & Due Status */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-teal-400">
            {task.current_assignee?.name?.[0] || 'U'}
          </div>
          <div>
            <p className="text-xs font-semibold text-white">
              {isMyTurn ? <span className="text-teal-400 font-bold">You</span> : task.current_assignee?.name}
            </p>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              {today ? (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Due today
                </span>
              ) : past ? (
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Overdue
                </span>
              ) : (
                <span>Due in {formatDistanceToNow(due)}</span>
              )}
            </p>
          </div>
        </div>

        {/* Quick button if it's my turn */}
        {isMyTurn && !isPaused && (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onExchangeClick(task)}
              title="Exchange Turn"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={() => markTaskCompleted(task.id)}
              title="Mark Completed"
              className="py-1.5 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
