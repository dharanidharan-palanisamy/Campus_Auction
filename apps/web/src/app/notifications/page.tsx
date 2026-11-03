'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Gavel,
  Trophy,
  Clock,
  QrCode,
  Calendar,
  ExternalLink,
  ChevronRight,
  Search,
  CheckCheck,
  ShieldCheck,
  ArrowRight,
  X,
  Filter
} from 'lucide-react';

interface NotificationItem {
  id: string;
  _id?: string;
  type: string;
  title: string;
  message: string;
  metadata?: {
    listingId?: string;
    bidAmount?: number;
    auctionTitle?: string;
    handoverCode?: string;
    [key: string]: any;
  };
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'BIDS' | 'HANDOVERS'>('ALL');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('campus_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('http://localhost:4000/api/v1/student/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setNotifications(data.data);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Mark single notification as read
  const markAsRead = async (id: string) => {
    const token = localStorage.getItem('campus_token');
    if (!token) return;

    try {
      setActionInProgress(id);
      const res = await fetch(`http://localhost:4000/api/v1/student/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
        );
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Mark all unread as read
  const markAllAsRead = async () => {
    const token = localStorage.getItem('campus_token');
    if (!token) return;

    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;

    try {
      setActionInProgress('all');
      await Promise.all(
        unread.map(n =>
          fetch(`http://localhost:4000/api/v1/student/notifications/${n.id}/read`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Metrics
  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const bidsCount = notifications.filter(n =>
    ['OUTBID', 'NEW_BID', 'AUTO_BID', 'CLOSING_SOON'].includes(n.type?.toUpperCase())
  ).length;
  const handoversCount = notifications.filter(n =>
    ['AUCTION_WON', 'HANDOVER_PASS_GENERATED', 'HANDOVER_COMPLETED', 'APPOINTMENT'].includes(
      n.type?.toUpperCase()
    )
  ).length;

  // Filter items
  const filteredNotifications = notifications.filter(item => {
    // Search query
    const matchSearch =
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;

    // Filter tab
    if (filterTab === 'UNREAD') return !item.isRead;
    if (filterTab === 'BIDS') {
      return ['OUTBID', 'NEW_BID', 'AUTO_BID', 'CLOSING_SOON'].includes(item.type?.toUpperCase());
    }
    if (filterTab === 'HANDOVERS') {
      return ['AUCTION_WON', 'HANDOVER_PASS_GENERATED', 'HANDOVER_COMPLETED', 'APPOINTMENT'].includes(
        item.type?.toUpperCase()
      );
    }
    return true;
  });

  // Relative Time Formatter
  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Icon & Style helper based on notification type
  const getTypeConfig = (type: string) => {
    const t = type?.toUpperCase() || '';
    if (t.includes('OUTBID')) {
      return {
        icon: <AlertTriangle className="w-4 h-4 text-rose-500" />,
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        badgeText: 'Outbid Alert',
      };
    }
    if (t.includes('WON')) {
      return {
        icon: <Trophy className="w-4 h-4 text-emerald-600" />,
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badgeText: 'Auction Won',
      };
    }
    if (t.includes('BID')) {
      return {
        icon: <Gavel className="w-4 h-4 text-[#633BFF]" />,
        badgeBg: 'bg-[#F1EEFF] text-[#633BFF] border-[#633BFF]/20',
        badgeText: 'Bid Update',
      };
    }
    if (t.includes('HANDOVER') || t.includes('PASS')) {
      return {
        icon: <QrCode className="w-4 h-4 text-indigo-600" />,
        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        badgeText: 'Campus Handover',
      };
    }
    if (t.includes('APPOINTMENT')) {
      return {
        icon: <Calendar className="w-4 h-4 text-blue-600" />,
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
        badgeText: 'Pickup Slot',
      };
    }
    return {
      icon: <Bell className="w-4 h-4 text-slate-500" />,
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
      badgeText: 'Campus Alert',
    };
  };

  if (authLoading || (loading && !user)) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-[#633BFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-slate-500">Loading your notifications...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-[#F1EEFF] text-[#633BFF] rounded-3xl flex items-center justify-center mx-auto mb-4">
          <Bell className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-[#15152D]">Notifications & Alerts</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">
          Please log in to view real-time auction outbids, won items, and handover schedules.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#633BFF] hover:bg-[#5145FF] text-white font-bold rounded-2xl shadow-md transition"
        >
          Sign In to Access Alerts
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FF] py-8 sm:py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Page Header Banner */}
        <div className="bg-white rounded-3xl border border-[#E5EAF2] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F1EEFF] text-[#633BFF] flex items-center justify-center shadow-xs">
                <Bell className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#15152D] tracking-tight">
                Notifications & Alerts
              </h1>
              {unreadCount > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-600 border border-rose-200 animate-pulse">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Instant alerts on your bids, anti-sniping updates, outbid notices, and campus handover status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={actionInProgress === 'all'}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4 text-[#633BFF]" />
                <span>Mark All as Read</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5EAF2] shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Alerts</span>
              <Bell className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-[#15152D]">{totalCount}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Campus notifications</span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5EAF2] shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Unread</span>
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-rose-600">{unreadCount}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Action required</span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5EAF2] shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Bids & Outbids</span>
              <Gavel className="w-4 h-4 text-[#633BFF]" />
            </div>
            <div className="mt-2 text-2xl font-black text-[#633BFF]">{bidsCount}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Bidding activity</span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5EAF2] shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Wins & Handover</span>
              <Trophy className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-600">{handoversCount}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Completed outcomes</span>
          </div>
        </div>

        {/* Search & Tabs Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5EAF2] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notifications by title or message..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#633BFF]/20 focus:border-[#633BFF]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'UNREAD', label: `Unread (${unreadCount})` },
              { id: 'BIDS', label: 'Bids & Outbids' },
              { id: 'HANDOVERS', label: 'Handovers & Wins' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  filterTab === tab.id
                    ? 'bg-[#633BFF] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#E5EAF2] p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#F1EEFF] text-[#633BFF] flex items-center justify-center mx-auto">
              <Bell className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-[#15152D]">All Caught Up!</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery || filterTab !== 'ALL'
                ? 'No notifications match your current filter. Try resetting filters.'
                : 'You have no new alerts right now. When you participate in live auctions, bidding and handover alerts will appear here.'}
            </p>
            {searchQuery || filterTab !== 'ALL' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterTab('ALL');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Reset Filters
              </button>
            ) : (
              <Link
                href="/auctions"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#633BFF] hover:bg-[#5145FF] text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                Explore Live Auctions
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map(item => {
              const cfg = getTypeConfig(item.type);
              const targetListingId = item.metadata?.listingId;

              return (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition flex items-start justify-between gap-4 ${
                    !item.isRead
                      ? 'bg-white border-[#633BFF]/40 shadow-sm ring-1 ring-[#633BFF]/10'
                      : 'bg-white/70 border-[#E5EAF2] hover:bg-white'
                  }`}
                >
                  {/* Left: Type Icon & Content */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 shrink-0 mt-0.5">
                      {cfg.icon}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badgeBg}`}>
                          {cfg.badgeText}
                        </span>
                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#633BFF]" title="Unread" />
                        )}
                        <span className="text-[11px] text-slate-400 font-medium">
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-[#15152D] leading-snug">
                        {item.title}
                      </h4>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {item.message}
                      </p>

                      {/* Metadata / Action Links */}
                      {targetListingId && (
                        <div className="pt-1.5 flex items-center gap-3 text-xs">
                          <Link
                            href={`/auctions/${targetListingId}`}
                            className="text-[#633BFF] hover:underline font-bold inline-flex items-center gap-1"
                          >
                            <span>View Auction Item</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                          {item.type?.toUpperCase().includes('WON') && (
                            <Link
                              href="/dashboard/won"
                              className="text-emerald-600 hover:underline font-bold inline-flex items-center gap-1"
                            >
                              <span>Open Won Items Pass →</span>
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={() => markAsRead(item.id)}
                        disabled={actionInProgress === item.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                        title="Mark as read"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

