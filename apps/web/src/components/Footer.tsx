'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gavel, ShieldCheck, QrCode, Sparkles, Heart } from 'lucide-react';

export function Footer() {
  return (
    <Suspense fallback={null}>
      <FooterContent />
    </Suspense>
  );
}

function FooterContent() {
  const pathname = usePathname();

  // Do not render student marketplace footer inside admin panel
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-white border-t border-[#E5EAF2] pt-14 pb-10 mt-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#5145FF] to-[#3563FF] flex items-center justify-center text-white shadow-xs">
                <Gavel className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-[#11182D]">
                  Campus<span className="text-[#5145FF]">Bid</span>
                </span>
                <span className="block text-[8px] uppercase font-black tracking-widest text-[#718096] -mt-1">
                  VERIFIED MARKETPLACE
                </span>
              </div>
            </Link>
            <p className="text-xs text-[#718096] leading-relaxed">
              Transparent, anti-sniping campus auction marketplace designed for verified university students.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified Campus Community
            </div>
          </div>

          {/* Marketplace Links */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black text-[#151B2C] uppercase tracking-wider">Marketplace</h4>
            <ul className="space-y-1.5 text-xs text-[#718096]">
              <li>
                <Link href="/auctions" className="hover:text-[#5145FF] transition">
                  Browse Auctions
                </Link>
              </li>
              <li>
                <Link href="/auctions?closing_soon=true" className="hover:text-amber-600 transition flex items-center gap-1">
                  Closing Soon
                </Link>
              </li>
              <li>
                <Link href="/assistant" className="hover:text-[#5145FF] transition flex items-center gap-1">
                  AI Smart Assistant
                </Link>
              </li>
              <li>
                <Link href="/intelligence" className="hover:text-[#5145FF] transition">
                  Price Intelligence
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black text-[#151B2C] uppercase tracking-wider">Top Categories</h4>
            <ul className="space-y-1.5 text-xs text-[#718096]">
              <li>
                <Link href="/auctions?category=bicycles" className="hover:text-[#5145FF] transition">
                  Bicycles & Transport
                </Link>
              </li>
              <li>
                <Link href="/auctions?category=calculators-tools" className="hover:text-[#5145FF] transition">
                  Calculators & Lab Tools
                </Link>
              </li>
              <li>
                <Link href="/auctions?category=books-study" className="hover:text-[#5145FF] transition">
                  Books & Study Materials
                </Link>
              </li>
              <li>
                <Link href="/auctions?category=electronics" className="hover:text-[#5145FF] transition">
                  Electronics & Gadgets
                </Link>
              </li>
            </ul>
          </div>

          {/* Student Trust & Safety */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black text-[#151B2C] uppercase tracking-wider">Trust & Safety</h4>
            <ul className="space-y-1.5 text-xs text-[#718096]">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5145FF]" />
                <span>Anti-Sniping 60s Extensions</span>
              </li>
              <li className="flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-[#5145FF]" />
                <span>QR Verified Handover Passes</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#5145FF]" />
                <span>AI Price Guidance</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[#E5EAF2] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#718096]">
          <p>© {new Date().getFullYear()} CampusBid. Verified Campus Auction Marketplace.</p>
          <p className="flex items-center gap-1 text-[11px]">
            Designed for safe & fair student commerce
          </p>
        </div>
      </div>
    </footer>
  );
}
