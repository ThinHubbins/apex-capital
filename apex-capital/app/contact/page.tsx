"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthUser } from "../../lib/supabase/use-auth-user";
import { createClient } from "../../lib/supabase/client";
import Navbar from "../../components/Navbar";
import Link from "next/link";
import {
  MessageSquare, Send, Loader2, AlertCircle, Check,
  Globe2, Mail, Clock, ChevronRight, Lock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  content: string;
  sender: "user" | "admin";
  created_at: string;
  read_at: string | null;
};

// ─── Static content ───────────────────────────────────────────────────────────

const contactCards = [
  {
    icon: Mail,
    title: "Email Support",
    description: "For non-urgent queries, email us and we'll respond within 24 hours.",
    value: "support@apexcapital.com",
    href: "mailto:support@apexcapital.com",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-700",
  },
  {
    icon: Clock,
    title: "Support Hours",
    description: "Live chat is monitored Monday–Friday, 9am–6pm EST.",
    value: "Currently: Mon–Fri, 9am–6pm EST",
    href: null,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-700",
  },
];

// ─── Chat bubble ─────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.sender === "user";
  const time = new Date(msg.created_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] space-y-1 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 px-1">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1a6b3c]">
              <span className="text-[9px] font-bold text-white">A</span>
            </div>
            <span className="text-[11px] font-medium text-[#6B7280]">Apex Support</span>
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-[#111827] text-white"
              : "rounded-tl-sm border border-[#E5E5E2] bg-white text-[#111827]"
          }`}
        >
          {msg.content}
        </div>
        <div className={`flex items-center gap-1 px-1 ${isUser ? "flex-row-reverse" : ""}`}>
          <span className="text-[11px] text-[#9CA3AF]">{time}</span>
          {isUser && msg.read_at && (
            <span className="text-[11px] text-[#1a6b3c]">
              <Check className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chat skeleton ────────────────────────────────────────────────────────────

function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[false, true, false, true].map((right, i) => (
        <div key={i} className={`flex ${right ? "justify-end" : "justify-start"}`}>
          <div
            className={`h-10 animate-pulse rounded-2xl bg-[#E5E5E2] ${
              right ? "w-48" : "w-64"
            }`}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Locked / not logged in state ────────────────────────────────────────────

function ChatLocked() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3F4F6]">
        <Lock className="h-5 w-5 text-[#9CA3AF]" />
      </div>
      <div>
        <p className="text-[14px] font-semibold text-[#111827]">Sign in to chat</p>
        <p className="mt-1 text-[13px] text-[#6B7280]">
          Live chat is available to registered users only.
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href="/login"
          className="rounded-lg bg-[#111827] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90"
        >
          Sign in
        </Link>
        <Link
          href="/create-account"
          className="rounded-lg border border-[#E5E5E2] bg-white px-4 py-2 text-[13px] font-medium text-[#111827] hover:bg-[#F7F7F5]"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}

// ─── Live Chat Widget ─────────────────────────────────────────────────────────

function LiveChat({ userId, fullName, email }: { userId: string; fullName: string | null; email: string | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  // Fetch message history
  useEffect(() => {
    let cancelled = false;
    async function fetchMessages() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("support_messages")
          .select("id, content, sender, created_at, read_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });
        if (cancelled) return;
        if (err) throw err;
        setMessages(data ?? []);
      } catch {
        if (!cancelled) setError("Couldn't load messages. Please refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchMessages();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`support-chat-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_messages",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setInput("");
    try {
      const { error: err } = await supabase.from("support_messages").insert({
        user_id: userId,
        full_name: fullName,
        email: email,
        content,
        sender: "user",
      });
      if (err) throw err;
    } catch {
      setError("Failed to send. Please try again.");
      setInput(content); // restore
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {loading ? (
          <ChatSkeleton />
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-2 text-[13px] text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F7F2]">
              <MessageSquare className="h-5 w-5 text-[#1a6b3c]" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#111827]">Start a conversation</p>
              <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
                Our team typically replies within a few hours.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[#E5E5E2] bg-white p-3 sm:p-4">
        {error && !loading && (
          <p className="mb-2 text-[12px] text-red-500">{error}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
  ref={inputRef}
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="Type a message… (Enter to send)"
  rows={1}
  className="flex-1 resize-none rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] px-3.5 py-2.5 text-[13px] text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#111827] focus:bg-white overflow-y-hidden"
  style={{ maxHeight: "120px" }}
  onInput={(e) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 120);
    el.style.height = next + "px";
    el.style.overflowY = el.scrollHeight > 120 ? "auto" : "hidden";
  }}
/>
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-right text-[11px] text-[#9CA3AF]">
          Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const { isLoggedIn, user } = useAuthUser();

  const userId  = user?.id ?? null;
  const email   = user?.email ?? null;
  // Adjust this if your profile uses a different field
  const fullName = (user as { user_metadata?: { full_name?: string } } | null)
    ?.user_metadata?.full_name ?? null;

  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
      <Navbar variant="public" />

      <main className="px-6 py-16 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-6xl">

          {/* Header */}
          <div className="mb-12">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
              Contact
            </p>
            <h1 className="mt-2 text-[36px] font-extrabold tracking-[-0.02em] text-[#111827] sm:text-[44px]">
              We're here to help
            </h1>
            <p className="mt-4 max-w-md text-[14px] leading-relaxed text-[#6B7280]">
              Reach us through live chat for the fastest response, or use any
              of the options below.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_420px]">

            {/* Left — info cards + FAQ teaser */}
            <div className="space-y-4">
              {contactCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-xl border border-[#E5E5E2] bg-white p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                      <card.icon className={`h-5 w-5 ${card.iconColor}`} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14px] font-semibold text-[#111827]">{card.title}</h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">
                        {card.description}
                      </p>
                      {card.href ? (
                        <a
                          href={card.href}
                          className="mt-2 inline-block text-[13px] font-medium text-[#111827] hover:underline"
                        >
                          {card.value}
                        </a>
                      ) : (
                        <p className="mt-2 text-[13px] font-medium text-[#111827]">{card.value}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* FAQ nudge */}
              <Link
                href="/#faq"
                className="group flex items-center justify-between rounded-xl border border-[#E5E5E2] bg-[#F0F0ED] p-5 transition-colors hover:border-[#111827]"
              >
                <div>
                  <p className="text-[14px] font-semibold text-[#111827]">
                    Check our FAQ first
                  </p>
                  <p className="mt-0.5 text-[13px] text-[#6B7280]">
                    Many common questions are already answered there.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Right — Live Chat */}
            <div className="flex flex-col">
              <div className="overflow-hidden rounded-2xl border border-[#E5E5E2] bg-white shadow-sm" style={{ height: "560px" }}>

                {/* Chat header */}
                <div className="flex items-center justify-between border-b border-[#E5E5E2] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#1a6b3c]">
                      <span className="text-[13px] font-bold text-white">A</span>
                      <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#22c55e]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#111827]">Apex Support</p>
                      <p className="text-[11px] text-[#1a6b3c]">● Online</p>
                    </div>
                  </div>
                  <MessageSquare className="h-4 w-4 text-[#9CA3AF]" />
                </div>

                {/* Chat body */}
                <div className="h-[calc(560px-69px)]">
                  {!isLoggedIn || !userId ? (
                    <ChatLocked />
                  ) : (
                    <LiveChat userId={userId} fullName={fullName} email={email} />
                  )}
                </div>
              </div>

              <p className="mt-3 text-center text-[11px] text-[#9CA3AF]">
                Messages are encrypted and stored securely.
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}