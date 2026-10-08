import React, { useState } from 'react';
import { useUserSearch, useUpdateUserStatus, useResetAiQuota } from '../hooks/use-users';
import { User360 } from '../core/domain/user';
import { UserCard } from '../components/users/UserCard';
import { User360View } from '../components/users/User360View';
import { Search, Users } from 'lucide-react';

export const UsersView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User360 | null>(null);

  const { data: users = [], isLoading } = useUserSearch(searchQuery);
  const updateStatusMutation = useUpdateUserStatus();
  const resetQuotaMutation = useResetAiQuota();

  const activeUser = selectedUser
    ? users.find((u) => u.id === selectedUser.id) || selectedUser
    : users[0] || null;

  const handleResetQuota = async (userId: string) => {
    const updated = await resetQuotaMutation.mutateAsync(userId);
    setSelectedUser(updated);
  };

  const handleUpdateStatus = async (
    userId: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'BANNED'
  ) => {
    const updated = await updateStatusMutation.mutateAsync({ userId, status });
    setSelectedUser(updated);
  };

  return (
    <div className="space-y-4 h-[calc(100vh-7rem)] flex flex-col">
      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by username, email, ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-indigo-400" />
          <span>{users.length} Users found</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        <div className="lg:col-span-5 xl:col-span-4 h-full overflow-y-auto space-y-2 pr-1">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-slate-900/50 border border-slate-800 rounded-xl animate-pulse"
                />
              ))}
            </div>
          )}

          {!isLoading && users.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">
              No users found matching "{searchQuery}".
            </div>
          )}

          {users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isSelected={activeUser?.id === user.id}
              onSelect={setSelectedUser}
            />
          ))}
        </div>

        <div className="lg:col-span-7 xl:col-span-8 h-full min-h-0">
          {activeUser ? (
            <User360View
              user={activeUser}
              onResetQuota={handleResetQuota}
              onUpdateStatus={handleUpdateStatus}
            />
          ) : (
            <div className="h-full bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500 text-sm">
              Select a user to inspect their 360 profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
