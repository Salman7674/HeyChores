'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import { MOCK_PROFILES } from '@/lib/mock-data';
import {
  Home,
  LogOut,
  User,
  Plane,
  ChevronDown,
  Check,
  QrCode,
  Bell,
} from 'lucide-react';
import Link from 'next/link';

interface NavbarProps {
  onOpenAwayModal: () => void;
  onOpenNotificationModal: () => void;
}

export function Navbar({ onOpenAwayModal, onOpenNotificationModal }: NavbarProps) {
  const {
    currentUser,
    switchMockUser,
    activeGroup,
    logout,
    members,
    isSupabaseMode,
  } = useApp();

  const [showMenu, setShowMenu] = useState(false);

  const currentMember = members.find((m) => m.user_id === currentUser?.id);
  const isAway = currentMember?.is_away;

  if (!currentUser) return null;

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand & Flat name */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-base">
            🧹
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-white">HeyChores</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-medium text-teal-400 truncate max-w-[120px]">
                {activeGroup?.name || 'Flat'}
              </span>
            </div>
          </div>
        </div>

        {/* Right user badge & compact menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 py-1 px-2.5 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
          >
            <div className="w-6 h-6 rounded-full bg-teal-400 text-slate-950 font-black text-xs flex items-center justify-center">
              {currentUser.name[0]}
            </div>
            <span className="text-xs font-semibold text-slate-200">{currentUser.name}</span>
            {isAway && (
              <span className="w-2 h-2 rounded-full bg-indigo-400 ring-2 ring-slate-950" title="Marked as Away" />
            )}
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in duration-150">
              <div className="px-3 py-2 border-b border-slate-800 mb-1">
                <p className="text-xs font-bold text-white">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{currentUser.email || 'Resident'}</p>
              </div>

              {/* Away Status Toggle */}
              <button
                onClick={() => {
                  setShowMenu(false);
                  onOpenAwayModal();
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition ${
                  isAway
                    ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Plane className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isAway ? 'You are marked Away' : "Mark I'm Away..."}</span>
              </button>

              {/* Notifications */}
              <button
                onClick={() => {
                  setShowMenu(false);
                  onOpenNotificationModal();
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2 transition"
              >
                <Bell className="w-3.5 h-3.5 text-teal-400" />
                <span>Reminder Settings</span>
              </button>

              {/* Switch Flatmate in local preview */}
              <div className="my-1 pt-1 border-t border-slate-800">
                <span className="px-3 text-[10px] uppercase tracking-wider font-semibold text-slate-500 block mb-1">
                  Switch Flatmate (Preview)
                </span>
                <div className="space-y-0.5">
                  {MOCK_PROFILES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        switchMockUser(p.id);
                        setShowMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                        currentUser.id === p.id
                          ? 'bg-teal-500/10 text-teal-300 font-semibold'
                          : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                      }`}
                    >
                      <span>{p.name}</span>
                      {currentUser.id === p.id && <Check className="w-3 h-3 text-teal-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sign out */}
              <div className="pt-1 border-t border-slate-800">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
