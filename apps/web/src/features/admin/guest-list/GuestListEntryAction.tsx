import { useNavigate } from 'react-router-dom';

import { Button } from '../../../shared/ui/button';

export function GuestListEntryAction({ concertId }: { concertId: string }) {
  const navigate = useNavigate();
  return (
    <div className="px-6 pb-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => navigate(`/admin/concerts/${concertId}/guest-list`)}
      >
        <span className="material-symbols-outlined text-sm" aria-hidden="true">
          group
        </span>
        Quản lý Guest List
      </Button>
    </div>
  );
}
