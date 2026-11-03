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
  Trophy,
  LayoutGrid,
  ChevronDown,
  HelpCircle,
  PlusCircle,
  QrCode,
  TrendingUp,
  Award
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const SEARCH_SUGGESTIONS = [
  'Bicycles',
  'Scientific Calculators',
  'Textbooks',
  'Electronics',
  'Hostel Essentials'
];

function getCategoryIcon(slug: string, name: string) {
  const s = (slug || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (s.includes('book') || n.includes('book')) return BookOpen;
  if (s.includes('electron') || n.includes('electron') || n.includes('gadget')) return Laptop;
  if (s.includes('bicycle') || s.includes('transport') || n.includes('bicycle') || n.includes('cycle')) return Bike;
  if (s.includes('calculator') || s.includes('tool') || n.includes('calculator')) return Calculator;
  if (s.includes('hostel') || s.includes('room') || n.includes('hostel')) return HomeIcon;
  if (s.includes('sport') || s.includes('fitness') || n.includes('sport')) return Trophy;
  return LayoutGrid;
}

export default function HomePage() {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [auctionsRes, catRes] = await Promise.all([
          fetch('http://localhost:4000/api/v1/auctions?limit=12'),
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

  const featuredAuctions = auctions
    .filter((a) => a.status === 'ACTIVE' && new Date(a.closingTime).getTime() > Date.now())
    .slice(0, 8);

  const faqs = [
    {
      q: 'How do campus handovers work?',
      a: 'Once an auction closes, the winning buyer and seller confirm a designated campus meeting spot (e.g. Student Center, Main Gate). Both parties scan the one-time verified QR Handover Pass to confirm transaction completion safely.'
    },
    {
      q: 'What is Anti-Sniping protection?',
      a: 'Anti-sniping ensures fair bidding. If any bid is placed during the final 30 seconds of an auction, the timer automatically extends by 60 seconds, preventing bot sniping and giving everyone an equal chance.'
    },
    {
      q: 'How do I verify as a college student?',
      a: 'Sign up using your college email address or enter your student registration ID. Once verified by campus admins, you gain full access to bid, list items, and schedule pickup handovers.'
    },
    {
      q: 'Are there any listing or selling fees?',
      a: 'Zero. CampusBid is 100% free for college students. You keep all the proceeds from your sales without any commissions or hidden fees.'
    },
    {
      q: 'How does the AI Smart Price Estimator work?',
      a: 'When creating a listing, our AI assistant analyzes historical sales of similar campus items, condition, and market demand to recommend an optimal starting price and increment.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-[#F7F9FC] pt-14 pb-16 sm:pb-20 border-b border-[#E5EAF2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Student Verified Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-[#5145FF] text-xs font-bold uppercase tracking-wider mb-5 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-[#5145FF]" />
              Verified College Students Only
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#11182D] tracking-tight leading-[1.12]">
              Campus Deals Won Through{' '}
              <span className="bg-gradient-to-r from-[#5145FF] to-[#3563FF] bg-clip-text text-transparent">
                Fair Auctions
              </span>.
            </h1>

            {/* Subtitle */}
            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-[#718096] leading-relaxed">
              Buy and sell bicycles, scientific calculators, textbooks, electronics, and hostel essentials through transparent campus bidding.
            </p>

            {/* Premium Search Bar */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  window.location.href = `/auctions?q=${encodeURIComponent(searchQuery.trim())}`;
                }
              }}
              className="mt-7 max-w-2xl mx-auto flex items-center bg-white p-2 rounded-2xl shadow-lg shadow-indigo-100/50 border border-[#E5EAF2] focus-within:border-[#5145FF] focus-within:ring-2 focus-within:ring-indigo-100 transition-all"
            >
              <div className="pl-3 text-[#718096]">
                <Search className="w-5 h-5 text-[#5145FF]" />
              </div>
              <input
                type="text"
                placeholder="Search bicycles, calculators, textbooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm text-[#151B2C] placeholder:text-[#718096] bg-transparent focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-2 text-xs text-[#718096] hover:text-[#151B2C]"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                className="bg-[#5145FF] hover:bg-[#4338CA] text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition shadow-sm active:scale-[0.98]"
              >
                Search
              </button>
            </form>

            {/* Popular Search Suggestions */}
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-[#718096] font-semibold">Popular:</span>
              {SEARCH_SUGGESTIONS.map((item) => (
                <Link
                  key={item}
                  href={`/auctions?q=${encodeURIComponent(item)}`}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#E5EAF2] text-[#151B2C] hover:text-[#5145FF] hover:border-indigo-300 transition"
                >
                  {item}
                </Link>
              ))}
            </div>

            {/* Action CTAs */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/auctions"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5145FF] hover:bg-[#4338CA] text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-200 transition active:scale-[0.98]"
              >
                Browse Auctions
                <ArrowRight className="w-4 h-4" />
              </Link>

              {user && user.role === 'STUDENT' ? (
                <Link
                  href="/dashboard/listings/new"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-[#E5EAF2] hover:border-indigo-300 text-[#151B2C] hover:text-[#5145FF] font-bold text-xs sm:text-sm shadow-xs transition"
                >
                  <PlusCircle className="w-4 h-4 text-[#5145FF]" />
                  Create Listing
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-[#E5EAF2] hover:border-indigo-300 text-[#151B2C] hover:text-[#5145FF] font-bold text-xs sm:text-sm shadow-xs transition"
                >
                  Join CampusBid
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Category Section with Unique Icons */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#11182D]">Explore by Category</h2>
            <p className="text-xs sm:text-sm text-[#718096] mt-0.5">Essential student gear across academic departments</p>
          </div>
          <Link
            href="/auctions"
            className="text-xs sm:text-sm font-bold text-[#5145FF] hover:text-[#4338CA] flex items-center gap-1 group"
          >
            <span>All Categories</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {categories.map((cat) => {
            const IconComponent = getCategoryIcon(cat.slug, cat.name);
            return (
              <Link
                key={cat.id || cat.slug}
                href={`/auctions?category=${cat.slug}`}
                className="flex flex-col items-center text-center p-4 rounded-2xl bg-white border border-[#E5EAF2] hover:border-indigo-300 hover:shadow-md transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50/80 text-[#5145FF] flex items-center justify-center mb-3 group-hover:bg-[#5145FF] group-hover:text-white transition-colors duration-200 shadow-xs">
                  <IconComponent className="w-6 h-6" />
                </div>
                <span className="font-bold text-xs text-[#151B2C] group-hover:text-[#5145FF] transition-colors line-clamp-1">
                  {cat.name}
                </span>
                <span className="text-[11px] font-semibold text-[#718096] mt-1">
                  {cat._count?.listings || 0} active
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Closing Soon Section */}
      <section className="bg-amber-50/60 border-y border-amber-200/70 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider mb-0.5">
                  Closing Soon
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#11182D]">Last Chance Deals</h2>
                <p className="text-xs text-[#718096]">Auctions ending within 3 hours. Anti-sniping active.</p>
              </div>
            </div>
            <Link
              href="/auctions?closing_soon=true"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-amber-800 hover:text-amber-950 bg-white px-3.5 py-2 rounded-xl border border-amber-200 shadow-xs transition"
            >
              <span>View All Closing Soon</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {closingSoonAuctions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {closingSoonAuctions.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center max-w-lg mx-auto">
              <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-sm text-[#151B2C]">No Auctions Ending in the Next 3 Hours</p>
              <p className="text-xs text-[#718096] mt-1">Check out our active listings currently accepting campus bids.</p>
              <Link
                href="/auctions"
                className="mt-4 inline-block text-xs font-bold text-[#5145FF] hover:underline"
              >
                Browse All Live Auctions →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 4. Featured Campus Auctions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-black text-[#11182D]">Featured Campus Auctions</h2>
          <p className="text-xs sm:text-sm text-[#718096] mt-0.5">Live student items verified for direct on-campus inspection</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-80 rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {(featuredAuctions.length > 0 ? featuredAuctions : auctions.slice(0, 8)).map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/auctions"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#5145FF] hover:bg-[#4338CA] text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-100 transition active:scale-[0.98] group"
              >
                <span>Browse All Marketplace Auctions</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </>
        )}
      </section>

      {/* 5. How Campus Auctions Work */}
      <section className="bg-[#11182D] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-3">
              How It Works
            </div>
            <h2 className="text-2xl sm:text-4xl font-black">How Campus Auctions Work</h2>
            <p className="mt-2 text-slate-400 text-xs sm:text-sm">
              Replace chaotic chat groups and awkward bargaining with fair, transparent student bidding.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Step 1 */}
            <div className="bg-slate-800/90 p-6 rounded-2xl border border-slate-700/80 relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-lg mb-4">
                1
              </div>
              <h3 className="font-bold text-base sm:text-lg mb-2">Verified Student Listing</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Sellers post items with condition ratings, starting prices, and secure designated campus pickup locations.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-800/90 p-6 rounded-2xl border border-slate-700/80 relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-lg mb-4">
                2
              </div>
              <h3 className="font-bold text-base sm:text-lg mb-2">Fair & Anti-Sniping Bids</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Place bids in verified increments. If a bid arrives in the last 30 seconds, the clock extends by 60s for true fairness.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-800/90 p-6 rounded-2xl border border-slate-700/80 relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-lg mb-4">
                3
              </div>
              <h3 className="font-bold text-base sm:text-lg mb-2">Confirmed Campus Handover</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                The seller approves the winning bid. Meet at campus pickup locations with one-time verified QR Handover Passes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Why Choose CampusBid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-[#11182D]">Why Choose CampusBid</h2>
          <p className="text-xs sm:text-sm text-[#718096] mt-2">
            Built specifically for college campuses with safety, trust, and pricing transparency in mind.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-[#E5EAF2] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#151B2C] mb-1.5">100% Student Verified</h3>
            <p className="text-xs text-[#718096] leading-relaxed">
              Every seller and buyer is verified with campus credentials to prevent scams, fake accounts, and strangers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E5EAF2] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#5145FF] flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#151B2C] mb-1.5">Anti-Sniping Engine</h3>
            <p className="text-xs text-[#718096] leading-relaxed">
              Automated 60-second extensions ensure that genuine buyers win, not last-second sniping bots.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E5EAF2] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#151B2C] mb-1.5">QR Handover Pass</h3>
            <p className="text-xs text-[#718096] leading-relaxed">
              Secure, tamper-proof QR verification confirms item inspection and buyer acceptance right on campus.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E5EAF2] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#151B2C] mb-1.5">Price Intelligence</h3>
            <p className="text-xs text-[#718096] leading-relaxed">
              AI-driven price benchmarks and historical sales data help you price competitively and find the best deals.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Campus Marketplace Statistics */}
      <section className="bg-white border-y border-[#E5EAF2] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-[#5145FF] price-tag">300+</div>
              <p className="text-xs font-bold text-[#151B2C] mt-1">Verified Students</p>
              <p className="text-[11px] text-[#718096]">Active university community</p>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-[#11182D] price-tag">100%</div>
              <p className="text-xs font-bold text-[#151B2C] mt-1">Anti-Sniping Fair Play</p>
              <p className="text-[11px] text-[#718096]">Zero bot manipulation</p>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 price-tag">₹0</div>
              <p className="text-xs font-bold text-[#151B2C] mt-1">Student Platform Fee</p>
              <p className="text-[11px] text-[#718096]">100% free for students</p>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-[#3563FF] price-tag">4.9 / 5.0</div>
              <p className="text-xs font-bold text-[#151B2C] mt-1">Campus Trust Rating</p>
              <p className="text-[11px] text-[#718096]">Verified handover score</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Frequently Asked Questions (FAQ) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-[#5145FF] text-xs font-bold uppercase tracking-wider mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            Got Questions?
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#11182D]">Frequently Asked Questions</h2>
          <p className="text-xs sm:text-sm text-[#718096] mt-1">Everything you need to know about campus auctions</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#E5EAF2] overflow-hidden transition-shadow shadow-xs hover:border-indigo-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-[#151B2C] focus:outline-none"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#718096] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs text-[#718096] leading-relaxed border-t border-slate-100 animate-in fade-in duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
