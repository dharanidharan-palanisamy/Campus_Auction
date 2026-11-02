'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { formatINR, getTimeRemaining } from '@/lib/utils';
import { 
  ArrowLeft,
  Clock, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  TrendingUp, 
  CheckCircle2, 
  User as UserIcon, 
  MessageSquare, 
  Send,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Loader2,
  Package
} from 'lucide-react';

import { Suspense } from 'react';
import { ImageDropzone } from '@/components/ImageDropzone';

export default function AuctionDetailPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">Loading auction details...</div>}>
      <AuctionDetailContent />
    </Suspense>
  );
}

function AuctionDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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

  // Countdown
  const [timeLeft, setTimeLeft] = useState({ totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isUrgent: false, isExpired: false });

  // Seller Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [editTitle, setEditTitle] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editCondition, setEditCondition] = useState('GOOD');
  const [editDescription, setEditDescription] = useState('');
  const [editStartingPrice, setEditStartingPrice] = useState('');
  const [editMinIncrement, setEditMinIncrement] = useState('');
  const [editPickupLocation, setEditPickupLocation] = useState('');
  const [editSellerNotes, setEditSellerNotes] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalError, setModalError] = useState('');

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

  // Fetch categories for edit form
  useEffect(() => {
    fetch('http://localhost:4000/api/v1/auctions/categories')
      .then(res => res.json())
      .then(data => {
        if (data.success) setCategories(data.data);
      })
      .catch(console.error);
  }, []);

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

  const isSeller = Boolean(user && (user.id === auction.sellerId || user.role === 'ADMIN'));
  const hasBids = bids.length > 0;

  // Open Edit Modal with current listing values
  const openEditModal = () => {
    setModalError('');
    setEditTitle(auction.title || '');
    setEditCategoryId(auction.categoryId || (categories[0]?.id ?? ''));
    setEditCondition(auction.condition || 'GOOD');
    setEditDescription(auction.description || '');
    setEditStartingPrice((auction.startingPriceInCents / 100).toString());
    setEditMinIncrement((auction.minIncrementInCents / 100).toString());
    setEditPickupLocation(auction.pickupLocation || '');
    setEditSellerNotes(auction.sellerNotes || '');
    setEditImageUrl(auction.images?.[0]?.url || '');
    setIsEditModalOpen(true);
  };

  // Submit Edit Listing
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (editTitle.trim().length < 3) {
      setModalError('Title must be at least 3 characters.');
      return;
    }
    if (editDescription.trim().length < 10) {
      setModalError('Description must be at least 10 characters.');
      return;
    }
    if (!editPickupLocation.trim()) {
      setModalError('Campus pickup location is required.');
      return;
    }

    setIsSavingEdit(true);

    try {
      const payload: any = {
        title: editTitle.trim(),
        categoryId: editCategoryId,
        condition: editCondition,
        description: editDescription.trim(),
        pickupLocation: editPickupLocation.trim(),
        sellerNotes: editSellerNotes.trim() || null,
        imageUrls: editImageUrl.trim() ? [editImageUrl.trim()] : undefined,
      };

      // Only update starting price if no bids have been placed
      if (!hasBids) {
        const parsedStart = parseFloat(editStartingPrice);
        const parsedInc = parseFloat(editMinIncrement);
        if (isNaN(parsedStart) || parsedStart <= 0) {
          setModalError('Starting price must be greater than zero.');
          setIsSavingEdit(false);
          return;
        }
        if (isNaN(parsedInc) || parsedInc <= 0) {
          setModalError('Minimum increment must be positive.');
          setIsSavingEdit(false);
          return;
        }
        payload.startingPriceInCents = Math.round(parsedStart * 100);
        payload.minIncrementInCents = Math.round(parsedInc * 100);
      }

      const res = await fetch(`http://localhost:4000/api/v1/auctions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('campus_token') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setModalError(data.message || 'Failed to update listing.');
      } else {
        setAuction(data.data);
        setSuccessMsg('Product details updated successfully!');
        setIsEditModalOpen(false);
      }
    } catch (err: any) {
      setModalError(err.message || 'Network error while updating.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Submit Delete Listing
  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`http://localhost:4000/api/v1/auctions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('campus_token') || ''}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Failed to delete listing.');
        setIsDeleteModalOpen(false);
      } else {
        // Redirect to dashboard or auctions browse
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while deleting.');
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Top Navigation & Back Button */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-4">
        <button
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else {
              router.push('/auctions');
            }
          }}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 px-3.5 py-2 rounded-xl transition shadow-sm group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back</span>
        </button>

        {/* Breadcrumb path for context */}
        {auction && (
          <nav className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <Link href="/auctions" className="hover:text-indigo-600 transition">Auctions</Link>
            <span>/</span>
            <span className="text-slate-600 font-medium truncate max-w-[180px]">{auction.category?.name || 'Item'}</span>
            <span>/</span>
            <span className="text-slate-900 font-bold truncate max-w-[220px]">{auction.title}</span>
          </nav>
        )}
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
        {/* Left Column: Photos & Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-8">
          {/* Main Image */}
          <div className="rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 aspect-[4/3] relative">
            <img
              src={auction.images?.[0]?.url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1000&q=80'}
              alt={auction.title}
              className="w-full h-full object-cover"
            />
            {isSeller && (
              <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Seller Workspace
              </div>
            )}
          </div>

          {/* Description & Condition */}
          <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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

              {/* Quick Seller Actions Header */}
              {isSeller && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={openEditModal}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition shadow-sm"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Details
                  </button>
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              )}
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
          <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Item Questions & Answers ({questions.length})</span>
            </h3>

            {/* Post question form */}
            <form onSubmit={handleAskQuestion} className="flex items-center gap-2 w-full min-w-0">
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Ask the seller about wear, battery life, included items..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full min-w-0 pl-3.5 pr-3 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 sm:px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-indigo-100"
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>Ask</span>
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
                    <p className="text-xs sm:text-sm text-slate-700 break-words">{q.content}</p>

                    {/* Answers */}
                    {q.answers && q.answers.length > 0 && (
                      <div className="ml-2 sm:ml-4 pl-2.5 sm:pl-3 border-l-2 border-indigo-200 space-y-1">
                        {q.answers.map((ans: any) => (
                          <div key={ans.id} className="bg-indigo-50/50 p-2.5 sm:p-3 rounded-xl text-xs break-words">
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
          <div className="sticky top-24 bg-white p-4 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl space-y-6">
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

            {/* Bidding Controls / Seller Action Panel */}
            {!timeLeft.isExpired && auction.status === 'ACTIVE' && (
              <div className="space-y-4">
                {isSeller ? (
                  /* Seller Management Card */
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-indigo-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-indigo-600" />
                        Seller Management
                      </span>
                      <span className="text-[11px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                        Your Listing
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
                      {!hasBids ? (
                        <p className="text-emerald-700 font-medium">
                          ✓ No bids placed yet. You can update any detail (including starting price) or delete this listing freely.
                        </p>
                      ) : (
                        <p className="text-amber-700 font-medium">
                          ⚠️ {bids.length} active bid(s) received. Starting price is locked, but you can still update product details, pickup location, or cancel the listing.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={openEditModal}
                        className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit Details
                      </button>

                      <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="py-2.5 px-3 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Listing
                      </button>
                    </div>

                    <p className="text-[11px] text-center text-slate-400">
                      Self-bidding is prevented to ensure marketplace fairness.
                    </p>
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
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <div className="relative flex-1 min-w-0">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                        <input
                          type="number"
                          placeholder={`Custom (min ${minNextBid / 100})`}
                          value={customBidAmount}
                          onChange={(e) => setCustomBidAmount(e.target.value)}
                          className="w-full min-w-0 pl-8 pr-3 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const val = parseFloat(customBidAmount);
                          if (!isNaN(val)) handlePlaceBid(Math.round(val * 100));
                        }}
                        disabled={isSubmittingBid || !customBidAmount}
                        className="shrink-0 px-4 sm:px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs transition"
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

      {/* ===================== EDIT PRODUCT MODAL ===================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 my-8 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-indigo-600" />
                  Edit Product Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your campus listing information
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Item Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category & Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Category
                  </label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Condition
                  </label>
                  <select
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="NEW">New</option>
                    <option value="LIKE_NEW">Like New</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Starting Price & Increment (Locked if bids exist) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Starting Price (₹) {hasBids && <span className="text-amber-600 font-semibold">(Locked - Bids exist)</span>}
                  </label>
                  <input
                    type="number"
                    min="1"
                    disabled={hasBids}
                    value={editStartingPrice}
                    onChange={(e) => setEditStartingPrice(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Min Increment (₹) {hasBids && <span className="text-amber-600 font-semibold">(Locked)</span>}
                  </label>
                  <input
                    type="number"
                    min="1"
                    disabled={hasBids}
                    value={editMinIncrement}
                    onChange={(e) => setEditMinIncrement(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Pickup Location */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Campus Handover Location
                </label>
                <input
                  type="text"
                  required
                  value={editPickupLocation}
                  onChange={(e) => setEditPickupLocation(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Drag & Drop Photo Uploader */}
              <ImageDropzone
                value={editImageUrl}
                onChange={setEditImageUrl}
                label="Product Photo"
                required={false}
              />

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2"
                >
                  {isSavingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== DELETE CONFIRMATION MODAL ===================== */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-900">
                Delete Listing?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-800">"{auction.title}"</strong>? 
                {hasBids ? (
                  <span className="block mt-1 text-amber-600 font-semibold">
                    Warning: This listing has {bids.length} placed bid(s). Deleting will remove all bids and notify participating bidders.
                  </span>
                ) : (
                  <span className="block mt-1">
                    This action cannot be undone. All listing details will be permanently removed.
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200 transition flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
