'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  Gavel, 
  Search, 
  PlusCircle, 
  Clock, 
  Sparkles, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  ShieldCheck, 
  Menu, 
  X 
} from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">Campus<span className="text-indigo-600">Bid</span></span>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 -mt-1">Verified Marketplace</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/auctions" className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition">
              Product
            </Link>
            <Link href="/auctions?closing_soon=true" className="text-sm font-semibold flex items-center gap-1.5 text-amber-600 hover:text-amber-700 transition">
              <Clock className="w-4 h-4" />
              Closing Soon
            </Link>
            <Link href="/assistant" className="text-sm font-semibold flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 transition">
              <Sparkles className="w-4 h-4" />
              AI Assistant
            </Link>
            {user?.role === 'ADMIN' && (
              <Link href="/admin" className="text-sm font-semibold flex items-center gap-1 text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200 hover:bg-purple-100 transition">
                <ShieldCheck className="w-4 h-4" />
                Admin Panel
              </Link>
            )}
          </nav>

          {/* User Controls & Actions */}
          <div className="hidden md:flex items-center gap-3">

            <Link
              href="/dashboard/listings/new"
              className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-indigo-700 transition"
            >
              <PlusCircle className="w-4 h-4" />
              Create Listing
            </Link>

            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                    {user.campusAlias.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-800 hidden lg:inline">{user.campusAlias}</span>
                </Link>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-700 hover:text-indigo-600 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
              >
                Log In
              </Link>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <Link href="/auctions" className="block py-2 text-base font-semibold text-slate-700">
            Browse Auctions
          </Link>
          <Link href="/auctions?closing_soon=true" className="block py-2 text-base font-semibold text-amber-600">
            Closing Soon
          </Link>
          <Link href="/assistant" className="block py-2 text-base font-semibold text-indigo-600">
            AI Assistant
          </Link>
          <Link href="/dashboard/listings/new" className="block py-2 text-base font-semibold text-indigo-600">
            + Create Listing
          </Link>
          {user?.role === 'ADMIN' && (
            <Link href="/admin" className="block py-2 text-base font-semibold text-purple-700">
              Admin Workspace
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
