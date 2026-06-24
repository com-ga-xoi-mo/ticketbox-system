import { useState } from 'react';
import { useUpdateAccountStatus } from './hooks';
import { AdminAccount } from './api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../shared/ui/dialog';
import { Button } from '../../../shared/ui/button';
import { FieldError } from '../../../shared/ui/FieldError';

interface ChangeStatusDialogProps {
  account: AdminAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangeStatusDialog({ account, open, onOpenChange }: ChangeStatusDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const updateStatus = useUpdateAccountStatus();

  if (!account) return null;

  const isActive = account.status === 'ACTIVE';
  const newStatus = isActive ? 'DISABLED' : 'ACTIVE';

  const handleConfirm = () => {
    setError(null);
    updateStatus.mutate(
      { id: account.id, payload: { status: newStatus } },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
        onError: (err) => {
          setError(err.message || 'Failed to update account status.');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isActive ? 'Deactivate Account' : 'Reactivate Account'}</DialogTitle>
          <DialogDescription>
            {isActive ? (
              <>
                Are you sure you want to deactivate <strong>{account.displayName}</strong>? 
                This is a soft delete. The user will be blocked from logging in, 
                and any active check-in assignments will be revoked.
              </>
            ) : (
              <>
                Are you sure you want to reactivate <strong>{account.displayName}</strong>? 
                The user will be able to log in again.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {error && <FieldError message={error} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="button" 
            variant={isActive ? 'destructive' : 'default'} 
            onClick={handleConfirm}
            disabled={updateStatus.isPending}
          >
            {updateStatus.isPending ? 'Processing...' : isActive ? 'Deactivate' : 'Reactivate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
