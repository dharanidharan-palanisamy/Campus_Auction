'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatINR } from '@/lib/utils';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Ban, 
  Package, 
  Gavel, 
  CheckCircle2, 
  ShoppingBag, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight, 
  RefreshCw, 
  ShieldAlert, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Eye,
  Check
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'today' | '7d' | '30d' | '90d' | 'all'>('30d');
  const [errorMsg, setErrorMsg] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('campus_token') : '';

  const loadStats = async (selectedRange = range) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/stats?range=${selectedRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      } else {
        setErrorMsg(data.message || 'Failed to load marketplace statistics');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats(range);
  }, [range]);

  return (
    <div className="space-y-8">
      {/* Page Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Marketplace Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time telemetry, student verifications, and auction moderation
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto self-start sm:self-auto">
          {(['today', '7d', '30d', '90d', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                range === r
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {r === 'today' && 'Today'}
              {r === '7d' && 'Last 7d'}
              {r === '30d' && 'Last 30d'}
              {r === '90d' && 'Last 90d'}
              {r === 'all' && 'All Time'}
            </button>
          ))}
          <button
            onClick={() => loadStats(range)}
            title="Refresh statistics"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => loadStats(range)} className="underline">Retry</button>
        </div>
      )}

      {/* Action Banners if pending items exist */}
      {stats && (stats.pendingVerification > 0 || stats.openDisputes > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.pendingVerification > 0 && (
            <Link
              href="/admin/students?status=PENDING"
              className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between hover:bg-amber-100/70 transition shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  {stats.pendingVerification}
                </div>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider">Pending Student Verifications</h4>
                  <p className="text-xs text-amber-800 mt-0.5">Students awaiting institutional credential review</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-600" />
            </Link>
          )}

          {stats.openDisputes > 0 && (
            <Link
              href="/admin/disputes"
              className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between hover:bg-rose-100/70 transition shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
                  {stats.openDisputes}
                </div>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider">Active Disputes & Complaints</h4>
                  <p className="text-xs text-rose-800 mt-0.5">Requires administrative review and resolution</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-rose-600" />
            </Link>
          )}
        </div>
      )}

      {/* Row 1: Student KPIs (Highest Priority) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Student Identity & Community Health
          </h3>
          <Link href="/admin/students" className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1">
            Manage Students <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Students</span>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
              {stats?.totalStudents ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Registered on platform</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Verified Students</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600">
              {stats?.verifiedStudents ?? 0}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
              {stats?.totalStudents ? Math.round((stats.verifiedStudents / stats.totalStudents) * 100) : 0}% verification rate
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending Review</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-600">
              {stats?.pendingVerification ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Awaiting admin sign-off</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Suspended</span>
              <Ban className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-rose-600">
              {stats?.suspendedStudents ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Restricted from bidding</span>
          </div>
        </div>
      </div>

      {/* Row 2: Marketplace Activity KPIs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Marketplace Auctions & Volumes
          </h3>
          <Link href="/admin/listings" className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1">
            View Listings <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Live Auctions</span>
              <Gavel className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-indigo-600">
              {stats?.activeAuctions ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {stats?.closingSoonAuctions ?? 0} closing in &lt;3h
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Completed Sales</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
              {stats?.completedAuctions ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {stats?.unsoldAuctions ?? 0} ended unsold
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Accepted Bids</span>
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
              {stats?.totalBids ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Immutable bid records</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Sales Volume</span>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-purple-700">
              {stats ? formatINR(stats.totalVolumeInCents) : '₹0'}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Completed handovers</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Category Distribution</h3>
              <p className="text-[11px] text-slate-500">Live & historical listings across campus categories</p>
            </div>
            <Link href="/admin/categories" className="text-xs font-bold text-purple-600 hover:underline">
              Manage
            </Link>
          </div>

          <div className="space-y-3 pt-2">
            {!stats?.categoryDistribution || stats.categoryDistribution.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No category data recorded.</p>
            ) : (
              stats.categoryDistribution.map((cat: any) => {
                const maxCount = Math.max(...stats.categoryDistribution.map((c: any) => c.count), 1);
                const percent = Math.round((cat.count / maxCount) * 100);
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span className="truncate">{cat.name}</span>
                      <span className="font-mono text-slate-500">{cat.count} listings</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Outcomes Ratio (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Auction Outcome Ratios</h3>
            <p className="text-[11px] text-slate-500">Marketplace conversion and clearance metrics</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {stats?.outcomeDistribution?.map((o: any) => (
              <div key={o.name} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{o.name}</span>
                <span className="text-2xl font-black text-slate-800 mt-1 block">{o.count}</span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 text-xs space-y-1">
            <span className="font-bold text-purple-950 block">Marketplace Anti-Sniping Protection</span>
            <p className="text-purple-800 leading-relaxed text-[11px]">
              Last-minute bids within 30 seconds automatically extend the auction clock by 60 seconds to ensure competitive price discovery.
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Feeds: Recent Students & Recent Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Students (6 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Recent Student Registrations</h3>
            <Link href="/admin/students" className="text-xs font-bold text-purple-600 hover:underline">
              View All ({stats?.totalStudents ?? 0})
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {!stats?.recentStudents || stats.recentStudents.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No registered students yet.</p>
            ) : (
              stats.recentStudents.map((st: any) => (
                <div key={st.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
                      {st.campusAlias?.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block truncate">{st.fullName}</span>
                      <span className="text-[11px] text-slate-400 truncate block">@{st.campusAlias} • {st.studentId}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      st.isEmailVerified ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {st.isEmailVerified ? 'Verified' : 'Pending'}
                    </span>
                    <Link
                      href={`/admin/students/${st.id}`}
                      className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-slate-100 transition"
                      title="View Student Profile"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Listings (6 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Recently Listed Auctions</h3>
            <Link href="/admin/listings" className="text-xs font-bold text-purple-600 hover:underline">
              View All ({stats?.totalListings ?? 0})
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {!stats?.recentListings || stats.recentListings.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No listings created yet.</p>
            ) : (
              stats.recentListings.map((l: any) => (
                <div key={l.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 block truncate">{l.title}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      By @{l.seller?.campusAlias || 'Student'} • {l.category?.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-slate-900 block">
                      {formatINR(l.currentLeadingBidInCents > 0 ? l.currentLeadingBidInCents : l.startingPriceInCents)}
                    </span>
                    <span className={`text-[10px] uppercase font-bold ${
                      l.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Recent Bids & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Bids (6 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Live Bidding Activity</h3>
            <Link href="/admin/bids" className="text-xs font-bold text-purple-600 hover:underline">
              View All ({stats?.totalBids ?? 0})
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {!stats?.recentBids || stats.recentBids.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No bids recorded yet.</p>
            ) : (
              stats.recentBids.map((b: any) => (
                <div key={b.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 block truncate">{b.listing?.title}</span>
                    <span className="text-[11px] text-slate-400 block">
                      @{b.bidder?.campusAlias || 'Student'} ({b.bidder?.studentId})
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-slate-900 block">{formatINR(b.amountInCents)}</span>
                    <span className="text-[10px] text-slate-400">{new Date(b.acceptedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Logs (6 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Administrative Audit Stream</h3>
            <Link href="/admin/audit-logs" className="text-xs font-bold text-purple-600 hover:underline">
              Audit Logs
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {!stats?.recentAuditLogs || stats.recentAuditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent administrative events.</p>
            ) : (
              stats.recentAuditLogs.map((log: any) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-mono text-[11px] font-bold text-purple-700 block truncate">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Target: {log.targetType} {log.targetId ? `(${log.targetId.substring(0, 8)}...)` : ''}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      @{log.actor?.campusAlias || 'Admin'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
