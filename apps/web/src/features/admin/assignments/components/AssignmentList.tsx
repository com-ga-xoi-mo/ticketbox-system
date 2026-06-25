import React, { useMemo, useState } from 'react';
import { useAssignments, useRevokeAssignment } from '../hooks';
import { useAccounts } from '../../accounts/hooks';
import { Button } from '../../../../shared/ui/button';
import { Badge } from '../../../../shared/ui/badge';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog';
import { toast } from 'sonner';
import { UserMinus, ShieldAlert, DoorOpen } from 'lucide-react';

interface AssignmentListProps {
  concertId: string;
}

export const AssignmentList = ({ concertId }: AssignmentListProps) => {
  const { data: assignments, isLoading } = useAssignments(concertId);
  const { mutate: revoke, isPending: isRevoking } = useRevokeAssignment();
  const { data: accounts } = useAccounts();
  const [assignmentToRevoke, setAssignmentToRevoke] = useState<string | null>(null);

  const handleRevoke = (assignmentId: string) => {
    setAssignmentToRevoke(assignmentId);
  };

  const confirmRevoke = () => {
    if (assignmentToRevoke) {
      revoke({ concertId, assignmentId: assignmentToRevoke }, {
        onSuccess: () => {
          toast.success('Đã thu hồi quyền nhân viên check-in');
          setAssignmentToRevoke(null);
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || 'Không thể thu hồi quyền');
          setAssignmentToRevoke(null);
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800/60 backdrop-blur-xl border border-white/10 rounded-xl p-8 flex justify-center text-slate-400">
        Loading assignments...
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-white/10 bg-slate-900/40">
        <h3 className="text-xl font-semibold text-white">Current Assignments</h3>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-slate-900/40">
              <th className="p-4 text-sm font-medium text-slate-400">Staff</th>
              <th className="p-4 text-sm font-medium text-slate-400">Gate</th>
              <th className="p-4 text-sm font-medium text-slate-400">Status</th>
              <th className="p-4 text-sm font-medium text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!assignments || assignments.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-3">
                    <ShieldAlert className="w-8 h-8 text-slate-400" />
                    <p>No staff assigned to this event yet.</p>
                  </div>
                </td>
              </tr>
            ) : (
              assignments.map((assignment: any) => {
                const user = accounts?.find(a => a.id === assignment.staffUserId) || assignment.user;
                return (
                <tr key={`${assignment.staffUserId}-${assignment.gateName}`} className="border-b border-[var(--divider)] hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10">
                        {user?.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-slate-400">
                            {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white">{user?.displayName || 'Unknown User'}</div>
                        <div className="text-sm text-slate-400">{user?.email || 'No email'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-white bg-slate-900/50 px-3 py-1.5 rounded-lg border border-white/10 w-fit">
                      <DoorOpen className="w-4 h-4 text-[#4cd7f6]" />
                      <span className="font-medium">{assignment.gateName || 'All gates'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className="bg-[#4cd7f6]/10 text-[#4cd7f6] border-[#4cd7f6]/30 font-medium px-2.5 py-0.5 rounded-full">
                      Assigned
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(assignment.id)}
                      disabled={isRevoking}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      <UserMinus className="w-4 h-4 mr-2" />
                      Revoke
                    </Button>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!assignmentToRevoke}
        onOpenChange={(open) => !open && setAssignmentToRevoke(null)}
        title="Thu hồi quyền kiểm vé"
        description="Bạn có chắc chắn muốn thu hồi quyền kiểm vé của nhân viên này không? Họ sẽ không thể check-in vé cho sự kiện này nữa."
        confirmText="Thu hồi"
        cancelText="Hủy"
        confirmVariant="destructive"
        onConfirm={confirmRevoke}
        isLoading={isRevoking}
      />
    </div>
  );
};
