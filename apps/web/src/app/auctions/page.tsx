'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuctionCard } from '@/components/AuctionCard';
import { Search, SlidersHorizontal, Zap, CheckCircle2, LayoutGrid } from 'lucide-react';
import { Suspense } from 'react';

export default function BrowseAuctionsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">Loading auctions...</div>}>
      <BrowseAuctionsContent />
    </Suspense>
  );
}

const STATUS_TABS = [
  { value: 'ALL', label: 'All Products', icon: LayoutGrid },
  { value: 'ACTIVE', label: 'Live Now', icon: Zap },
  { value: 'ENDED', label: 'Sold / Ended', icon: CheckCircle2 },
];

function BrowseAuctionsContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialClosingSoon = searchParams.get('closing_soon') === 'true';

  const [auctions, setAuctions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [q, setQ] = useState(initialQ);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [condition, setCondition] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'ENDED'>(initialClosingSoon ? 'ACTIVE' : 'ALL');
  const [sort, setSort] = useState(initialClosingSoon ? 'closing_soon' : 'newest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:4000/api/v1/auctions/categories')
      .then(res => res.json())
      .then(data => { if (data.success) setCategories(data.data); });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();

    // Smart: if q matches a category name exactly, switch to category filter
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === q.toLowerCase()
    );
    const effectiveQ = matchedCategory ? '' : q;
    const effectiveCategory = matchedCategory ? matchedCategory.slug : selectedCategory;

    if (effectiveQ) params.set('q', effectiveQ);
    if (effectiveCategory) params.set('category', effectiveCategory);
    if (condition) params.set('condition', condition);
    params.set('status', statusTab);
    // Only use closing_soon sort when in active tab
    const effectiveSort = statusTab === 'ACTIVE' && sort === 'closing_soon' ? 'closing_soon' : sort;
    params.set('sort', effectiveSort);
    params.set('limit', '24');

    fetch(`http://localhost:4000/api/v1/auctions?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setAuctions(data.data);
      })
      .finally(() => setLoading(false));
  }, [q, selectedCategory, condition, sort, statusTab, categories]);

  const liveCount = auctions.filter(a => a.status === 'ACTIVE' && new Date(a.closingTime) > new Date()).length;
  const endedCount = auctions.filter(a => a.status !== 'ACTIVE' || new Date(a.closingTime) <= new Date()).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Explore Auctions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Showing verified student auctions on campus
          </p>
        </div>
        {/* Search */}
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search keywords or titles..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 mb-5">
        {STATUS_TABS.map(({ value, label, icon: Icon }) => {
          const isActive = statusTab === value;
          return (
            <button
              key={value}
              onClick={() => {
                setStatusTab(value as any);
                if (value === 'ACTIVE') setSort('closing_soon');
                else setSort('newest');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}

        {/* Summary counts */}
        {statusTab === 'ALL' && !loading && (
          <span className="ml-auto text-xs text-slate-400 font-medium">
            {auctions.length} total · <span className="text-emerald-600 font-semibold">{liveCount} live</span> · {endedCount} ended
          </span>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm mb-8">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider pr-3 border-r border-slate-200">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </div>

        {/* Category */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>

        {/* Condition */}
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">Any Condition</option>
          <option value="NEW">New</option>
          <option value="LIKE_NEW">Like New</option>
          <option value="GOOD">Good</option>
          <option value="FAIR">Fair</option>
        </select>

        {/* Sort */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">Sort by:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {statusTab === 'ACTIVE' && <option value="closing_soon">Closing Soonest</option>}
            <option value="newest">Recently Listed</option>
            <option value="price_low">Lowest Price</option>
            <option value="price_high">Highest Price</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-80 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-slate-500 font-medium">No auctions matched your filter criteria.</p>
          <button
            onClick={() => { setQ(''); setSelectedCategory(''); setCondition(''); setStatusTab('ALL'); }}
            className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* When showing ALL: render Live section first, then Ended */}
          {statusTab === 'ALL' ? (
            <>
              {/* Live Section */}
              {auctions.filter(a => a.status === 'ACTIVE' && new Date(a.closingTime) > new Date()).length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="text-base font-bold text-slate-800">Live Auctions</h2>
                    <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                      {auctions.filter(a => a.status === 'ACTIVE' && new Date(a.closingTime) > new Date()).length} active
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {auctions
                      .filter(a => a.status === 'ACTIVE' && new Date(a.closingTime) > new Date())
                      .map((auction) => <AuctionCard key={auction.id} auction={auction} />)}
                  </div>
                </div>
              )}

              {/* Ended / Sold Section */}
              {auctions.filter(a => a.status !== 'ACTIVE' || new Date(a.closingTime) <= new Date()).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <h2 className="text-base font-bold text-slate-800">Sold & Ended</h2>
                    <span className="ml-1 text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                      {auctions.filter(a => a.status !== 'ACTIVE' || new Date(a.closingTime) <= new Date()).length} items
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {auctions
                      .filter(a => a.status !== 'ACTIVE' || new Date(a.closingTime) <= new Date())
                      .map((auction) => <AuctionCard key={auction.id} auction={auction} />)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {auctions.map((auction) => <AuctionCard key={auction.id} auction={auction} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
