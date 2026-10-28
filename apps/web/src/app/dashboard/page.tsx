'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { formatINR } from '@/lib/utils';
import { 
  User as UserIcon, 
  Gavel, 
  ShoppingBag, 
  Clock, 
  Bell, 
  PlusCircle, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  Package
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('campus_token');
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('http://localhost:4000/api/v1/student/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setData(resData.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Student Profile & Dashboard</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">Please log in to manage your active auctions, bids, and won items.</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md transition"
        >
          Sign In with Campus ID <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header Profile Badge */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-md shadow-indigo-100">
            {user.campusAlias.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900">{user.fullName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                @{user.campusAlias}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span>Student ID: <strong className="text-slate-700">{user.studentId}</strong></span>
              <span>•</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Campus Identity
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/listings/new"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            Create New Listing
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">My Active Listings</span>
            <Package className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">
            {data?.activeListings?.length ?? 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Live selling items</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Bids</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">
            {data?.activeBidsCount ?? 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Auctions participating in</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Items Won</span>
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">
            {data?.wonAuctions?.length ?? 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Provisional wins & handovers</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Unread Alerts</span>
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">
            {data?.unreadNotificationsCount ?? 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Bidding notifications</span>
        </div>
      </div>

      {/* Two Columns: My Active Listings & Won Items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Seller Listings (6 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-900">Items I Am Selling</h3>
            <Link href="/dashboard/listings/new" className="text-xs font-bold text-indigo-600 hover:underline">
              + Add Item
            </Link>
          </div>

          <div className="space-y-3">
            {!data?.activeListings || data.activeListings.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">You haven't listed any items for auction yet.</p>
            ) : (
              data.activeListings.map((l: any) => (
                <Link
                  key={l.id}
                  href={`/auctions/${l.id}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 transition"
                >
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{l.title}</h4>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      {l._count?.bids || 0} bids placed • Closes {new Date(l.closingTime).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-slate-900 block">
                      {formatINR(l.currentLeadingBidInCents || l.startingPriceInCents)}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-indigo-600">View →</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right: Won / Provisional Wins (6 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg text-slate-900 mb-4">Items Won & Handover Status</h3>
          <div className="space-y-3">
            {!data?.wonAuctions || data.wonAuctions.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No won auctions yet. Check closing soon listings to bid!</p>
            ) : (
              data.wonAuctions.map((w: any) => (
                <div
                  key={w.id}
                  className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{w.listing?.title}</h4>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      Seller: @{w.listing?.seller?.campusAlias} • Decision: <strong>{w.sellerDecision}</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-emerald-800 block">
                      {formatINR(w.finalAmountInCents)}
                    </span>
                    <Link
                      href={`/auctions/${w.listingId}`}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Pickup details →
                    </Link>
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
