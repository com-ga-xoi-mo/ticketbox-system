import React, { useState } from 'react';
import { Search, Plus, MoreVertical } from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { useAccounts } from './hooks';
import { AccountsList } from './AccountsList';
import { CreateAccountDialog } from './CreateAccountDialog';

export const AdminAccountsPage = () => {
  const [role, setRole] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Account Management</h1>
          <p className="text-slate-400">Manage system users and permissions</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-br from-[#d0bcff] to-[#e14ef6] text-slate-900 font-semibold shadow-[0_0_15px_rgba(225,78,246,0.3)] hover:shadow-[0_0_25px_rgba(225,78,246,0.5)] border-0 transition-all duration-300"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Account
        </Button>
      </div>

      <div className="glass-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
        {/* Filter toolbar — matches Concerts design */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[var(--glass-bg)] px-3 py-2">
          {/* Search */}
          <div className="group relative min-w-[200px] flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-indigo-400" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-[#131b2e] py-1.5 pl-9 pr-3 text-sm text-white placeholder:placeholder:text-slate-500 transition-all focus:border-[#4cd7f6] focus:outline-none focus:ring-1 focus:ring-[#4cd7f6]/50"
            />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="appearance-none cursor-pointer rounded-md border border-white/10 bg-[#131b2e] py-1.5 pl-3 pr-8 text-sm text-white transition-all focus:border-[#4cd7f6] focus:outline-none focus:ring-1 focus:ring-[#4cd7f6]/50"
              >
                <option value="all">Role: All</option>
                <option value="ADMIN">Admin</option>
                <option value="ORGANIZER">Organizer</option>
                <option value="CHECKIN_STAFF">Staff</option>
                <option value="AUDIENCE">Audience</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                ▼
              </span>
            </div>

            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="appearance-none cursor-pointer rounded-md border border-white/10 bg-[#131b2e] py-1.5 pl-3 pr-8 text-sm text-white transition-all focus:border-[#4cd7f6] focus:outline-none focus:ring-1 focus:ring-[#4cd7f6]/50"
              >
                <option value="all">Status: All</option>
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                ▼
              </span>
            </div>

            <button
              onClick={() => { setSearch(''); setRole('all'); setStatus('all'); }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              title="Clear filters"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <AccountsList
            role={role === 'all' ? undefined : role}
            status={status === 'all' ? undefined : status}
            search={search}
          />
        </div>
      </div>

      <CreateAccountDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
};
