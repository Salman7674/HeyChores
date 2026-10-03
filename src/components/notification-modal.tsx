'use client';

import React, { useState } from 'react';
import { Bell, Smartphone, CheckCircle, Info, X } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleEnablePush = async () => {
    setLoading(true);
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Register service worker if supported
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            // Simulated or real subscription
            setSubscribed(true);
          }
        }
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-teal-500/20 text-teal-400 rounded-2xl">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Chore Reminders</h3>
            <p className="text-xs text-slate-400">Never miss your turn in the flat</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-300">
          <p>
            HeyChores sends intelligent reminders when it’s your turn: on the due date, +12h later, and daily until completed.
          </p>

          <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60 space-y-3">
            <div className="flex items-start gap-2.5">
              <Smartphone className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">iPhone / iPad Safari Note:</span>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Apple requires progressive web apps to be added to your home screen before receiving push notifications:
                </p>
                <ol className="text-xs text-slate-400 mt-2 space-y-1 list-decimal list-inside">
                  <li>Tap the <strong>Share</strong> button in Safari (box with arrow)</li>
                  <li>Select <strong>&quot;Add to Home Screen&quot;</strong></li>
                  <li>Open the HeyChores icon from your home screen</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-teal-950/40 rounded-2xl p-3 border border-teal-500/30 flex items-start gap-2 text-xs text-teal-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-teal-400" />
            <span>
              Even without browser push, you will always see prominent &quot;YOUR TURN&quot; alerts and in-app notifications whenever you visit.
            </span>
          </div>

          {subscribed ? (
            <div className="flex items-center justify-center gap-2 p-3 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium">
              <CheckCircle className="w-5 h-5" />
              Notifications Enabled!
            </div>
          ) : (
            <button
              onClick={handleEnablePush}
              disabled={loading}
              className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-2xl shadow-lg shadow-teal-500/20 active:scale-95 transition"
            >
              {loading ? 'Enabling...' : 'Enable Browser Push Notifications'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
