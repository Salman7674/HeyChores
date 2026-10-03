'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import {
  Users,
  Shield,
  Plane,
  Home,
  QrCode,
  Copy,
  Check,
  MoreVertical,
  UserX,
  Edit2,
  Crown,
  Share2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { QRCodeDisplay } from './qr-code';

interface MembersListProps {
  onOpenAwayModal: () => void;
}

export function MembersList({ onOpenAwayModal }: MembersListProps) {
  const {
    activeGroup,
    members,
    currentUser,
    removeMemberFromGroup,
    transferAdmin,
    renameMember,
    regenerateInviteCode,
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);

  const isAdmin = activeGroup?.admin_user_id === currentUser?.id;
  const inviteCode = activeGroup?.invite_code || 'X7K92P';
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${inviteCode}` : `https://heychores.app/join/${inviteCode}`;

  const copyInvite = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveRename = async (userId: string) => {
    if (editName.trim()) {
      await renameMember(userId, editName.trim());
      setEditingUserId(null);
    }
  };

  const handleRemove = async (userId: string, name?: string) => {
    if (confirm(`Remove ${name || 'roommate'} from ${activeGroup?.name}? They will be removed from future tasks, but past chore history is preserved.`)) {
      await removeMemberFromGroup(userId);
    }
  };

  const handleTransfer = async (userId: string, name?: string) => {
    if (confirm(`Transfer admin rights of ${activeGroup?.name} to ${name || 'this roommate'}?`)) {
      await transferAdmin(userId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite Code & Share Banner */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Invite Roommates to {activeGroup?.name}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Share this 6-character code or scan the QR code to join the flat
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-2xl font-mono text-lg font-black tracking-widest text-teal-300">
            {inviteCode}
          </div>

          <button
            onClick={copyInvite}
            className="p-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition shadow-md shadow-teal-500/20"
            title="Copy Join Link"
          >
            {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
          </button>

          <button
            onClick={() => setShowQR(!showQR)}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
            title="Show QR Code"
          >
            <QrCode className="w-4 h-4 text-teal-400" />
            <span>QR</span>
          </button>
        </div>
      </div>

      {/* QR Code Popdown */}
      {showQR && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center flex flex-col items-center animate-in fade-in duration-200">
          <h4 className="text-sm font-bold text-white mb-1">Scan to Join {activeGroup?.name}</h4>
          <p className="text-xs text-slate-400 mb-4">{joinUrl}</p>
          <QRCodeDisplay text={joinUrl} size={180} />
          <button
            onClick={() => setShowQR(false)}
            className="mt-4 text-xs text-slate-400 hover:text-white"
          >
            Close QR
          </button>
        </div>
      )}

      {/* Members List Header & Action */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            <span>Roommates ({members.length})</span>
          </h3>
          <p className="text-xs text-slate-400">Current residents in {activeGroup?.name}</p>
        </div>

        <button
          onClick={onOpenAwayModal}
          className="py-2.5 px-4 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center gap-2 transition"
        >
          <Plane className="w-4 h-4" />
          <span>I&apos;m Away / Vacation</span>
        </button>
      </div>

      {/* Members Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {members.map((member) => {
          const isMemberAdmin = member.role === 'admin';
          const isMe = member.user_id === currentUser?.id;
          const away = member.is_away && member.away_period;

          return (
            <div
              key={member.id}
              className={`p-4 rounded-3xl border transition relative ${
                isMe
                  ? 'bg-gradient-to-b from-teal-950/30 to-slate-900 border-teal-500/40'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-teal-300">
                    {member.profile?.name?.[0] || 'U'}
                  </div>

                  <div>
                    {editingUserId === member.user_id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(member.user_id)}
                          className="text-xs text-teal-400 font-bold"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                          <span>{member.profile?.name}</span>
                          {isMe && <span className="text-teal-400 text-xs font-normal">(You)</span>}
                        </h4>
                        {isMemberAdmin && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" /> Admin
                          </span>
                        )}
                      </div>
                    )}

                    {/* Status: Home or Away */}
                    <div className="mt-1">
                      {away ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400">
                          <Plane className="w-3 h-3" /> Away until {format(parseISO(member.away_period!.end_at), 'MMM dd')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <Home className="w-3 h-3" /> Home
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin Menu for other members */}
                {isAdmin && !isMe && (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuUserId(activeMenuUserId === member.user_id ? null : member.user_id)
                      }
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuUserId === member.user_id && (
                      <div className="absolute right-0 mt-1 w-44 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-1.5 z-30 text-xs">
                        <button
                          onClick={() => {
                            setEditingUserId(member.user_id);
                            setEditName(member.profile?.name || '');
                            setActiveMenuUserId(null);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Rename
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuUserId(null);
                            handleTransfer(member.user_id, member.profile?.name);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-amber-300 hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Crown className="w-3.5 h-3.5 text-amber-400" /> Make Admin
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuUserId(null);
                            handleRemove(member.user_id, member.profile?.name);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:bg-slate-800 flex items-center gap-2 border-t border-slate-800/80 mt-1"
                        >
                          <UserX className="w-3.5 h-3.5 text-rose-400" /> Remove Member
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
