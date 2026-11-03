'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  PlusCircle, 
  LogOut, 
  Package, 
  ShoppingBag, 
  ChevronDown,
  ShieldCheck,
  Bell,
  User
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function NavDesktopActions() {
  const { user, logout, isLoading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasUnreadAlerts, setHasUnreadAlerts] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (isLoading) {
    return <div className="h-9 w-28 bg-slate-100 rounded-xl animate-pulse" />;
  }

  if (user && user.role === 'STUDENT') {
    return (
      <div className="flex items-center gap-3">
        {/* Notifications Bell */}
        <Link
          href="/notifications"
          title="Notifications & Alerts"
          className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
        >
          <Bell className="w-4 h-4" />
          {hasUnreadAlerts && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#633BFF] ring-2 ring-white" />
          )}
        </Link>

        {/* Create Listing Button */}
        <Link
          href="/dashboard/listings/new"
          className="flex items-center gap-1.5 bg-gradient-to-r from-[#633BFF] to-[#536BFF] hover:brightness-110 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#633BFF]/25 transition-all active:scale-[0.98]"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Create Listing
        </Link>

        {/* Profile Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition focus:outline-none"
            aria-expanded={dropdownOpen}
            aria-label="User Account Menu"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#633BFF] to-[#536BFF] text-white flex items-center justify-center font-black text-xs shadow-xs">
              {(user.campusAlias || user.fullName || 'ST').substring(0, 2).toUpperCase()}
            </div>
            <span className="text-xs font-bold text-slate-800 max-w-[100px] truncate">
              {user.campusAlias || user.fullName?.split(' ')[0]}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu (Clean White Surface) */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-black text-slate-900 truncate">{user.fullName || user.campusAlias}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="text-[10px] font-bold text-slate-500">{user.studentId || 'Verified Student'}</span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/dashboard"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-[#F1EEFF] hover:text-[#633BFF] transition"
                >
                  <User className="w-3.5 h-3.5 text-[#633BFF]" />
                  My Profile
                </Link>
                <Link
                  href="/dashboard/listings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-[#F1EEFF] hover:text-[#633BFF] transition"
                >
                  <Package className="w-3.5 h-3.5 text-[#633BFF]" />
                  My Listings
                </Link>
                <Link
                  href="/dashboard/won"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-[#F1EEFF] hover:text-[#633BFF] transition"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#633BFF]" />
                  Items Won
                </Link>
              </div>

              <div className="border-t border-slate-100 pt-1 mt-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/register"
        className="text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-3.5 py-2 rounded-xl transition"
      >
        Register
      </Link>
      <Link
        href="/login"
        className="text-xs font-bold text-white bg-gradient-to-r from-[#633BFF] to-[#536BFF] hover:brightness-110 px-4 py-2 rounded-xl shadow-md shadow-[#633BFF]/25 transition"
      >
        Log In
      </Link>
    </div>
  );
}

export function NavMobileActions({ onClose }: { onClose: () => void }) {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="py-2 space-y-2 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-28" />
        <div className="h-4 bg-slate-100 rounded w-20" />
      </div>
    );
  }

  if (user && user.role === 'STUDENT') {
    return (
      <div className="space-y-1 pt-3 border-t border-slate-200">
        <Link
          href="/dashboard/listings/new"
          onClick={onClose}
          className="flex items-center gap-2 py-2 text-sm font-bold text-[#633BFF]"
        >
          <PlusCircle className="w-4 h-4" />
          Create Listing
        </Link>
        <Link
          href="/notifications"
          onClick={onClose}
          className="flex items-center gap-2 py-2 text-sm font-semibold text-slate-800 hover:text-[#633BFF]"
        >
          <Bell className="w-4 h-4 text-[#633BFF]" />
          Notifications
        </Link>
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2 py-2 text-sm font-semibold text-slate-800 hover:text-[#633BFF]"
        >
          <User className="w-4 h-4 text-[#633BFF]" />
          My Profile
        </Link>
        <Link
          href="/dashboard/listings"
          onClick={onClose}
          className="flex items-center gap-2 py-2 text-sm font-semibold text-slate-800 hover:text-[#633BFF]"
        >
          <Package className="w-4 h-4 text-[#633BFF]" />
          My Listings
        </Link>
        <Link
          href="/dashboard/won"
          onClick={onClose}
          className="flex items-center gap-2 py-2 text-sm font-semibold text-slate-800 hover:text-[#633BFF]"
        >
          <ShoppingBag className="w-4 h-4 text-[#633BFF]" />
          Items Won
        </Link>
        <button
          onClick={() => {
            logout();
            onClose();
          }}
          className="w-full flex items-center gap-2 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
      <Link
        href="/register"
        onClick={onClose}
        className="block text-center py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50"
      >
        Register
      </Link>
      <Link
        href="/login"
        onClick={onClose}
        className="block text-center py-2.5 rounded-xl bg-gradient-to-r from-[#633BFF] to-[#536BFF] text-white text-sm font-bold shadow-md shadow-[#633BFF]/25"
      >
        Log In
      </Link>
    </div>
  );
}
