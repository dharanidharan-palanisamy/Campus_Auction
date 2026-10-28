'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuctionCard } from '@/components/AuctionCard';
import { 
  Search, 
  Sparkles, 
  ShieldCheck, 
  Flame, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Bike, 
  BookOpen, 
  Laptop, 
  Calculator, 
  Home as HomeIcon,
  HelpCircle
} from 'lucide-react';

export default function HomePage() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [auctionsRes, catRes] = await Promise.all([
          fetch('http://localhost:4000/api/v1/auctions?limit=8'),
          fetch('http://localhost:4000/api/v1/auctions/categories')
        ]);
        const auctionsData = await auctionsRes.json();
        const catData = await catRes.json();

        if (auctionsData.success) setAuctions(auctionsData.data);
        if (catData.success) setCategories(catData.data);
      } catch (err) {
        console.error('Failed to load marketplace data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const closingSoonAuctions = auctions
    .filter((a) => {
      const remainingMs = new Date(a.closingTime).getTime() - Date.now();
      return remainingMs > 0 && remainingMs <= 3 * 3600 * 1000;
    })
    .sort((a, b) => new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime())
    .slice(0, 4);

  return (
    <div>
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/80 via-white to-slate-50 pt-16 pb-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-wider mb-6">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Verified College Students Only
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.15]">
              Campus Deals Won Through <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">Fair Auctions</span>.
            </h1>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              Buy and sell bicycles, scientific calculators, textbooks, and hostel essentials. Transparent bidding, zero ghosting, and built-in anti-sniping protection.
            </p>

            {/* Prominent Search Bar */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  window.location.href = `/auctions?q=${encodeURIComponent(searchQuery.trim())}`;
                }
              }}
              className="mt-8 max-w-xl mx-auto flex items-center bg-white p-2 rounded-2xl shadow-lg border border-slate-200"
            >
              <div className="pl-3 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Search bicycles, Casio calculators, CLRS textbooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 bg-transparent focus:outline-none"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition shadow-sm"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 2. Popular Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Explore by Category</h2>
            <p className="text-sm text-slate-500">Discover essential gear across campus departments</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/auctions?category=${cat.slug}`}
              className="flex flex-col items-center text-center p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md transition group"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition">
                <Bike className="w-6 h-6" />
              </div>
              <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition">
                {cat.name}
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                {cat._count?.listings || 0} active
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Closing Soon Section */}
      <section className="bg-amber-50/50 border-y border-amber-200/60 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
                <Clock className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900">Closing Soon — Last Chance Bids</h2>
                <p className="text-sm text-slate-600">Anti-sniping extensions protect bids submitted in final 30 seconds</p>
              </div>
            </div>
            <Link href="/auctions?closing_soon=true" className="text-sm font-bold text-amber-700 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {closingSoonAuctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Active Marketplace Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-900">Featured Campus Auctions</h2>
          <p className="text-sm text-slate-500">Verified student listings available for campus handover</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-80 rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {auctions.slice(0, 4).map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>

            {/* View More Products Button */}
            <div className="mt-12 text-center">
              <Link
                href="/auctions"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition duration-200 group"
              >
                <span>View More Products</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </>
        )}
      </section>

      {/* 5. How It Works */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-black">How Campus Auctions Work</h2>
            <p className="mt-2 text-slate-400 text-sm">Say goodbye to chat group chaos and unfair price bargaining</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h3 className="font-bold text-lg mb-2">Verified Student Listing</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Sellers post items with condition ratings, starting prices, and secure designated campus pickup locations.
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h3 className="font-bold text-lg mb-2">Fair & Anti-Sniping Bids</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Place bids in verified increments. If a bid arrives in the last 30 seconds, the clock extends by 60s for true fairness.
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="font-bold text-lg mb-2">Confirmed Campus Handover</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                The seller approves the winning bid, reserving the item for direct inspection and safe handover on campus grounds.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
