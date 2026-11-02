'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  Users,
  Package,
  Gavel,
  Trophy,
  AlertTriangle,
  Printer,
  Loader2,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';

export default function AdminReportsPage() {
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('campus_token');
      const res = await fetch(`${API_BASE}/admin/reports/overview?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.ok !== false && json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [range]);

  const downloadCSV = async (type: 'auctions' | 'bids' | 'students') => {
    try {
      const token = localStorage.getItem('campus_token');
      const url =
        type === 'students'
          ? `${API_BASE}/admin/students/export`
          : `${API_BASE}/admin/reports/export?type=${type}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${type}_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to download report CSV');
    }
  };

  const formatINR = (cents: number) => {
    return `₹${((cents || 0) / 100).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">
            Marketplace gross merchandise volume, student participation, and institutional compliance exports.
          </p>
        </div>

        {/* Range Selector & Print */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-white p-1 rounded-xl border border-slate-200 flex items-center shadow-sm">
            {(['7d', '30d', '90d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  range === r
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : 'All Time'}
              </button>
            ))}
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
          <p className="text-sm font-medium">Aggregating marketplace telemetry...</p>
        </div>
      ) : data ? (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Volume (GMV)</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{formatINR(data.totalVolumeInCents)}</p>
              <span className="text-xs text-emerald-600 font-semibold mt-1 inline-flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Completed campus transactions
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New Registrations</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{data.studentsCount}</p>
              <span className="text-xs text-slate-500 mt-1 block">
                {data.verifiedCount} verified with campus email
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Listings Created</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{data.listingsCount}</p>
              <span className="text-xs text-indigo-600 font-semibold mt-1 block">
                {data.completedCount} completed • {data.unsoldCount} unsold
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bids Placed</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{data.bidsCount}</p>
              <span className="text-xs text-slate-500 mt-1 block">
                {data.disputesCount} complaints filed
              </span>
            </div>
          </div>

          {/* Leaderboards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Sellers */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <Package className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Top Campus Sellers</h3>
              </div>
              {data.topSellers && data.topSellers.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {data.topSellers.map((seller: any, idx: number) => (
                    <div key={seller.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 font-bold text-slate-600 flex items-center justify-center text-[11px]">
                          {idx + 1}
                        </span>
                        <div>
                          <Link
                            href={`/admin/students/${seller.id}`}
                            className="font-bold text-slate-900 hover:text-indigo-600 transition"
                          >
                            @{seller.campusAlias} ({seller.fullName})
                          </Link>
                          <p className="text-[11px] text-slate-400">ID: {seller.studentId}</p>
                        </div>
                      </div>
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                        {seller._count?.listings || 0} listings
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-6 text-center">No seller activity recorded yet.</p>
              )}
            </div>

            {/* Top Bidders */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <Gavel className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Most Active Bidders</h3>
              </div>
              {data.topBidders && data.topBidders.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {data.topBidders.map((bidder: any, idx: number) => (
                    <div key={bidder.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 font-bold text-slate-600 flex items-center justify-center text-[11px]">
                          {idx + 1}
                        </span>
                        <div>
                          <Link
                            href={`/admin/students/${bidder.id}`}
                            className="font-bold text-slate-900 hover:text-indigo-600 transition"
                          >
                            @{bidder.campusAlias} ({bidder.fullName})
                          </Link>
                          <p className="text-[11px] text-slate-400">ID: {bidder.studentId}</p>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                        {bidder._count?.bids || 0} bids
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-6 text-center">No bidding activity recorded yet.</p>
              )}
            </div>
          </div>

          {/* CSV Export Tools Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Institutional Data Exports</h3>
                <p className="text-xs text-indigo-200 mt-1 max-w-xl">
                  Download raw CSV spreadsheets for campus administration, audit logs, student activity tracking, and semester financial reporting.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => downloadCSV('auctions')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition"
                >
                  <Download className="w-3.5 h-3.5" /> Auctions CSV
                </button>
                <button
                  onClick={() => downloadCSV('bids')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition"
                >
                  <Download className="w-3.5 h-3.5" /> Bids CSV
                </button>
                <button
                  onClick={() => downloadCSV('students')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Students CSV
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

