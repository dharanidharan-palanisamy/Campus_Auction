'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Radio, 
  Sparkles, 
  UserCheck, 
  Package, 
  Gavel, 
  X, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { AdminEventNotification } from '@/hooks/useAdminSocket';

interface AdminLiveTelemetryProps {
  isConnected: boolean;
  notifications: AdminEventNotification[];
  onDismiss: (id: string) => void;
}

export function AdminLiveTelemetry({
  isConnected,
  notifications,
  onDismiss
}: AdminLiveTelemetryProps) {
  // Show only the 3 most recent notifications as floating toasts
  const activeToasts = notifications.slice(0, 3);

  return (
    <>
      {/* Floating real-time event toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {activeToasts.map((toast) => {
          let Icon = Sparkles;
          let badgeColor = 'bg-purple-100 text-purple-700 border-purple-200';
          let targetHref = '/admin';

          if (toast.type === 'STUDENT_REGISTERED') {
            Icon = UserCheck;
            badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
            targetHref = '/admin/students?status=PENDING';
          } else if (toast.type === 'LISTING_CREATED') {
            Icon = Package;
            badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
            targetHref = '/admin/listings';
          } else if (toast.type === 'BID_PLACED') {
            Icon = Gavel;
            badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';
            targetHref = '/admin/auctions';
          }

          return (
            <div
              key={toast.id}
              className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white p-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300 flex items-start gap-3.5"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${badgeColor}`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Live Client Event
                    </span>
                  </div>
                  <button
                    onClick={() => onDismiss(toast.id)}
                    className="text-slate-400 hover:text-white p-0.5 rounded transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h5 className="text-xs font-bold text-white mt-1">{toast.title}</h5>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
                  {toast.message}
                </p>

                <div className="mt-2.5 flex items-center gap-2">
                  <Link
                    href={targetHref}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-400 hover:text-purple-300 underline"
                  >
                    View in Admin Panel <ExternalLink className="w-3 h-3" />
                  </Link>
                  <span className="text-[10px] text-slate-500">
                    {toast.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

