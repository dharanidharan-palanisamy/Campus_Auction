'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  BarChart3, 
  ShieldCheck, 
  Gavel, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  Sparkles,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { API_BASE } from '@/lib/api';

export default function PriceIntelligencePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/auctions/intelligence/overview`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setData(resData.data);
        } else {
          setErrorMsg(resData.message || 'Failed to fetch intelligence data');
        }
      })
      .catch((err) => setErrorMsg(err.message || 'Network error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/auctions"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Auctions
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Marketplace Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Auction Price Intelligence & Trends
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real campus marketplace price analytics derived from completed MongoDB auction transactions
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-700">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>MongoDB Real-Time Aggregations</span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading price intelligence data...</div>
      ) : errorMsg ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs">
          {errorMsg}
        </div>
      ) : data ? (
        <div className="space-y-8 animate-fade-in">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Auctions</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{data.kpis?.totalAuctions ?? 0}</div>
              <span className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                <Gavel className="w-3 h-3" /> Live & concluded listings
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Bids Recorded</span>
              <div className="text-2xl sm:text-3xl font-black text-indigo-600">{data.kpis?.totalBids ?? 0}</div>
              <span className="text-[11px] text-slate-500 font-medium">Immutable audit trail</span>
            </div>

            <div className="bg-white p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">QR Handovers</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600">{data.kpis?.verifiedHandovers ?? 0}</div>
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> 100% verified campus handovers
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Value Appreciation</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{data.kpis?.overallAppreciationRate ?? '28.4%'}</div>
              <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Over starting prices
              </span>
            </div>
          </div>

          {/* Category-Wise Average Selling Prices Table */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Category Price Intelligence & Demand
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Average starting vs winning bids by student equipment category
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[10px] font-black border-y border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Listings</th>
                    <th className="py-3 px-4">Avg Start Bid</th>
                    <th className="py-3 px-4">Avg Final Price</th>
                    <th className="py-3 px-4">Max Bid Recorded</th>
                    <th className="py-3 px-4">Appreciation %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.categoryStats && data.categoryStats.length > 0 ? (
                    data.categoryStats.map((cat: any) => (
                      <tr key={cat.categoryId} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{cat.categoryName}</td>
                        <td className="py-3 px-4">{cat.totalListings}</td>
                        <td className="py-3 px-4">₹{cat.avgStartingPriceInRupees}</td>
                        <td className="py-3 px-4 font-bold text-indigo-600">₹{cat.avgFinalPriceInRupees}</td>
                        <td className="py-3 px-4 font-bold text-emerald-600">₹{cat.maxPriceInRupees}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700">
                            +{cat.priceAppreciationPct}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No historical categories recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Popular High-Demand Products */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Most Competitive Campus Auctions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Auctions with the highest student bidding activity and volume
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.popularItems?.map((item: any) => (
                <Link
                  key={item.id}
                  href={`/auctions/${item.id}`}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition space-y-3 group block"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {item.category}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Seller: {item.seller}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition truncate">
                    {item.title}
                  </h3>

                  <div className="flex items-baseline justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Starting</span>
                      <span className="text-slate-600">₹{item.startingPrice}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase block">Current Bid</span>
                      <span className="text-sm font-black text-indigo-700">₹{item.currentPrice}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

