'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Gavel, AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/auctions');
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const res = await login(email, password);
    if (res.success) {
      if (res.user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/auctions');
      }
    } else {
      setErrorMsg(res.message || 'Authentication failed. Please verify your email and password.');
    }
    setLoading(false);
  };

  const setPreset = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-4 py-12 bg-[#F7F9FC]">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#E5EAF2] shadow-xl p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5145FF] to-[#3563FF] text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-indigo-100">
            <Gavel className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-[#11182D]">Sign in to CampusBid</h2>
          <p className="text-xs text-[#718096] mt-1">Use your verified institutional credentials</p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#718096] mb-1.5">Campus Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. aarav.sharma@campus.edu"
              className="w-full px-4 py-2.5 text-xs sm:text-sm text-[#151B2C] bg-[#F7F9FC] rounded-xl border border-[#E5EAF2] focus:outline-none focus:border-[#5145FF] focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#718096]">Password</label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm text-[#151B2C] bg-[#F7F9FC] rounded-xl border border-[#E5EAF2] focus:outline-none focus:border-[#5145FF] focus:ring-2 focus:ring-indigo-100 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-[#718096] hover:text-[#151B2C] absolute right-3 top-1/2 -translate-y-1/2 rounded-lg transition"
                title={showPassword ? 'Hide password' : 'View password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#5145FF] hover:bg-[#4338CA] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-100 transition flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        {/* Demo Fast Login Buttons */}
        <div className="pt-4 border-t border-[#E5EAF2]">
          <p className="text-xs text-[#718096] text-center mb-4">
            New to campus auctions?{' '}
            <Link href="/register" className="font-bold text-[#5145FF] hover:underline">
              Create an Account
            </Link>
          </p>

          <span className="text-[10px] font-black uppercase tracking-wider text-[#718096] block mb-2 text-center">
            Demo 1-Click Credentials
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => setPreset('aarav.sharma@campus.edu', 'CampusPassword123!')}
              className="p-2.5 text-left bg-[#F7F9FC] hover:bg-indigo-50/70 border border-[#E5EAF2] hover:border-indigo-200 rounded-xl transition"
            >
              <span className="font-bold text-[#151B2C] block">Aarav (Student)</span>
              <span className="text-[10px] text-[#718096]">aarav.sharma@...</span>
            </button>
            <button
              onClick={() => setPreset('priya.patel@campus.edu', 'CampusPassword123!')}
              className="p-2.5 text-left bg-[#F7F9FC] hover:bg-indigo-50/70 border border-[#E5EAF2] hover:border-indigo-200 rounded-xl transition"
            >
              <span className="font-bold text-[#151B2C] block">Priya (Student)</span>
              <span className="text-[10px] text-[#718096]">priya.patel@...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
