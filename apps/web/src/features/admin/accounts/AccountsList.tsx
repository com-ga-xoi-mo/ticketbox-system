import React, { useState, useEffect } from 'react';
import { useAccounts } from './hooks';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Pagination } from '../../../shared/ui/pagination';
import { EditAccountDialog } from './EditAccountDialog';
import { ChangeStatusDialog } from './ChangeStatusDialog';
import { resolveAvatarImageUrl } from '../../../shared/api/client';

interface AccountsListProps {
  role?: string;
  status?: string;
  search?: string;
}

const PAGE_SIZE = 10;

export const AccountsList = ({ role, status, search }: AccountsListProps) => {
  const { data: accounts, isLoading } = useAccounts(role, status);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [statusChangeAccount, setStatusChangeAccount] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [role, status, search]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading...</div>;
  }

  const filteredAccounts = accounts?.filter((acc: any) => {
    if (!search) return true;
    const lowerSearch = search.toLowerCase();
    return (
      acc.displayName?.toLowerCase().includes(lowerSearch) ||
      acc.email?.toLowerCase().includes(lowerSearch) ||
      acc.phone?.includes(lowerSearch)
    );
  }) || [];

  const totalItems = filteredAccounts.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const paginatedAccounts = filteredAccounts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-slate-900/40 uppercase tracking-[0.05em] text-xs font-mono">
              <th className="p-4 font-medium text-slate-400">Display Name</th>
              <th className="p-4 font-medium text-slate-400">Email</th>
              <th className="p-4 font-medium text-slate-400">Phone</th>
              <th className="p-4 font-medium text-slate-400">Role</th>
              <th className="p-4 font-medium text-slate-400">Status</th>
              <th className="p-4 font-medium text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAccounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-slate-400">
                  No accounts found.
                </td>
              </tr>
            ) : (
              paginatedAccounts.map((account: any) => (
                <tr key={account.id} className="hover:bg-white/5 transition-colors group border-b-0">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 shrink-0 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10">
                        {resolveAvatarImageUrl(account.avatarAssetId, account.avatarUrl) ? (
                          <img src={resolveAvatarImageUrl(account.avatarAssetId, account.avatarUrl)} alt={account.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-xs font-medium text-white">
                            {account.displayName ? account.displayName.substring(0, 2).toUpperCase() : account.email.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="font-medium text-sm leading-5 text-white">{account.displayName || '—'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm leading-5 text-slate-400">{account.email}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm leading-5 text-slate-400">{account.phone || '—'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {account.roles?.map((r: string) => <RoleBadge key={r} role={r} />)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={account.status} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs bg-transparent border-white/10 hover:bg-white/5 hover:text-white"
                        onClick={() => setEditingAccount(account)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs bg-transparent border-white/10 hover:bg-white/5 hover:text-white"
                        onClick={() => setStatusChangeAccount(account)}
                      >
                        Change Status
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />

      {editingAccount && (
        <EditAccountDialog
          account={editingAccount}
          open={!!editingAccount}
          onOpenChange={(open) => !open && setEditingAccount(null)}
        />
      )}

      {statusChangeAccount && (
        <ChangeStatusDialog
          account={statusChangeAccount}
          open={!!statusChangeAccount}
          onOpenChange={(open) => !open && setStatusChangeAccount(null)}
        />
      )}
    </>
  );
};

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant="outline" className="bg-slate-800/80 text-slate-400 border-white/10 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md">
      {role}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'ACTIVE';
  return (
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#4cd7f6] shadow-[0_0_8px_#4cd7f6]' : 'bg-on-surface-variant/50'}`} />
      <span className={`font-mono text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-[#4cd7f6]' : 'text-slate-400'}`}>
        {isActive ? 'ACTIVE' : 'DISABLED'}
      </span>
    </div>
  );
}
