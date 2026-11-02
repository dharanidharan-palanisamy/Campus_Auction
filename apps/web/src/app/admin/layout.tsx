'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ShieldAlert, ArrowRight, Loader2, Home } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // If on admin login page, display standalone without admin shell
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-3" />
        <span className="text-xs font-semibold text-slate-500">Verifying administrative credentials...</span>
      </div>
    );
  }

  // Not logged in or not admin
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl border border-slate-700 p-8 text-center space-y-6 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Restricted Access</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              This portal is restricted to authorized campus marketplace administrators only. Student accounts cannot access the control center.
            </p>
          </div>
          <div className="space-y-2.5 pt-2">
            <Link
              href="/admin/login"
              className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              Sign In as Administrator <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-xl text-slate-400 hover:text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" /> Return to Campus Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Derive breadcrumb from pathname
  const pathParts = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => {
    const href = '/' + pathParts.slice(0, index + 1).join('/');
    const label = part === 'admin' ? 'Control Center' : part.replace(/-/g, ' ');
    return { href, label };
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row font-sans text-slate-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500 overflow-x-auto py-1">
            <Link href="/admin" className="hover:text-purple-600 transition">
              Admin
            </Link>
            {breadcrumbs.slice(1).map((b, idx) => (
              <React.Fragment key={b.href}>
                <span className="text-slate-300">/</span>
                <Link
                  href={b.href}
                  className={`capitalize transition ${
                    idx === breadcrumbs.length - 2
                      ? 'text-slate-900 font-bold'
                      : 'hover:text-purple-600'
                  }`}
                >
                  {b.label}
                </Link>
              </React.Fragment>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              API Connected
            </span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
