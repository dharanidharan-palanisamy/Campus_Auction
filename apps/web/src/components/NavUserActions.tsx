'use client';

import React from 'react';
import Link from 'next/link';
import { PlusCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function NavDesktopActions() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-8 w-28 bg-slate-100 rounded-xl animate-pulse" />;
  }

  if (user && user.role === 'STUDENT') {
    return (
      <>
        <Link
          href="/dashboard/listings/new"
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-indigo-700 transition"
        >
          <PlusCircle className="w-4 h-4" />
          Create Listing
        </Link>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
              {(user.campusAlias || 'ST').substring(0, 2).toUpperCase()}
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
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/register"
        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-50 transition"
      >
        Register
      </Link>
      <Link
        href="/login"
        className="text-sm font-semibold text-slate-700 hover:text-indigo-600 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
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
      <>
        <Link
          href="/dashboard/listings/new"
          onClick={onClose}
          className="block py-2 text-base font-semibold text-indigo-600 hover:text-indigo-700 transition"
        >
          + Create Listing
        </Link>
        <Link
          href="/dashboard"
          onClick={onClose}
          className="block py-2 text-base font-semibold text-slate-700 hover:text-slate-900 transition"
        >
          My Student Account ({user.campusAlias})
        </Link>
        <button
          onClick={() => {
            logout();
            onClose();
          }}
          className="block w-full text-left py-2 text-base font-semibold text-rose-600 hover:text-rose-700 transition"
        >
          Sign Out
        </button>
      </>
    );
  }

  return (
    <>
      <Link
        href="/register"
        onClick={onClose}
        className="block py-2 text-base font-semibold text-indigo-600 hover:text-indigo-700 transition"
      >
        Register
      </Link>
      <Link
        href="/login"
        onClick={onClose}
        className="block py-2 text-base font-semibold text-slate-700 hover:text-slate-900 transition"
      >
        Log In
      </Link>
    </>
  );
}

