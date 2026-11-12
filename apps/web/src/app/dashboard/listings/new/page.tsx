'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PlusCircle, Upload, CheckCircle2, AlertCircle, Sparkles, TrendingUp, HelpCircle } from 'lucide-react';
import { ImageDropzone } from '@/components/ImageDropzone';
import { API_BASE } from '@/lib/api';

export default function CreateListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [startingPrice, setStartingPrice] = useState('500');
  const [minIncrement, setMinIncrement] = useState('50');
  const [durationHours, setDurationHours] = useState('24');
  const [pickupLocation, setPickupLocation] = useState('Main Campus Library Entrance');
  const [imageUrl, setImageUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // AI Smart Price Estimator State
  const [isEstimating, setIsEstimating] = useState(false);
  const [aiEstimate, setAiEstimate] = useState<{
    estimatedResalePrice: { min: number; max: number; median: number };
    recommendedStartingPrice: number;
    recommendedMinIncrement: number;
    demandLevel: string;
    confidenceScore: number;
    rationale: string;
  } | null>(null);

  const runPriceEstimator = async () => {
    if (!title || title.trim().length < 2) {
      setErrorMsg('Please enter an item title first to get AI price estimates.');
      return;
    }
    setErrorMsg('');
    setIsEstimating(true);
    try {
      const res = await fetch(`${API_BASE}/auctions/estimate-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          categoryId,
          condition,
          description,
          imageUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAiEstimate(data.data);
      } else {
        setErrorMsg(data.message || 'Could not calculate price estimate.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error connecting to price estimator');
    } finally {
      setIsEstimating(false);
    }
  };

  const applyAiPricing = () => {
    if (!aiEstimate) return;
    setStartingPrice(aiEstimate.recommendedStartingPrice.toString());
    setMinIncrement(aiEstimate.recommendedMinIncrement.toString());
  };

  useEffect(() => {
    fetch(`${API_BASE}/auctions/categories`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.length > 0) {
          setCategories(data.data);
          setCategoryId(data.data[0].id);
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('You must log in to create an auction listing.');
      return;
    }
    setErrorMsg('');

    // Frontend validation before submitting
    if (description.trim().length < 10) {
      setErrorMsg('Description must be at least 10 characters. Please describe the item in detail.');
      return;
    }
    if (title.trim().length < 3) {
      setErrorMsg('Title must be at least 3 characters.');
      return;
    }
    if (!imageUrl || !imageUrl.trim()) {
      setErrorMsg('Please upload or drag & drop a product photo.');
      return;
    }

    setLoading(true);

    try {
      const closingTime = new Date(Date.now() + parseInt(durationHours, 10) * 3600 * 1000).toISOString();

      const res = await fetch(`${API_BASE}/auctions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('campus_token') || ''}`,
        },
        body: JSON.stringify({
          title,
          categoryId,
          description,
          condition,
          startingPriceInCents: Math.round(parseFloat(startingPrice) * 100),
          minIncrementInCents: Math.round(parseFloat(minIncrement) * 100),
          closingTime,
          pickupLocation,
          imageUrls: [imageUrl],
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push(`/auctions/${data.data.id}`);
      } else {
        // Parse Zod validation error arrays into readable messages
        let errText: string = data.message || 'Failed to create listing';
        try {
          const parsed = JSON.parse(data.message);
          if (Array.isArray(parsed)) {
            errText = parsed
              .map((e: any) => {
                const field = e.path?.join('.') || 'field';
                return `${field}: ${e.message}`;
              })
              .join(' • ');
          }
        } catch {}
        setErrorMsg(errText);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">List an Item for Campus Auction</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create an anti-sniping auction listing with verified student pickup
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-sm">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Item Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Hero Sprint 26T Mountain Bicycle / Casio fx-991EX"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
              >
                <option value="NEW">New</option>
                <option value="LIKE_NEW">Like New</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Description</label>
            <textarea
              required
              rows={4}
              placeholder="Describe age, wear and tear, included accessories, or why you're selling..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* AI Smart Price Estimator Widget */}
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">AI Smart Price Estimator</h3>
                  <p className="text-[11px] text-slate-500">Predict fair campus resale value based on historical sales & condition</p>
                </div>
              </div>
              <button
                type="button"
                onClick={runPriceEstimator}
                disabled={isEstimating || !title}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
              >
                {isEstimating ? (
                  <>Analyzing Market...</>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Estimate Fair Price
                  </>
                )}
              </button>
            </div>

            {aiEstimate && (
              <div className="bg-white/80 backdrop-blur-sm border border-indigo-100 rounded-xl p-3.5 text-xs space-y-3 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Estimated Resale</span>
                    <span className="text-sm font-black text-slate-800">₹{aiEstimate.estimatedResalePrice.min} - ₹{aiEstimate.estimatedResalePrice.max}</span>
                  </div>
                  <div className="bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 block">Suggested Start</span>
                    <span className="text-sm font-black text-indigo-700">₹{aiEstimate.recommendedStartingPrice}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Min Increment</span>
                    <span className="text-sm font-black text-slate-800">₹{aiEstimate.recommendedMinIncrement}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Demand Index</span>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black ${
                      aiEstimate.demandLevel === 'HIGH' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {aiEstimate.demandLevel} DEMAND
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed italic">
                  💡 {aiEstimate.rationale}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-indigo-50">
                  <span className="text-[10px] text-slate-400">AI Confidence: {aiEstimate.confidenceScore}% (Estimated values are recommendations)</span>
                  <button
                    type="button"
                    onClick={applyAiPricing}
                    className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-lg transition text-xs flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Apply Suggested Pricing
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Starting Price (₹)</label>
              <input
                type="number"
                required
                min="1"
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Min Increment (₹)</label>
              <input
                type="number"
                required
                min="1"
                value={minIncrement}
                onChange={(e) => setMinIncrement(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Duration (Hours)</label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
              >
                <option value="2">2 Hours (Fast Auction)</option>
                <option value="6">6 Hours</option>
                <option value="24">24 Hours (1 Day)</option>
                <option value="48">48 Hours (2 Days)</option>
                <option value="72">72 Hours (3 Days)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Campus Handover Location</label>
            <input
              type="text"
              required
              placeholder="e.g. Hostel 4 Entrance / Library Lawn / Main Gate"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Drag & Drop Photo Uploader */}
          <ImageDropzone
            value={imageUrl}
            onChange={setImageUrl}
            label="Product Photo"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Publish Campus Auction
          </button>
        </form>
      </div>
    </div>
  );
}
