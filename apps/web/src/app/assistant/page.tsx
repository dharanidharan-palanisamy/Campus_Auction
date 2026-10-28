'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { formatINR } from '@/lib/utils';
import { Sparkles, Send, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

interface Proposal {
  action: string;
  listingId: string;
  title: string;
  currentLeadingBid: number;
  minAcceptable: number;
  proposedAmountInCents: number;
  isEligible: boolean;
  requiresConfirmation: boolean;
}

export default function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; proposal?: Proposal }>>([
    {
      sender: 'assistant',
      text: `Hello ${user?.campusAlias || 'there'}! I am your Campus Auction Assistant. You can ask me to find items under your budget (e.g. "Find a bicycle under ₹3,000") or prepare a safe bid proposal for you (e.g. "Prepare bid of 2800 on mountain bike").`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmedBids, setConfirmedBids] = useState<{ [listingId: string]: boolean }>({});

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/api/v1/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('campus_token') || ''}`,
        },
        body: JSON.stringify({ message: userText }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { sender: 'assistant', text: data.reply, proposal: data.proposal },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'assistant', text: 'Sorry, I encountered an issue analyzing the auctions.' },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: 'Unable to reach the campus assistant service right now.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBid = async (proposal: Proposal) => {
    try {
      const res = await fetch('http://localhost:4000/api/v1/assistant/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('campus_token') || ''}`,
        },
        body: JSON.stringify({
          listingId: proposal.listingId,
          amountInCents: proposal.proposedAmountInCents,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setConfirmedBids((prev) => ({ ...prev, [proposal.listingId]: true }));
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: `✅ Authorized & Placed! Your bid of ${formatINR(proposal.proposedAmountInCents)} on "${proposal.title}" has been accepted by the engine.`,
          },
        ]);
      } else {
        alert(data.message || 'Bid confirmation failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[750px]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">Campus Auction Assistant</h2>
              <p className="text-xs text-slate-500">Natural language search & verified bid proposals</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/80 px-2.5 py-1 rounded-full">
              Strict Confirmation Guard
            </span>
          </div>
        </div>

        {/* Chat message history */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-100'
                    : 'bg-slate-100 text-slate-800 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-line">{m.text}</div>

                {/* Structured Bid Proposal Card with Explicit Confirmation */}
                {m.proposal && (
                  <div className="mt-4 p-4 rounded-xl bg-white border border-indigo-200 text-slate-900 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                        Structured Bid Proposal
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Requires Confirmation
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{m.proposal.title}</h4>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Leading Bid</span>
                          <span className="font-bold text-slate-700">{formatINR(m.proposal.currentLeadingBid)}</span>
                        </div>
                        <div className="bg-indigo-50 p-2 rounded-lg">
                          <span className="text-indigo-600 block text-[10px] uppercase font-bold">Proposed Bid</span>
                          <span className="font-black text-indigo-950 text-sm">{formatINR(m.proposal.proposedAmountInCents)}</span>
                        </div>
                      </div>
                    </div>

                    {confirmedBids[m.proposal.listingId] ? (
                      <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Proposal Confirmed & Executed
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConfirmBid(m.proposal!)}
                        className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                      >
                        Authorize & Place Bid: {formatINR(m.proposal.proposedAmountInCents)}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs italic">
              <Sparkles className="w-4 h-4 animate-spin text-indigo-500" />
              Assistant is searching verified campus auctions...
            </div>
          )}
        </div>

        {/* Input prompt */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white flex gap-2">
          <input
            type="text"
            placeholder="e.g., 'Find calculators below ₹800' or 'Bid 2800 on mountain bike'..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-4 py-3 text-sm bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 rounded-2xl font-bold text-sm shadow-md transition flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
