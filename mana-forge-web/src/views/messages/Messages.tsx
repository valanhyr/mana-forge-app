import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, MessageCircle, Loader2, ArrowLeft } from 'lucide-react';
import { MessageService, type Conversation, type ChatMessage } from '../../services/MessageService';
import { useUser } from '../../services/UserContext';
import { useToast } from '../../services/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { getAvatarUrl } from '../../core/utils/avatar';

const POLL_INTERVAL = 5000;

function formatTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return formatTime(iso);
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

export default function Messages() {
  const { friendId } = useParams<{ friendId?: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAtBottom = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (force = false) => {
    if (force || isAtBottom.current) {
      const el = scrollContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  };

  const handleMessagesScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadConversations = useCallback(async () => {
    try {
      const data = await MessageService.getConversations();
      setConversations(data);
    } catch {
      // silent poll failure
    } finally {
      setIsLoadingConvs(false);
    }
  }, []);

  const loadMessages = useCallback(async (fId: string, silent = false) => {
    if (!silent) setIsLoadingMsgs(true);
    try {
      const data = await MessageService.getConversation(fId);
      setMessages(data);
      await MessageService.markAsRead(fId);
      setConversations((prev) =>
        prev.map((c) => (c.friendId === fId ? { ...c, unreadCount: 0 } : c))
      );
    } catch {
      if (!silent) showToast(t('messages.loadError'), 'error');
    } finally {
      if (!silent) setIsLoadingMsgs(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!friendId) return;
    isAtBottom.current = true;
    loadMessages(friendId);
  }, [friendId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      loadConversations();
      if (friendId) loadMessages(friendId, true);
    }, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [friendId, loadConversations, loadMessages]);

  const handleSend = async () => {
    if (!friendId || !inputValue.trim()) return;
    setIsSending(true);
    try {
      const msg = await MessageService.sendMessage(friendId, inputValue.trim());
      setMessages((prev) => [...prev, msg]);
      setInputValue('');
      isAtBottom.current = true;
      scrollToBottom(true);
      loadConversations();
    } catch {
      showToast(t('messages.sendError'), 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeConv = conversations.find((c) => c.friendId === friendId);

  // ── Conversation list panel ──────────────────────────────────────────────
  const ConversationList = (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="px-4 py-4 border-b border-zinc-800">
        <h1 className="text-xl font-bold text-white">{t('messages.title')}</h1>
      </div>

      {isLoadingConvs ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-orange-500" size={32} />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
          <MessageCircle size={40} className="mb-3 opacity-30" />
          <p className="text-sm">{t('messages.noFriendsToMessage')}</p>
        </div>
      ) : (
        <ul className="overflow-y-auto flex-1">
          {conversations.map((conv) => (
            <li key={conv.friendId}>
              <button
                onClick={() => navigate(`/messages/${conv.friendId}`)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800 active:bg-zinc-700 ${
                  friendId === conv.friendId ? 'bg-zinc-800 border-l-2 border-orange-500' : ''
                }`}
              >
                <img
                  src={getAvatarUrl(conv.friend.avatar)}
                  alt={conv.friend.username}
                  className="w-11 h-11 rounded-full border border-orange-500/40 object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-white truncate">
                      {conv.friend.name || conv.friend.username}
                    </span>
                    <span className="text-xs text-zinc-500 shrink-0 ml-2">
                      {formatDate(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-xs text-zinc-400 truncate">
                      {(conv.lastMessage as ChatMessage)?.content || ''}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 shrink-0 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  // ── Chat panel ───────────────────────────────────────────────────────────
  const ChatPanel = (
    <div className="flex flex-col h-full bg-zinc-950">
      {!friendId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
          <MessageCircle size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">{t('messages.noConversation')}</p>
          <p className="text-sm opacity-60 mt-1">{t('messages.noConversationHint')}</p>
        </div>
      ) : (
        <>
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3 shrink-0">
            {/* Back button — only on mobile */}
            <button
              onClick={() => navigate('/messages')}
              className="md:hidden p-1.5 -ml-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Volver"
            >
              <ArrowLeft size={20} />
            </button>
            <img
              src={getAvatarUrl(activeConv?.friend.avatar)}
              alt={activeConv?.friend.username}
              className="w-9 h-9 rounded-full border border-orange-500/40 object-cover shrink-0"
            />
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">
                {activeConv?.friend.name || activeConv?.friend.username}
              </p>
              <p className="text-zinc-500 text-xs truncate">@{activeConv?.friend.username}</p>
            </div>
          </div>

          {/* Messages area */}
          <div
            ref={scrollContainerRef}
            onScroll={handleMessagesScroll}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          >
            {isLoadingMsgs ? (
              <div className="flex justify-center pt-8">
                <Loader2 className="animate-spin text-orange-500" size={28} />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-zinc-500 text-sm pt-8">{t('messages.empty')}</p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === user?.userId;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] sm:max-w-sm lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-orange-500 text-white rounded-br-sm'
                          : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                      }`}
                    >
                      <p className="break-words">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${isMe ? 'text-orange-200' : 'text-zinc-500'} text-right`}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-zinc-800 flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('messages.placeholder')}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={isSending || !inputValue.trim()}
              className="p-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shrink-0"
            >
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </>
      )}
    </div>
  );

  // ── Layout ───────────────────────────────────────────────────────────────
  // Mobile: show either list or chat (full screen)
  // Desktop (md+): side-by-side
  return (
    <>
      {/* ── MOBILE layout ── */}
      <div className="md:hidden h-[calc(100dvh-64px)] flex flex-col">
        {friendId ? ChatPanel : ConversationList}
      </div>

      {/* ── DESKTOP layout ── */}
      <div className="hidden md:flex max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-120px)] flex-col">
        <h1 className="text-2xl font-bold text-white mb-6">{t('messages.title')}</h1>
        <div className="flex flex-1 gap-4 overflow-hidden rounded-2xl border border-zinc-800">
          {/* Sidebar */}
          <div className="w-72 shrink-0 overflow-hidden">{ConversationList}</div>
          {/* Chat */}
          <div className="flex-1 overflow-hidden">{ChatPanel}</div>
        </div>
      </div>
    </>
  );
}
