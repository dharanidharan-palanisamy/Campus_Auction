'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell,
  Send,
  Users,
  UserCheck,
  Ban,
  User,
  Radio,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Megaphone
} from 'lucide-react';

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form state
  const [target, setTarget] = useState<'ALL_STUDENTS' | 'VERIFIED_STUDENTS' | 'SUSPENDED_STUDENTS' | 'INDIVIDUAL'>('ALL_STUDENTS');
  const [targetUserId, setTargetUserId] = useState('');
  const [type, setType] = useState('ANNOUNCEMENT');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifications(data.data.notifications || []);
        setTotalCount(data.data.totalCount || 0);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setErrorMessage('Title and message are required.');
      return;
    }
    if (target === 'INDIVIDUAL' && !targetUserId.trim()) {
      setErrorMessage('Please provide an individual student ID or UUID.');
      return;
    }

    try {
      setSending(true);
      setSuccessMessage(null);
      setErrorMessage(null);
      const token = localStorage.getItem('campus_token');

      const res = await fetch(`${API_BASE}/admin/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          target,
          targetUserId: target === 'INDIVIDUAL' ? targetUserId.trim() : undefined,
          type,
          title: title.trim(),
          message: message.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(data.message || 'Notification broadcast sent successfully!');
        setTitle('');
        setMessage('');
        setTargetUserId('');
        await fetchNotifications();
      } else {
        setErrorMessage(data.message || 'Failed to dispatch notification');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Notification & Broadcast Manager</h1>
          <p className="text-sm text-slate-500">
            Dispatch urgent campus announcements, safety warnings, and policy alerts to students.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-slate-600 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm">
            Total Delivered: <strong className="text-indigo-600">{totalCount}</strong>
          </div>
          <div className="text-xs font-semibold text-slate-600 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm">
            Unread: <strong className="text-amber-600">{unreadCount}</strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Broadcast Form (Left/Top) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Megaphone className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Compose Broadcast</h2>
          </div>

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> {errorMessage}
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
                Target Audience
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setTarget('ALL_STUDENTS')}
                  className={`p-2.5 rounded-xl border text-left font-semibold transition flex items-center gap-2 ${
                    target === 'ALL_STUDENTS'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" /> All Students
                </button>
                <button
                  type="button"
                  onClick={() => setTarget('VERIFIED_STUDENTS')}
                  className={`p-2.5 rounded-xl border text-left font-semibold transition flex items-center gap-2 ${
                    target === 'VERIFIED_STUDENTS'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <UserCheck className="w-4 h-4 shrink-0" /> Verified Only
                </button>
                <button
                  type="button"
                  onClick={() => setTarget('SUSPENDED_STUDENTS')}
                  className={`p-2.5 rounded-xl border text-left font-semibold transition flex items-center gap-2 ${
                    target === 'SUSPENDED_STUDENTS'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Ban className="w-4 h-4 shrink-0" /> Suspended Only
                </button>
                <button
                  type="button"
                  onClick={() => setTarget('INDIVIDUAL')}
                  className={`p-2.5 rounded-xl border text-left font-semibold transition flex items-center gap-2 ${
                    target === 'INDIVIDUAL'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <User className="w-4 h-4 shrink-0" /> Individual
                </button>
              </div>
            </div>

            {target === 'INDIVIDUAL' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Recipient Student UUID *
                </label>
                <input
                  type="text"
                  required
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="e.g., student UUID from Students Directory"
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Notification Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
              >
                <option value="ANNOUNCEMENT">📢 Announcement (Campus-wide notice)</option>
                <option value="SYSTEM">⚙️ System Alert (Maintenance, Policy Update)</option>
                <option value="BID_UPDATE">🏷️ Marketplace Alert (Auction Rules, Anti-sniping)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Subject / Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Scheduled Campus Handover Hours Updated"
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Message Body *
              </label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter clear, concise instructions or notice details..."
                rows={4}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-100 transition flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Dispatch Broadcast
            </button>
          </form>
        </div>

        {/* Recent Delivery History (Right/Bottom) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Recent Notifications Feed</h2>
              </div>
              <button
                onClick={fetchNotifications}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs">Loading delivery logs...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs">No notifications recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white transition text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-sm">{n.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        n.type === 'ANNOUNCEMENT'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {n.type}
                      </span>
                    </div>

                    <p className="text-slate-600 mb-2 line-clamp-2">{n.message}</p>

                    <div className="flex items-center justify-between text-slate-400 text-[11px] pt-2 border-t border-slate-100">
                      <span>
                        Recipient: <strong>@{n.user?.campusAlias || 'Student'}</strong> ({n.user?.fullName})
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(n.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

