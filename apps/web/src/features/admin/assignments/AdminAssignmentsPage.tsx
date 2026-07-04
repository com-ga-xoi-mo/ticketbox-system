import React, { useState } from 'react';
import { useConcerts } from '../concerts/hooks';
import { AssignmentPicker } from './components/AssignmentPicker';
import { BulkCreateStaffPanel } from './components/BulkCreateStaffPanel';
import { AssignmentList } from './components/AssignmentList';
import { SearchableConcertSelect } from './components/SearchableConcertSelect';
import { Calendar } from 'lucide-react';

export const AdminAssignmentsPage = () => {
  const { data: concerts, isLoading: concertsLoading } = useConcerts();
  const [selectedConcertId, setSelectedConcertId] = useState<string>('');

  // Auto-select first concert if available and none selected
  React.useEffect(() => {
    if (concerts && concerts.length > 0 && !selectedConcertId) {
      setSelectedConcertId(concerts[0].id);
    }
  }, [concerts, selectedConcertId]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Phân công nhân viên</h1>
        <p className="text-slate-400">Quản lý và điều phối nhân viên kiểm soát cổng cho các sự kiện.</p>
      </div>

      <div className="relative z-20 bg-slate-800/60 backdrop-blur-xl border border-white/10 p-6 rounded-xl space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#4cd7f6]" />
          Chọn sự kiện
        </h2>
        {concertsLoading ? (
          <div className="text-slate-400">Đang tải sự kiện...</div>
        ) : (
          <div className="max-w-md">
            <SearchableConcertSelect
              concerts={concerts || []}
              selectedId={selectedConcertId}
              onSelect={setSelectedConcertId}
            />
          </div>
        )}
      </div>

      {selectedConcertId ? (
        <div className="flex flex-col gap-6">
          <BulkCreateStaffPanel concertId={selectedConcertId} />
          <AssignmentPicker concertId={selectedConcertId} />
          <AssignmentList concertId={selectedConcertId} />
        </div>
      ) : (
        <div className="text-center p-12 bg-slate-800/30 backdrop-blur-sm border border-white/10 rounded-xl text-slate-400">
          Vui lòng chọn một sự kiện để bắt đầu phân công nhân viên
        </div>
      )}
    </div>
  );
};
