'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import { Task, Profile } from '@/types';
import { MOCK_PROFILES } from '@/lib/mock-data';
import { Navbar } from '@/components/navbar';
import { MembersList } from '@/components/members-list';
import { CreateTaskModal } from '@/components/modals/create-task-modal';
import { ExchangeModal } from '@/components/modals/exchange-modal';
import { AwayModal } from '@/components/modals/away-modal';
import { CreateGroupModal } from '@/components/modals/create-group-modal';
import { JoinGroupModal } from '@/components/modals/join-group-modal';
import { NotificationModal } from '@/components/notification-modal';
import { TaskDetailModal } from '@/components/task-detail-modal';
import {
  Check,
  RefreshCw,
  Clock,
  Sparkles,
  Layers,
  Users,
  Plus,
  ChevronRight,
  Plane,
  AlertCircle,
  Home,
  LogOut,
  User,
} from 'lucide-react';
import { formatDistanceToNow, isPast, parseISO, isToday, format } from 'date-fns';

type TabView = 'chores' | 'roommates' | 'admin';

export default function MobileDashboardPage() {
  const {
    currentUser,
    loginAs,
    activeGroup,
    tasks,
    markTaskCompleted,
    isLoading,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabView>('chores');

  // Modals
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAwayOpen, setIsAwayOpen] = useState(false);

  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [selectedTaskForExchange, setSelectedTaskForExchange] = useState<Task | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  // 1. If not logged in, show clean authentication screen
  if (!isLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-4 py-8">
        <div className="max-w-sm w-full mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mx-auto mb-4 text-2xl">
            🧹
          </div>
          <h1 className="text-xl font-bold text-white mb-1">HeyChores</h1>
          <p className="text-xs text-slate-400 mb-6">
            Log in to view and complete your flat chores
          </p>

          <div className="space-y-2 text-left">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Select Your Profile:
            </label>
            {MOCK_PROFILES.map((profile) => (
              <button
                key={profile.id}
                onClick={() => loginAs(profile)}
                className="w-full p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700/80 hover:border-teal-500/50 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center">
                    {profile.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white group-hover:text-teal-300 transition">
                      {profile.name}
                    </p>
                    <p className="text-[10px] text-slate-400">{profile.email}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition" />
              </button>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 mt-6">
            Permanent rotation turns never advance until marked complete.
          </p>
        </div>
      </div>
    );
  }

  // Chores assigned to logged-in user
  const myTasks = tasks.filter(
    (t) =>
      t.is_active &&
      !t.state?.is_paused &&
      t.state?.current_assignee_id === currentUser?.id
  );

  // All pending chores in flat
  const allPendingTasks = tasks.filter((t) => t.is_active && !t.state?.is_paused);

  const handleCompleteMyTask = async (taskId: string) => {
    setCompletingTaskId(taskId);
    await markTaskCompleted(taskId);
    setCompletingTaskId(null);
  };

  const getDueLabel = (dueDateStr?: string) => {
    if (!dueDateStr) return 'Due soon';
    const due = parseISO(dueDateStr);
    if (isToday(due)) return 'Due today';
    if (isPast(due)) return `Overdue (${format(due, 'MMM dd')})`;
    return `Due ${format(due, 'MMM dd')}`;
  };

  const isOverdue = (dueDateStr?: string) => {
    if (!dueDateStr) return false;
    const due = parseISO(dueDateStr);
    return isPast(due) && !isToday(due);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-24 selection:bg-teal-500 selection:text-slate-950">
      {/* Sleek Top Navbar */}
      <Navbar
        onOpenAwayModal={() => setIsAwayOpen(true)}
        onOpenNotificationModal={() => setIsNotificationOpen(true)}
      />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-5 space-y-6">
        {/* ============================================================== */}
        {/* VIEW 1: CHORES (YOUR TASKS + WHO'S DOING WHAT)                 */}
        {/* ============================================================== */}
        {activeTab === 'chores' && (
          <>
            {/* SECTION 1: YOUR TASKS */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>Your Turn ({myTasks.length})</span>
                </h2>
              </div>

              {myTasks.length === 0 ? (
                // Calm, clean all-caught-up state
                <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 text-center space-y-1.5">
                  <span className="text-2xl block mb-1">✨</span>
                  <h3 className="text-sm font-bold text-white">All caught up!</h3>
                  <p className="text-xs text-slate-400">
                    No household chores pending for you right now.
                  </p>
                </div>
              ) : (
                // Prominent clean cards for user's assigned chores
                myTasks.map((task) => {
                  const overdue = isOverdue(task.state?.next_due_at);
                  const isCompleting = completingTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      className="p-5 rounded-3xl bg-gradient-to-b from-teal-950/40 via-slate-900 to-slate-900 border-2 border-teal-500/50 shadow-xl shadow-teal-950/50 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                                overdue
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                              }`}
                            >
                              {getDueLabel(task.state?.next_due_at)}
                            </span>
                            {task.active_exchange && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300">
                                Exchanged
                              </span>
                            )}
                          </div>
                          <h3
                            onClick={() => setSelectedTaskForDetail(task)}
                            className="text-lg font-black text-white hover:text-teal-300 transition cursor-pointer"
                          >
                            🧹 {task.name}
                          </h3>
                          {task.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => setSelectedTaskForDetail(task)}
                          className="p-1 text-slate-500 hover:text-slate-300"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Large touch-friendly Action Buttons */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <button
                          onClick={() => handleCompleteMyTask(task.id)}
                          disabled={isCompleting}
                          className="col-span-2 py-3 px-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 active:scale-95 transition disabled:opacity-50"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{isCompleting ? 'Saving...' : 'Mark Completed'}</span>
                        </button>

                        <button
                          onClick={() => setSelectedTaskForExchange(task)}
                          className="py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                          title="Pass to another roommate"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Exchange</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </section>

            {/* SECTION 2: ALL TASKS PENDING WITH WHOM */}
            <section className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Pending Chores ({allPendingTasks.length})</span>
                </h2>
                <span className="text-[11px] text-slate-500">Tap to see rotation</span>
              </div>

              <div className="space-y-2">
                {allPendingTasks.map((task) => {
                  const isMine = task.state?.current_assignee_id === currentUser?.id;
                  const overdue = isOverdue(task.state?.next_due_at);

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskForDetail(task)}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                        isMine
                          ? 'bg-slate-900 border-teal-500/40 hover:border-teal-500/60'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isMine
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {task.current_assignee?.name?.[0] || 'U'}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white">{task.name}</span>
                            {isMine && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-400 text-slate-950">
                                YOU
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            Responsible:{' '}
                            <span className="font-medium text-slate-200">
                              {task.current_assignee?.name}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-xs font-semibold block ${
                            overdue
                              ? 'text-rose-400'
                              : isToday(parseISO(task.state?.next_due_at || ''))
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {getDueLabel(task.state?.next_due_at)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Every {task.interval_value} {task.interval_type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: ROOMMATES TAB                                           */}
        {/* ============================================================== */}
        {activeTab === 'roommates' && (
          <MembersList onOpenAwayModal={() => setIsAwayOpen(true)} />
        )}

        {/* ============================================================== */}
        {/* VIEW 3: FLAT SETTINGS & ADMIN                                   */}
        {/* ============================================================== */}
        {activeTab === 'admin' && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Flat Controls
            </h2>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
              <button
                onClick={() => setIsCreateTaskOpen(true)}
                className="w-full py-3.5 px-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 active:scale-95 transition"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add New Chore</span>
              </button>

              <button
                onClick={() => setIsCreateGroupOpen(true)}
                className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Create Another Flat</span>
              </button>

              <button
                onClick={() => setIsJoinGroupOpen(true)}
                className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <span>Join Flat via Code</span>
              </button>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-3xl text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Rotation Engine Rule:</p>
              <p className="leading-relaxed">
                A turn only transfers when the responsible roommate completes it. Overdue chores remain with the same person until done.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* PHONE-FIRST FIXED BOTTOM NAVIGATION BAR                        */}
      {/* ============================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80">
        <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-around">
          <button
            onClick={() => setActiveTab('chores')}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === 'chores' ? 'text-teal-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Chores</span>
          </button>

          <button
            onClick={() => setActiveTab('roommates')}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === 'roommates' ? 'text-teal-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Roommates</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === 'admin' ? 'text-teal-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Add / Flat</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
      />

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
      />

      <JoinGroupModal
        isOpen={isJoinGroupOpen}
        onClose={() => setIsJoinGroupOpen(false)}
      />

      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      <AwayModal
        isOpen={isAwayOpen}
        onClose={() => setIsAwayOpen(false)}
      />

      {selectedTaskForDetail && (
        <TaskDetailModal
          task={selectedTaskForDetail}
          isOpen={Boolean(selectedTaskForDetail)}
          onClose={() => setSelectedTaskForDetail(null)}
          onExchangeClick={(t) => {
            setSelectedTaskForDetail(null);
            setSelectedTaskForExchange(t);
          }}
        />
      )}

      {selectedTaskForExchange && (
        <ExchangeModal
          task={selectedTaskForExchange}
          isOpen={Boolean(selectedTaskForExchange)}
          onClose={() => setSelectedTaskForExchange(null)}
        />
      )}
    </div>
  );
}
