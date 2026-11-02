'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard,
  Users,
  UserCheck,
  UserX,
  Package,
  Gavel,
  History,
  Tag,
  AlertTriangle,
  Bell,
  BarChart3,
  ShieldAlert,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ExternalLink,
  Shield,
  Menu,
  X
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard }
    ]
  },
  {
    title: 'STUDENT MANAGEMENT',
    items: [
      { label: 'All Students', href: '/admin/students', icon: Users },
      { label: 'Pending Verification', href: '/admin/students?status=PENDING', icon: UserCheck },
      { label: 'Suspended Students', href: '/admin/students?status=SUSPENDED', icon: UserX }
    ]
  },
  {
    title: 'MARKETPLACE MANAGEMENT',
    items: [
      { label: 'Listings', href: '/admin/listings', icon: Package },
      { label: 'Live Auctions', href: '/admin/auctions', icon: Gavel },
      { label: 'Bid History', href: '/admin/bids', icon: History },
      { label: 'Categories', href: '/admin/categories', icon: Tag }
    ]
  },
  {
    title: 'SUPPORT',
    items: [
      { label: 'Disputes & Reports', href: '/admin/disputes', icon: AlertTriangle },
      { label: 'Notifications', href: '/admin/notifications', icon: Bell }
    ]
  },
  {
    title: 'ANALYTICS',
    items: [
      { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
      { label: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldAlert }
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { label: 'Settings', href: '/admin/settings', icon: Settings }
    ]
  }
];

export function AdminSidebar() {
  return (
    <Suspense fallback={<div className="w-64 bg-slate-900 min-h-screen hidden lg:block" />}>
      <AdminSidebarContent />
    </Suspense>
  );
}

function AdminSidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { adminUser, adminLogout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    adminLogout();
    router.push('/admin/login');
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }

    const [targetPath, targetQuery] = href.split('?');

    if (pathname !== targetPath) {
      if (targetPath === '/admin/students' && pathname.startsWith('/admin/students/')) {
        return !targetQuery;
      }
      return false;
    }

    if (targetQuery) {
      const qParams = new URLSearchParams(targetQuery);
      for (const [key, val] of qParams.entries()) {
        if (searchParams.get(key) !== val) {
          return false;
        }
      }
      return true;
    }

    if (targetPath === '/admin/students') {
      const currentStatus = searchParams.get('status');
      return !currentStatus || currentStatus === 'ALL';
    }

    return true;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand Header */}
      <div className={`h-16 flex items-center border-b border-slate-800 shrink-0 ${
        collapsed ? 'justify-center px-2' : 'justify-between px-4'
      }`}>
        {!collapsed ? (
          <>
            <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-purple-950">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-black text-sm text-white tracking-tight flex items-center gap-1.5">
                  CampusBid
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded">
                    Admin
                  </span>
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider truncate">
                  Operations Center
                </span>
              </div>
            </Link>
            <button
              onClick={() => setCollapsed(true)}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center justify-center gap-1">
            <Link
              href="/admin"
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-950 hover:scale-105 transition-transform"
              title="CampusBid Admin Operations"
            >
              <Shield className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setCollapsed(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Expand sidebar"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Nav List */}
      <div className={`flex-1 overflow-y-auto space-y-6 ${collapsed ? 'px-1.5 py-4' : 'px-3 py-4'}`}>
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed ? (
              <h4 className="px-2.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {section.title}
              </h4>
            ) : (
              <div className="h-1.5" />
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center rounded-xl text-xs font-semibold transition-all group ${
                      collapsed
                        ? 'w-10 h-10 mx-auto justify-center'
                        : 'gap-3 px-2.5 py-2'
                    } ${
                      active
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/50'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-transform ${active ? 'text-white' : 'text-slate-400 group-hover:text-purple-400'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Profile & Actions */}
      <div className={`border-t border-slate-800 shrink-0 ${collapsed ? 'p-2 space-y-2' : 'p-3 space-y-2'}`}>
        <Link
          href="/"
          target="_blank"
          className={`flex items-center rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition ${
            collapsed ? 'w-10 h-10 mx-auto justify-center' : 'gap-2 px-2.5 py-2'
          }`}
          title="View Marketplace"
        >
          <ExternalLink className="w-4 h-4 shrink-0 text-slate-400" />
          {!collapsed && <span>View Marketplace</span>}
        </Link>

        {collapsed ? (
          <div className="pt-2 border-t border-slate-800 flex flex-col items-center gap-1.5">
            <Link
              href="/admin/profile"
              onClick={() => setMobileOpen(false)}
              className="w-10 h-10 rounded-xl hover:bg-slate-800/80 flex items-center justify-center transition group"
              title="View Administrator Profile"
            >
              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-xs group-hover:border-purple-400 group-hover:scale-105 transition-all">
                {adminUser?.campusAlias?.substring(0, 2).toUpperCase() || 'AD'}
              </div>
            </Link>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <Link
              href="/admin/profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 min-w-0 p-1.5 rounded-xl hover:bg-slate-800/80 transition flex-1 group"
              title="View Administrator Profile"
            >
              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-xs shrink-0 group-hover:border-purple-400 group-hover:scale-105 transition-all">
                {adminUser?.campusAlias?.substring(0, 2).toUpperCase() || 'AD'}
              </div>
              <div className="min-w-0 text-left">
                <span className="block text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                  {adminUser?.fullName || 'Campus Administrator'}
                </span>
                <span className="block text-[10px] text-slate-400 truncate">{adminUser?.email || 'admin@campus.edu'}</span>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition shrink-0 ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out border-r border-slate-800 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="sticky top-0 h-screen">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Hamburger Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-4 h-16 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-black text-sm text-white">CampusBid Admin</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-full h-full z-10">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 z-20"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

