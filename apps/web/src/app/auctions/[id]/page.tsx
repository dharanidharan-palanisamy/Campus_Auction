'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { formatINR, getTimeRemaining } from '@/lib/utils';
import { 
  Clock, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  TrendingUp, 
  CheckCircle2, 
  User as UserIcon, 
  MessageSquare, 
  Send 
} from 'lucide-react';

import { Suspense } from 'react';

export default function AuctionDetailPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">Loading auction details...</div>}>
      <AuctionDetailContent />
    </Suspense>
  );
}

function AuctionDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [auction, setAuction] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Bid form
  const [customBidAmount, setCustomBidAmount] = useState('');
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);

  // Q&A form
  const [newQuestion, setNewQuestion] = useState('');
  const [sellerAnswer, setSellerAnswer] = useState<{ [qId: string]: string }>({});

  // Countdown
  const [timeLeft, setTimeLeft] = useState({ totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isUrgent: false, isExpired: false });

  // Fetch initial details
  const fetchAuction = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/auctions/${id}`);
      const data = await res.json();
      if (data.success) {
        setAuction(data.data);
        setBids(data.data.bids || []);
        setQuestions(data.data.questions || []);
        setTimeLeft(getTimeRemaining(data.data.closingTime));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuction();
  }, [id]);

  // Live timer interval
  useEffect(() => {
    if (!auction?.closingTime) return;
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(auction.closingTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [auction?.closingTime]);

  // Socket.IO live updates
  useEffect(() => {
    const socket: Socket = io('http://localhost:4000');
    socket.emit('join_auction', id);

    socket.on('auction:bid-accepted', (payload: any) => {
      setBids((prev) => [payload.bid, ...prev]);
      setAuction((prev: any) => ({
        ...prev,
        currentLeadingBidInCents: payload.currentLeadingBidInCents,
        closingTime: payload.newClosingTime || prev.closingTime,
      }));

      if (payload.extended) {
        setSuccessMsg('⏱ Anti-sniping extension! Closing extended by 60 seconds.');
      }
    });

    return () => {
      socket.emit('leave_auction', id);
      socket.disconnect();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400 animate-pulse">
        Loading campus auction details...
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">
        Auction listing not found.
      </div>
    );
  }

  const currentPrice = auction.currentLeadingBidInCents > 0
    ? auction.currentLeadingBidInCents
    : auction.startingPriceInCents;

  const minNextBid = auction.currentLeadingBidInCents > 0
    ? auction.currentLeadingBidInCents + auction.minIncrementInCents
    : auction.startingPriceInCents;

  const isSeller = user?.id === auction.sellerId;

  // Handle Bid Placement
  const handlePlaceBid = async (amountInCents: number) => {
    if (!user) {
      setErrorMsg('Please log in with your campus account to place a bid.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmittingBid(true);

    try {
      const res = await fetch(`http://localhost:4000/api/v1/auctions/${id}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('campus_token') || ''}`,
        },
        body: JSON.stringify({
          amountInCents,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Bid rejected by auction engine.');
      } else {
        setSuccessMsg(`🎉 Your bid of ${formatINR(amountInCents)} is leading!`);
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
        setCustomBidAmount('');
        fetchAuction();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit bid.');
    } finally {
      setIsSubmittingBid(false);
    }
  };

  // Handle Q&A Question submission
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('Please log in to ask a question.');
      return;
    }
    if (!newQuestion.trim()) return;

    try {
      const res = await fetch(`http://localhost:4000/api/v1/auctions/${id}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('campus_token') || ''}`,
        },
        body: JSON.stringify({ content: newQuestion.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setQuestions([data.data, ...questions]);
        setNewQuestion('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Messages */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Photos & Details (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Main Image */}
          <div className="rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 aspect-[4/3]">
            <img
              src={auction.images?.[0]?.url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1000&q=80'}
              alt={auction.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Description & Condition */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
                  {auction.category?.name}
                </span>
                <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-1 rounded-full">
                  Condition: {auction.condition}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                {auction.title}
              </h1>
            </div>

            <div className="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed whitespace-pre-line">
              {auction.description}
            </div>

            {/* Pickup Details */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Designated Pickup Point</h4>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{auction.pickupLocation}</p>
                {auction.sellerNotes && (
                  <p className="text-xs text-slate-500 mt-1 italic">Seller note: "{auction.sellerNotes}"</p>
                )}
              </div>
            </div>

            {/* Seller Info */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  {auction.seller?.campusAlias?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="font-semibold text-slate-800">{auction.seller?.campusAlias}</span>
                  <span className="block text-[11px] text-emerald-600 font-medium">✓ Verified Student Seller</span>
                </div>
              </div>
              <span>Listed {new Date(auction.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Q&A Section */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Item Questions & Answers ({questions.length})
            </h3>

            {/* Post question form */}
            <form onSubmit={handleAskQuestion} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask the seller about wear, battery life, included items..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="flex-1 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-500 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Ask
              </button>
            </form>

            {/* Question List */}
            <div className="space-y-4 divide-y divide-slate-100">
              {questions.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">No questions asked yet. Be the first to ask!</p>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="pt-4 first:pt-0 space-y-2">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-bold text-slate-800">{q.asker?.campusAlias}</span>
                      <span className="text-slate-400">{new Date(q.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-700">{q.content}</p>

                    {/* Answers */}
                    {q.answers && q.answers.length > 0 && (
                      <div className="ml-4 pl-3 border-l-2 border-indigo-200 space-y-1">
                        {q.answers.map((ans: any) => (
                          <div key={ans.id} className="bg-indigo-50/50 p-3 rounded-xl text-xs">
                            <span className="font-bold text-indigo-900">{ans.seller?.campusAlias} (Seller): </span>
                            <span className="text-slate-700">{ans.content}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Bidding Console (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-24 bg-white p-7 rounded-3xl border border-slate-200 shadow-xl space-y-6">
            {/* Live Countdown Clock */}
            <div className={`p-4 rounded-2xl text-center flex flex-col items-center justify-center ${
              timeLeft.isExpired
                ? 'bg-slate-100 text-slate-700'
                : timeLeft.isUrgent
                ? 'bg-rose-50 border border-rose-200 text-rose-900 animate-pulse'
                : 'bg-indigo-50 border border-indigo-100 text-indigo-950'
            }`}>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-1">
                <Clock className="w-4 h-4 text-indigo-600" />
                {timeLeft.isExpired ? 'Auction Concluded' : timeLeft.isUrgent ? 'Anti-Sniping Active' : 'Time Remaining'}
              </div>
              <div className="text-3xl font-black tracking-tight">
                {timeLeft.isExpired ? (
                  'Closed'
                ) : (
                  <span>
                    {timeLeft.days > 0 && `${timeLeft.days}d `}
                    {String(timeLeft.hours).padStart(2, '0')}:
                    {String(timeLeft.minutes).padStart(2, '0')}:
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                )}
              </div>
              {!timeLeft.isExpired && (
                <span className="text-[11px] text-slate-500 mt-1">
                  Bids in last 30s automatically extend closing by 60s
                </span>
              )}
            </div>

            {/* Leading Price */}
            <div className="flex items-baseline justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {auction.currentLeadingBidInCents > 0 ? 'Current Highest Bid' : 'Starting Price'}
                </span>
                <div className="text-3xl font-black text-slate-900 mt-0.5">
                  {formatINR(currentPrice)}
                </div>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-400 block">Min. Increment</span>
                <span className="font-bold text-slate-700">+{formatINR(auction.minIncrementInCents)}</span>
              </div>
            </div>

            {/* Bidding Controls */}
            {!timeLeft.isExpired && auction.status === 'ACTIVE' && (
              <div className="space-y-4">
                {isSeller ? (
                  <div className="p-3 bg-slate-50 rounded-xl text-center text-xs font-semibold text-slate-500 border border-slate-200">
                    You are the seller of this listing. Self-bidding is prevented.
                  </div>
                ) : (
                  <>
                    {/* Quick 1-Click Minimum Bid Button */}
                    <button
                      onClick={() => handlePlaceBid(minNextBid)}
                      disabled={isSubmittingBid}
                      className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md hover:shadow-indigo-200 transition flex items-center justify-center gap-2"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Place Next Bid: {formatINR(minNextBid)}
                    </button>

                    {/* Custom Higher Bid Input */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                        <input
                          type="number"
                          placeholder={`Custom (min ${minNextBid / 100})`}
                          value={customBidAmount}
                          onChange={(e) => setCustomBidAmount(e.target.value)}
                          className="w-full pl-8 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const val = parseFloat(customBidAmount);
                          if (!isNaN(val)) handlePlaceBid(Math.round(val * 100));
                        }}
                        disabled={isSubmittingBid || !customBidAmount}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs transition"
                      >
                        Bid
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Accepted Bids History (Immutable) */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Public Bid History</span>
                <span>{bids.length} Accepted Bids</span>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 pr-1">
                {bids.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No bids placed yet. Place the first bid!</p>
                ) : (
                  bids.map((b, i) => (
                    <div key={b.id || i} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`} />
                        <div>
                          <span className="font-bold text-slate-800">{b.bidder?.campusAlias || 'Student Bidder'}</span>
                          {i === 0 && <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Leader</span>}
                          <span className="block text-[10px] text-slate-400">{new Date(b.acceptedAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <span className="font-black text-slate-900">{formatINR(b.amountInCents)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
