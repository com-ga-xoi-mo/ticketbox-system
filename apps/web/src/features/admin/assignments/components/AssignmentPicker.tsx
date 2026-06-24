import React, { useState, useMemo } from 'react';
import { useAssignStaff, useAssignments } from '../hooks';
import { useAccounts } from '../../accounts/hooks';
import { Button } from '../../../../shared/ui/button';
import { Input } from '../../../../shared/ui/input';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

interface AssignmentPickerProps {
  concertId: string;
}

export const AssignmentPicker = ({ concertId }: AssignmentPickerProps) => {
  const [userId, setUserId] = useState('');
  const [gateName, setGateName] = useState('');

  const { data: allStaff, isLoading: isStaffLoading } = useAccounts('CHECKIN_STAFF', 'ACTIVE');
  const { data: assignments } = useAssignments(concertId);
  const { mutate: assign, isPending } = useAssignStaff();

  const assignedUserIds = useMemo(
    () => new Set((assignments ?? []).map((a: any) => a.staffUserId)),
    [assignments],
  );
  const staffList = useMemo(
    () => (allStaff ?? []).filter((s: any) => !assignedUserIds.has(s.id)),
    [allStaff, assignedUserIds],
  );

  const handleAssign = () => {
    if (!userId || !gateName) {
      toast.error('Please select a staff member and enter a gate name');
      return;
    }

    assign({
      concertId,
      payload: { userId, gateName }
    }, {
      onSuccess: () => {
        toast.success('Phân công nhân viên thành công');
        setUserId('');
        setGateName('');
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Lỗi khi phân công nhân viên');
      }
    });
  };

  return (
    <div className="bg-slate-800/60 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-[#d0bcff]" />
        New Assignment
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400 ml-1">Check-in Staff</label>
          <div className="relative">
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="appearance-none cursor-pointer w-full h-12 bg-slate-900/50 border border-white/10 rounded-md py-1.5 pl-3 pr-8 text-sm text-white transition-all focus:border-[#4cd7f6] focus:outline-none focus:ring-1 focus:ring-[#4cd7f6]/50"
            >
              <option value="" disabled>
                {isStaffLoading ? "Loading..." : "Select staff..."}
              </option>
              {staffList?.map((staff: any) => (
                <option key={staff.id} value={staff.id}>
                  {staff.displayName || staff.email.split('@')[0]} ({staff.email})
                </option>
              ))}
              {staffList?.length === 0 && !isStaffLoading && (
                <option value="empty" disabled>
                  No staff available
                </option>
              )}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-400">
              ▼
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400 ml-1">Gate</label>
          <Input
            value={gateName}
            onChange={(e) => setGateName(e.target.value)}
            placeholder="e.g. Gate A, Gate B..."
            className="w-full h-12 bg-slate-900/50 border-white/10 text-white placeholder:placeholder:text-slate-500"
          />
        </div>

        <Button
          onClick={handleAssign}
          disabled={isPending || !userId || !gateName}
          className="w-full h-12 bg-gradient-to-br from-[#d0bcff] to-[#e14ef6] text-slate-900 font-semibold shadow-[0_0_15px_rgba(225,78,246,0.3)] hover:shadow-[0_0_25px_rgba(225,78,246,0.5)] border-0"
        >
          {isPending ? 'Processing...' : 'Assign'}
        </Button>
      </div>
    </div>
  );
};
