import { useState } from 'react';
import { useUpdateAccountStatus } from './hooks';
import { AdminAccount } from './api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '../../../shared/ui/alert-dialog';
import { FieldError } from '../../../shared/ui/FieldError';
import { AlertTriangle, RotateCcw } from 'lucide-react';

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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className={isActive ? 'text-destructive' : 'text-primary'}>
            {isActive ? <AlertTriangle /> : <RotateCcw />}
          </AlertDialogMedia>
          <AlertDialogTitle>{isActive ? 'Deactivate Account' : 'Reactivate Account'}</AlertDialogTitle>
          <AlertDialogDescription>
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
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <FieldError message={error} />}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={updateStatus.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant={isActive ? 'destructive' : 'default'}
            disabled={updateStatus.isPending}
            loading={updateStatus.isPending}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            {updateStatus.isPending ? 'Processing...' : isActive ? 'Deactivate' : 'Reactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
