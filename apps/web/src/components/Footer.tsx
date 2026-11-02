'use client';

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';

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
    <footer className="bg-white border-t border-slate-200 py-10 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
        <p className="font-semibold text-slate-700">CampusBid Marketplace — Fair & Anti-Sniping Campus Auctions</p>
        <p className="mt-1">Only verified students with valid campus credentials can bid and sell.</p>
        <p className="mt-4 text-xs text-slate-400">© 2026 CampusBid. Built with Next.js, Express, Socket.IO & Prisma.</p>
      </div>
    </footer>
  );
}

