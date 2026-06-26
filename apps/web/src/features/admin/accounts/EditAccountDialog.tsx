import { useState, useEffect } from 'react';
import { useUpdateAccount } from './hooks';
import { AdminAccount, UserRole } from './api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../shared/ui/dialog';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { toast } from 'sonner';

interface EditAccountDialogProps {
  account: AdminAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_ROLES: UserRole[] = ['ADMIN', 'ORGANIZER', 'CHECKIN_STAFF', 'AUDIENCE'];

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  ORGANIZER: 'Organizer',
  CHECKIN_STAFF: 'Staff',
  AUDIENCE: 'Audience',
};

export function EditAccountDialog({ account, open, onOpenChange }: EditAccountDialogProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<UserRole[]>([]);

  const updateAccount = useUpdateAccount();

  useEffect(() => {
    if (account) {
      setDisplayName(account.displayName);
      setEmail(account.email);
      setRoles(account.roles);
    }
  }, [account]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) return;

    if (roles.length === 0) {
      toast.error('At least one role must be selected.');
      return;
    }

    if (!email.trim()) {
      toast.error('Email cannot be empty.');
      return;
    }

    updateAccount.mutate(
      { id: account.id, payload: { displayName, email, roles } },
      {
        onSuccess: () => {
          toast.success('Account updated successfully');
          onOpenChange(false);
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || err.message || 'An error occurred');
        },
      }
    );
  };

  const toggleRole = (role: UserRole) => {
    setRoles([role]);
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border border-white/10 text-white shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Account</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update information for the system account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Email *</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address..."
                className="bg-slate-800/50 border-white/10 text-white placeholder:placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Display Name *</label>
              <Input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name..."
                className="bg-slate-800/50 border-white/10 text-white placeholder:placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Role *</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold uppercase tracking-wider transition-all border ${
                      roles.includes(role)
                        ? 'bg-primary/20 border-primary text-indigo-400 shadow-[0_0_8px_rgba(76,215,246,0.3)]'
                        : 'bg-slate-800/50 border-white/10 text-slate-400 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
              {roles.length === 0 && (
                <p className="text-red-400 text-xs">At least one role must be selected.</p>
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateAccount.isPending || roles.length === 0}
            >
              {updateAccount.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
