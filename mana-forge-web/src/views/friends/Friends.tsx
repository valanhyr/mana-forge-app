import { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  UserMinus,
  Check,
  X,
  Search,
  Clock,
  UserCheck,
  Rss,
} from "lucide-react";
import {
  FriendService,
  type FriendUser,
  type ReceivedRequest,
  type SentRequest,
} from "../../services/FriendService";
import { FollowService } from "../../services/FollowService";
import { useToast } from "../../services/ToastContext";
import { useTranslation } from "../../hooks/useTranslation";
import ForgeSpinner from "../../components/ui/ForgeSpinner";

type Tab = "friends" | "requests";

export default function Friends() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [received, setReceived] = useState<ReceivedRequest[]>([]);
  const [sent, setSent] = useState<SentRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [pendingFollow, setPendingFollow] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [f, r, s] = await Promise.all([
        FriendService.getFriends(),
        FriendService.getReceivedRequests(),
        FriendService.getSentRequests(),
      ]);
      setFriends(f);
      setReceived(r);
      setSent(s);
      const following = await FollowService.getFollowing();
      setFollowingIds(new Set(following.map((u: FriendUser) => u.userId)));
    } catch {
      showToast(t("friends.loadError"), "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await FriendService.searchUsers(searchQuery);
        setSearchResults(results);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSendRequest = async (userId: string) => {
    setPendingAction(userId);
    try {
      await FriendService.sendRequest(userId);
      showToast(t("friends.requestSent"), "success");
      setSearchResults((prev) => prev.filter((u) => u.userId !== userId));
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.status === 409
        ? t("friends.alreadyExists")
        : t("friends.requestError");
      showToast(msg, "error");
    } finally {
      setPendingAction(null);
    }
  };

  const handleAccept = async (requestId: string) => {
    setPendingAction(requestId);
    try {
      await FriendService.acceptRequest(requestId);
      showToast(t("friends.requestAccepted"), "success");
      await loadData();
    } catch {
      showToast(t("friends.requestError"), "error");
    } finally {
      setPendingAction(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setPendingAction(requestId);
    try {
      await FriendService.deleteRequest(requestId);
      showToast(t("friends.requestRejected"), "info");
      await loadData();
    } catch {
      showToast(t("friends.requestError"), "error");
    } finally {
      setPendingAction(null);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    setPendingAction(friendId);
    try {
      await FriendService.removeFriend(friendId);
      showToast(t("friends.friendRemoved"), "info");
      await loadData();
    } catch {
      showToast(t("friends.requestError"), "error");
    } finally {
      setPendingAction(null);
    }
  };

  const handleToggleFollow = async (userId: string) => {
    setPendingFollow(userId);
    try {
      if (followingIds.has(userId)) {
        await FollowService.unfollow(userId);
        setFollowingIds((prev) => { const s = new Set(prev); s.delete(userId); return s; });
      } else {
        await FollowService.follow(userId);
        setFollowingIds((prev) => new Set([...prev, userId]));
      }
    } catch {
      showToast(t("friends.followError"), "error");
    } finally {
      setPendingFollow(null);
    }
  };

  const friendIds = new Set(friends.map((f) => f.userId));
  const sentIds = new Set(sent.map((s) => s.receiver.userId));

  return (
    <div className="min-h-screen bg-zinc-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users size={28} className="text-orange-500" />
            {t("friends.title")}
          </h1>
          <p className="text-zinc-400 mt-1">{t("friends.subtitle")}</p>
        </div>

        {/* Search */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("friends.searchPlaceholder")}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-zinc-600"
            />
          </div>

          {/* Search results */}
          {searchQuery.length >= 2 && (
            <div className="mt-3 space-y-2">
              {isSearching ? (
                <p className="text-zinc-500 text-sm text-center py-2">{t("common.loading")}</p>
              ) : searchResults.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-2">{t("friends.noResults")}</p>
              ) : (
                searchResults.map((user) => {
                  const isFriend = friendIds.has(user.userId);
                  const isPending = sentIds.has(user.userId);
                  return (
                    <div key={user.userId} className="flex items-center justify-between bg-zinc-800/50 rounded-xl px-4 py-2.5">
                      <div>
                        <p className="text-white text-sm font-medium">{user.username}</p>
                        {user.biography && <p className="text-zinc-500 text-xs truncate max-w-xs">{user.biography}</p>}
                      </div>
                      {isFriend ? (
                        <span className="text-xs text-green-400 flex items-center gap-1"><UserCheck size={14} />{t("friends.alreadyFriend")}</span>
                      ) : isPending ? (
                        <span className="text-xs text-zinc-400 flex items-center gap-1"><Clock size={14} />{t("friends.pending")}</span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(user.userId)}
                          disabled={pendingAction === user.userId}
                          className="flex items-center gap-1 text-xs bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <UserPlus size={14} />
                          {t("friends.addFriend")}
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleFollow(user.userId)}
                        disabled={pendingFollow === user.userId}
                        className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          followingIds.has(user.userId)
                            ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <Rss size={14} />
                        {followingIds.has(user.userId) ? t("friends.unfollow") : t("friends.follow")}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-6">
          {(["friends", "requests"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === tab
                  ? "bg-orange-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab === "friends" ? <Users size={16} /> : <UserPlus size={16} />}
              {t(`friends.tab.${tab}`)}
              {tab === "requests" && received.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {received.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-16"><ForgeSpinner /></div>
        ) : activeTab === "friends" ? (
          <FriendsList
            friends={friends}
            pendingAction={pendingAction}
            onRemove={handleRemoveFriend}
            followingIds={followingIds}
            pendingFollow={pendingFollow}
            onToggleFollow={handleToggleFollow}
            t={t}
          />
        ) : (
          <RequestsList
            received={received}
            sent={sent}
            pendingAction={pendingAction}
            onAccept={handleAccept}
            onReject={handleReject}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FriendsList({ friends, pendingAction, onRemove, followingIds, pendingFollow, onToggleFollow, t }: {
  friends: FriendUser[];
  pendingAction: string | null;
  onRemove: (id: string) => void;
  followingIds: Set<string>;
  pendingFollow: string | null;
  onToggleFollow: (id: string) => void;
  t: (key: string) => string;
}) {
  if (friends.length === 0) {
    return (
      <EmptyState icon={<Users size={40} />} text={t("friends.noFriends")} />
    );
  }
  return (
    <div className="space-y-3">
      {friends.map((f) => (
        <div key={f.userId} className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-medium">{f.username}</p>
            {f.biography && <p className="text-zinc-500 text-sm mt-0.5">{f.biography}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFollow(f.userId)}
              disabled={pendingFollow === f.userId}
              className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                followingIds.has(f.userId)
                  ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
              }`}
            >
              <Rss size={14} />
              {followingIds.has(f.userId) ? t("friends.unfollow") : t("friends.follow")}
            </button>
            <button
              onClick={() => onRemove(f.userId)}
              disabled={pendingAction === f.userId}
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <UserMinus size={16} />
              {t("friends.remove")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RequestsList({ received, sent, pendingAction, onAccept, onReject, t }: {
  received: ReceivedRequest[];
  sent: SentRequest[];
  pendingAction: string | null;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-6">
      {/* Received */}
      <div>
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">
          {t("friends.received")} {received.length > 0 && `(${received.length})`}
        </h2>
        {received.length === 0 ? (
          <EmptyState icon={<Check size={32} />} text={t("friends.noReceived")} />
        ) : (
          <div className="space-y-3">
            {received.map((req) => (
              <div key={req.requestId} className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{req.sender.username}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{new Date(req.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onAccept(req.requestId)}
                    disabled={pendingAction === req.requestId}
                    className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Check size={14} />{t("friends.accept")}
                  </button>
                  <button
                    onClick={() => onReject(req.requestId)}
                    disabled={pendingAction === req.requestId}
                    className="flex items-center gap-1 bg-zinc-700 hover:bg-zinc-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X size={14} />{t("friends.reject")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sent */}
      <div>
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">
          {t("friends.sent")}
        </h2>
        {sent.length === 0 ? (
          <EmptyState icon={<Clock size={32} />} text={t("friends.noSent")} />
        ) : (
          <div className="space-y-3">
            {sent.map((req) => (
              <div key={req.requestId} className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{req.receiver.username}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{new Date(req.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => onReject(req.requestId)}
                  disabled={pendingAction === req.requestId}
                  className="flex items-center gap-1 text-sm text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  <X size={14} />{t("friends.cancel")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
      <div className="mb-3 opacity-40">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
