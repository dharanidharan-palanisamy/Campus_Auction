'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuctionCard } from '@/components/AuctionCard';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';

import { Suspense } from 'react';

export default function BrowseAuctionsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">Loading auctions...</div>}>
      <BrowseAuctionsContent />
    </Suspense>
  );
}

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
    if (q) params.set('q', q);
    if (selectedCategory) params.set('category', selectedCategory);
    if (condition) params.set('condition', condition);
    if (sort) params.set('sort', sort);

    fetch(`http://localhost:4000/api/v1/auctions?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setAuctions(data.data);
      })
      .finally(() => setLoading(false));
  }, [q, selectedCategory, condition, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Explore Auctions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Showing verified student auctions on campus
          </p>
        </div>

        {/* Search Input */}
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

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm mb-8">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider pr-3 border-r border-slate-200">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </div>

        {/* Category Select */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>

        {/* Condition Select */}
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none"
        >
          <option value="">Any Condition</option>
          <option value="NEW">New</option>
          <option value="LIKE_NEW">Like New</option>
          <option value="GOOD">Good</option>
          <option value="FAIR">Fair</option>
        </select>

        {/* Sort Select */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">Sort by:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none"
          >
            <option value="closing_soon">Closing Soonest</option>
            <option value="newest">Recently Listed</option>
            <option value="price_low">Lowest Leading Bid</option>
            <option value="price_high">Highest Leading Bid</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <p className="text-slate-500 font-medium">No auctions matched your filter criteria.</p>
          <button
            onClick={() => { setQ(''); setSelectedCategory(''); setCondition(''); }}
            className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {auctions.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </div>
  );
}
