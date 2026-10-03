'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import { IntervalType } from '@/types';
import { Sparkles, X, ChevronUp, ChevronDown, Check, Plus } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTaskModal({ isOpen, onClose }: CreateTaskModalProps) {
  const { members, createTask } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [intervalType, setIntervalType] = useState<IntervalType>('days');
  const [intervalValue, setIntervalValue] = useState<number>(3);
  const [rotationOrder, setRotationOrder] = useState<string[]>(() => members.map((m) => m.user_id));
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...rotationOrder];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    setRotationOrder(next);
  };

  const moveDown = (index: number) => {
    if (index === rotationOrder.length - 1) return;
    const next = [...rotationOrder];
    const temp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = temp;
    setRotationOrder(next);
  };

  const toggleMember = (userId: string) => {
    if (rotationOrder.includes(userId)) {
      if (rotationOrder.length > 1) {
        setRotationOrder(rotationOrder.filter((id) => id !== userId));
      }
    } else {
      setRotationOrder([...rotationOrder, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || rotationOrder.length === 0) return;

    setSubmitting(true);
    await createTask({
      name: name.trim(),
      description: description.trim() || undefined,
      intervalType,
      intervalValue: Number(intervalValue),
      rotationUserIds: rotationOrder,
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-teal-500/20 text-teal-400 rounded-2xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Create New Task</h3>
            <p className="text-xs text-slate-400">Set task frequency and rotation sequence</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Task Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Clean Hall, Clean Bathroom, Take Out Trash"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Sweep & mop hall, wipe dust from coffee table and shelves"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Recurrence Frequency
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Repeat every:</span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={intervalValue}
                  onChange={(e) => setIntervalValue(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">Interval unit:</span>
                <select
                  value={intervalType}
                  onChange={(e) => setIntervalType(e.target.value as IntervalType)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:border-teal-400"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-teal-400 mt-2">
              Preview: Repeats <strong>every {intervalValue} {intervalType}</strong> after completion.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Rotation Order ({rotationOrder.length} members)
              </label>
              <span className="text-[11px] text-slate-500">Reorder with arrows</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {rotationOrder.map((userId, index) => {
                const member = members.find((m) => m.user_id === userId);
                return (
                  <div
                    key={userId}
                    className="flex items-center justify-between p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-white">{member?.profile?.name || userId}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-700 transition"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(index)}
                        disabled={index === rotationOrder.length - 1}
                        className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-700 transition"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
              disabled={submitting || !name.trim()}
              className="flex-1 py-3 px-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
