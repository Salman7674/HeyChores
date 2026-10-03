'use client';

import React, { useState } from 'react';
import { Task } from '@/types';
import { useApp } from '@/context/app-context';
import {
  X,
  Check,
  RefreshCw,
  Pause,
  Play,
  Trash2,
  ChevronUp,
  ChevronDown,
  Shield,
  History,
  Plane,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onExchangeClick: (task: Task) => void;
}

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onExchangeClick,
}: TaskDetailModalProps) {
  const {
    currentUser,
    activeGroup,
    members,
    markTaskCompleted,
    togglePauseTask,
    deleteTask,
    reorderTaskRotation,
  } = useApp();

  const [completing, setCompleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'rotation' | 'history'>('rotation');
  const [actionError, setActionError] = useState('');

  if (!isOpen || !task) return null;

  const isAdmin = activeGroup?.admin_user_id === currentUser?.id;
  const isMyTurn = task.state?.current_assignee_id === currentUser?.id;
  const isPaused = task.state?.is_paused;

  const due = task.state?.next_due_at ? parseISO(task.state.next_due_at) : new Date();
  const past = isPast(due) && !isToday(due);
  const today = isToday(due);

  const handleComplete = async () => {
    setActionError('');
    setCompleting(true);
    const result = await markTaskCompleted(task.id);
    setCompleting(false);
    if (!result.success) {
      setActionError(result.message || 'Action failed.');
    }
  };

  const handleTogglePause = async () => {
    await togglePauseTask(task.id);
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${task.name}"?`)) {
      await deleteTask(task.id);
      onClose();
    }
  };

  const moveMember = async (index: number, direction: 'up' | 'down') => {
    if (!task.rotation || !isAdmin) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= task.rotation.length) return;

    const currentOrder = task.rotation.map((r) => r.user_id);
    const temp = currentOrder[index];
    currentOrder[index] = currentOrder[targetIdx];
    currentOrder[targetIdx] = temp;

    await reorderTaskRotation(task.id, currentOrder);
  };

  const getIntervalLabel = () => {
    const val = task.interval_value;
    const type = task.interval_type;
    if (type === 'days') return val === 1 ? 'Every day' : `Every ${val} days`;
    if (type === 'weeks') return val === 1 ? 'Every week' : `Every ${val} weeks`;
    if (type === 'months') return val === 1 ? 'Every month' : `Every ${val} months`;
    return `Every ${val} ${type}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100 max-h-[85vh] overflow-y-auto">
        {/* Header Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Task Header */}
        <div className="mb-5 pr-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
              {getIntervalLabel()}
            </span>
            {isPaused && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <Pause className="w-3 h-3" /> PAUSED
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-white">{task.name}</h2>
          {task.description && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{task.description}</p>
          )}
        </div>

        {/* Current Turn Card */}
        <div className="p-4 rounded-2xl bg-slate-850 bg-slate-800/50 border border-slate-700/60 mb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Currently Assigned To
              </span>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-teal-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  {task.current_assignee?.name?.[0] || 'U'}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">
                    {isMyTurn ? <span className="text-teal-400">You ({task.current_assignee?.name})</span> : task.current_assignee?.name}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {today ? (
                      <span className="text-amber-400 font-semibold">Due today</span>
                    ) : past ? (
                      <span className="text-rose-400 font-semibold">Overdue ({format(due, 'MMM dd')})</span>
                    ) : (
                      <span>Due {format(due, 'MMM dd')}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions: Strict Authorization */}
            {!isPaused && (
              <div>
                {isMyTurn ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onExchangeClick(task)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                      title="Exchange Turn"
                    >
                      <RefreshCw className="w-4 h-4 text-amber-400" />
                    </button>
                    <button
                      type="button"
                      onClick={handleComplete}
                      disabled={completing}
                      className="py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition shadow-md shadow-teal-500/20 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{completing ? 'Saving...' : 'Mark Done'}</span>
                    </button>
                  </div>
                ) : isAdmin ? (
                  // Admin override option
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={completing}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
                    title="Complete as Admin on behalf of assigned roommate"
                  >
                    <Shield className="w-3.5 h-3.5 text-teal-400" />
                    <span>Admin Complete</span>
                  </button>
                ) : (
                  // Non-assignee, non-admin: locked
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-800">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Assigned to {task.current_assignee?.name}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {actionError && (
            <div className="mt-3 p-2 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-800 mb-4">
          <button
            onClick={() => setActiveTab('rotation')}
            className={`pb-2 px-3 font-bold text-xs uppercase tracking-wider transition border-b-2 ${
              activeTab === 'rotation'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Rotation ({task.rotation?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-3 font-bold text-xs uppercase tracking-wider transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            History & Logs ({((task.recent_completions?.length || 0) + (task.activities?.length || 0))})
          </button>
        </div>

        {/* Tab 1: Clean Rotation Chain */}
        {activeTab === 'rotation' && (
          <div className="space-y-2">
            {task.rotation?.map((r, index) => {
              const member = members.find((m) => m.user_id === r.user_id);
              const isCurrent = r.user_id === task.state?.current_assignee_id;
              const isAway = member?.is_away;

              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                    isCurrent
                      ? 'bg-teal-500/10 border-teal-500/40 text-white font-semibold'
                      : 'bg-slate-800/30 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent ? 'bg-teal-400 text-slate-950' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium">{member?.profile?.name || r.user_id}</span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-400 text-slate-950">
                        NOW
                      </span>
                    )}
                    {isAway && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                        <Plane className="w-2.5 h-2.5" /> Away
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveMember(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-700"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMember(index, 'down')}
                        disabled={index === (task.rotation?.length || 0) - 1}
                        className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-700"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: History & Modification Audit Logs */}
        {activeTab === 'history' && (
          <div className="space-y-2">
            {(!task.recent_completions || task.recent_completions.length === 0) &&
            (!task.activities || task.activities.length === 0) ? (
              <p className="text-center py-6 text-slate-500 text-xs">No records logged yet</p>
            ) : (
              <>
                {/* Completions */}
                {task.recent_completions?.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-2.5 bg-slate-800/40 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">
                          {comp.profile?.name || 'Roommate'} completed
                        </p>
                        {comp.notes && <p className="text-[11px] text-slate-400">{comp.notes}</p>}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {format(parseISO(comp.completed_at), 'MMM dd')}
                    </span>
                  </div>
                ))}

                {/* Audit activities (reorders, exchanges, overrides) */}
                {task.activities?.map((act) => (
                  <div
                    key={act.id}
                    className="p-2.5 bg-slate-800/20 border border-slate-800/60 rounded-xl flex items-center justify-between text-xs text-slate-400"
                  >
                    <span>{act.details}</span>
                    <span className="text-[10px] text-slate-500">
                      {format(parseISO(act.created_at), 'MMM dd, p')}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Admin Controls */}
        {isAdmin && (
          <div className="pt-4 mt-5 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-teal-400" /> Admin
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePause}
                className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 transition text-xs"
              >
                {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="py-1.5 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-semibold flex items-center gap-1.5 transition text-xs"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
