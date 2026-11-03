'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { 
  Gavel, 
  Clock, 
  Sparkles, 
  Menu, 
  X,
  TrendingUp,
  LayoutGrid
} from 'lucide-react';

const NavDesktopActions = dynamic(
  () => import('./NavUserActions').then((mod) => mod.NavDesktopActions),
  {
    ssr: false,
    loading: () => <div className="h-9 w-28 bg-slate-100 rounded-xl animate-pulse" />,
  }
);

const NavMobileActions = dynamic(
  () => import('./NavUserActions').then((mod) => mod.NavMobileActions),
  {
    ssr: false,
    loading: () => (
      <div className="py-2 space-y-2 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-28" />
        <div className="h-4 bg-slate-100 rounded w-20" />
      </div>
    ),
  }
);

export function Navbar() {
  return (
    <Suspense fallback={<header className="sticky top-0 z-50 bg-white border-b border-[#E5EAF2] h-16 shadow-xs" />}>
      <NavbarContent />
    </Suspense>
  );
}

function NavbarContent() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Automatically close mobile menu whenever route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Do not render student navbar in admin panel
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const isAuctionsActive = pathname === '/auctions' && !pathname.includes('closing_soon');
  const isClosingSoonActive = pathname?.includes('closing_soon');
  const isAssistantActive = pathname === '/assistant';
  const isIntelligenceActive = pathname === '/intelligence';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E5EAF2] transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tagline */}
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#633BFF] to-[#536BFF] flex items-center justify-center text-white shadow-md shadow-[#633BFF]/25 group-hover:scale-105 transition-transform">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-[#151B2C]">
                Campus<span className="text-[#633BFF]">Bid</span>
              </span>
              <span className="block text-[9px] uppercase font-black tracking-widest text-[#718096] -mt-1">
                VERIFIED MARKETPLACE
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              href="/auctions"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isAuctionsActive
                  ? 'bg-[#F1EEFF] text-[#633BFF] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#633BFF]" />
              Browse Auctions
            </Link>

            <Link
              href="/auctions?closing_soon=true"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isClosingSoonActive
                  ? 'bg-amber-50 text-amber-700 font-extrabold border border-amber-200 shadow-xs'
                  : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              Closing Soon
            </Link>

            <Link
              href="/assistant"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isAssistantActive
                  ? 'bg-[#F1EEFF] text-[#633BFF] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#633BFF]" />
              AI Assistant
            </Link>

            <Link
              href="/intelligence"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isIntelligenceActive
                  ? 'bg-[#F1EEFF] text-[#633BFF] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#536BFF]" />
              Price Intelligence
            </Link>
          </nav>

          {/* User Controls & Actions */}
          <div className="hidden md:flex items-center gap-3">
            <NavDesktopActions />
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-slate-800" /> : <Menu className="w-6 h-6 text-slate-800" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E5EAF2] px-4 pt-3 pb-5 space-y-3 shadow-xl">
          <nav className="flex flex-col gap-1">
            <Link
              href="/auctions"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <LayoutGrid className="w-4 h-4 text-[#633BFF]" />
              Browse Auctions
            </Link>
            <Link
              href="/auctions?closing_soon=true"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-amber-600 hover:bg-amber-50 transition"
            >
              <Clock className="w-4 h-4 text-amber-500" />
              Closing Soon
            </Link>
            <Link
              href="/assistant"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <Sparkles className="w-4 h-4 text-[#633BFF]" />
              AI Assistant
            </Link>
            <Link
              href="/intelligence"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <TrendingUp className="w-4 h-4 text-[#536BFF]" />
              Price Intelligence
            </Link>
          </nav>

          <NavMobileActions onClose={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
}
