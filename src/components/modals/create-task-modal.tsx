'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/app-context';
import { IntervalType } from '@/types';
import { Sparkles, X, ChevronUp, ChevronDown, Check, UserCheck, AlertCircle } from 'lucide-react';

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
  const [rotationOrder, setRotationOrder] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Whenever modal opens, initialize rotation order with all current flatmates
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setIntervalType('days');
      setIntervalValue(3);
      setError('');
      setRotationOrder(members.map((m) => m.user_id));
    }
  }, [isOpen, members]);

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

  const toggleMemberInRotation = (userId: string) => {
    if (rotationOrder.includes(userId)) {
      if (rotationOrder.length <= 1) {
        setError('At least one roommate must be in the rotation.');
        return;
      }
      setError('');
      setRotationOrder(rotationOrder.filter((id) => id !== userId));
    } else {
      setError('');
      setRotationOrder([...rotationOrder, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please provide a task name.');
      return;
    }

    if (rotationOrder.length === 0) {
      setError('Please select at least one roommate for this chore.');
      return;
    }

    setSubmitting(true);
    const result = await createTask({
      name: name.trim(),
      description: description.trim() || undefined,
      intervalType,
      intervalValue: Number(intervalValue),
      rotationUserIds: rotationOrder,
    });
    setSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.message || 'Failed to create task.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-2xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Add New Chore</h3>
            <p className="text-xs text-slate-400">Set frequency and assign the rotation order</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Chore Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wash Dishes, Clean Balcony, Buy Water"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Take out trash bags & wipe counters"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Frequency
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Repeats every:</span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={intervalValue}
                  onChange={(e) => setIntervalValue(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Unit:</span>
                <select
                  value={intervalType}
                  onChange={(e) => setIntervalType(e.target.value as IntervalType)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-400"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-teal-400 mt-1.5">
              Occurs every {intervalValue} {intervalType} after completion.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Rotation Order ({rotationOrder.length} selected)
              </label>
              <span className="text-[10px] text-slate-500">First person starts</span>
            </div>

            {/* List all flatmates to include/exclude & order */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {rotationOrder.map((userId, index) => {
                const member = members.find((m) => m.user_id === userId);
                return (
                  <div
                    key={userId}
                    className="flex items-center justify-between p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-[10px]">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-white">
                        {member?.profile?.name || userId}
                      </span>
                      {index === 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-400 text-slate-950">
                          1st Turn
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-700"
                        title="Move Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(index)}
                        disabled={index === rotationOrder.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-700"
                        title="Move Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* If any members are not yet included */}
            {members.length > rotationOrder.length && (
              <div className="mt-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-500 block mb-1">Click to include in rotation:</span>
                <div className="flex flex-wrap gap-1.5">
                  {members
                    .filter((m) => !rotationOrder.includes(m.user_id))
                    .map((m) => (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => toggleMemberInRotation(m.user_id)}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 flex items-center gap-1"
                      >
                        <span>+ {m.profile?.name}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || rotationOrder.length === 0}
              className="flex-1 py-3 px-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {submitting ? 'Creating Chore...' : 'Create Chore'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
