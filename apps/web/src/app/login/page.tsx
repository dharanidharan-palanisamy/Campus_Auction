'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Gavel, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, setUserDirectly } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const res = await login(email, password);
    if (res.success) {
      router.push('/auctions');
    } else {
      setErrorMsg(res.message || 'Authentication failed');
    }
    setLoading(false);
  };

  const setPreset = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-indigo-200">
            <Gavel className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Sign in to CampusBid</h2>
          <p className="text-xs text-slate-500 mt-1">Use your verified institutional credentials</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Campus Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. aarav.sharma@campus.edu"
              className="w-full px-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            Sign In <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast Login Buttons */}
        <div className="pt-4 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2 text-center">
            Demo 1-Click Credentials
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => setPreset('aarav.sharma@campus.edu', 'CampusPassword123!')}
              className="p-2 text-left bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-xl transition"
            >
              <span className="font-bold text-slate-800 block">Aarav (Student)</span>
              <span className="text-[10px] text-slate-400">aarav.sharma@...</span>
            </button>
            <button
              onClick={() => setPreset('admin@campus.edu', 'CampusPassword123!')}
              className="p-2 text-left bg-slate-50 hover:bg-purple-50 border border-slate-200 rounded-xl transition"
            >
              <span className="font-bold text-purple-900 block">Administrator</span>
              <span className="text-[10px] text-slate-400">admin@campus.edu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
