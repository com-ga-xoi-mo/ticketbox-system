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
          setError(err.message || 'Cập nhật trạng thái tài khoản thất bại.');
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
          <AlertDialogTitle>{isActive ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt lại tài khoản'}</AlertDialogTitle>
          <AlertDialogDescription>
            {isActive ? (
              <>
                Bạn có chắc chắn muốn vô hiệu hóa <strong>{account.displayName}</strong>?
                Đây là hành động xóa mềm. Người dùng sẽ bị chặn đăng nhập và mọi phân công check-in đang hoạt động sẽ bị thu hồi.
              </>
            ) : (
              <>
                Bạn có chắc chắn muốn kích hoạt lại <strong>{account.displayName}</strong>?
                Người dùng sẽ có thể đăng nhập trở lại.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <FieldError message={error} />}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={updateStatus.isPending}>
            Hủy
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
            {updateStatus.isPending ? 'Đang xử lý...' : isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
