import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listReports } from './api';
import { formatCurrency } from '../../../shared/utils/currency';
import { mapStatus } from '../../concerts-shared/status';
import { Badge } from '../../../shared/ui/badge';
import { ChevronRight, Search, Download, ChevronDown, ChevronLeft } from 'lucide-react';
import { getAssetUrl } from '../../../shared/api/client';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/button';

export function AdminReportsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [windowDays, setWindowDays] = useState('ALL');
  const [organizerId, setOrganizerId] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);

  const parsedWindowDays = windowDays === 'ALL' ? undefined : Number(windowDays);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-reports', page, search, status, parsedWindowDays, organizerId],
    queryFn: () => listReports({ page, limit: 10, search, status, windowDays: parsedWindowDays, organizerId }),
    placeholderData: (previousData) => previousData,
  });

  const resetFilters = () => {
    setSearch('');
    setStatus('ALL');
    setWindowDays('ALL');
    setOrganizerId('ALL');
    setPage(1);
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      // Fetch all data matching current filters
      const response = await listReports({ 
        limit: 5000, 
        page: 1, 
        search, 
        status, 
        windowDays: parsedWindowDays, 
        organizerId 
      });

      const items = response.items;
      
      // Define CSV headers
      const headers = [
        'Concert ID',
        'Title',
        'Date',
        'Status',
        'Organizer',
        'Tickets Sold',
        'Total Capacity',
        'Checked In',
        'Eligible Tickets',
        'Revenue (VND)'
      ];

      // Convert data to CSV rows
      const rows = items.map(item => [
        item.id,
        `"${item.title.replace(/"/g, '""')}"`,
        new Date(item.startsAt).toLocaleDateString('en-US'),
        item.status,
        `"${item.organizerDisplayName.replace(/"/g, '""')}"`,
        item.soldTickets,
        item.totalTickets,
        item.checkedInTickets,
        item.eligibleTickets,
        item.revenueVnd
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(e => e.join(','))
      ].join('\n');

      // Create a Blob and trigger download
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF is BOM for UTF-8 Excel support
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ticketbox_reports_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV', err);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-[#dae2fd] font-sans relative overflow-hidden pb-12">
      {/* Visual Atmosphere Blooms */}
      <div className="fixed top-[-10%] right-[-5%] w-[400px] h-[400px] bg-[#d0bcff]/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] left-[10%] w-[350px] h-[350px] bg-[#4cd7f6]/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="relative z-10 px-10 py-12 mx-auto max-w-[1440px]">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-[#dae2fd] tracking-tight mb-1">Analytics & Reports</h2>
            <p className="text-[#cbc3d7]">Comprehensive revenue and performance metrics across all platform events.</p>
          </div>
          <Button variant="outline" onClick={handleExportCsv} loading={isExporting} className="rounded-xl px-6 font-semibold shadow-none bg-white/5 border-[#494454]">
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-[rgba(30,41,59,0.6)] backdrop-blur-[20px] border border-white/10 rounded-2xl p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#cbc3d7]" />
            <input 
              type="text" 
              placeholder="Search concerts..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-[#131b2e] border border-[#494454] rounded-full py-2 pl-10 pr-4 text-sm text-[#dae2fd] focus:ring-1 focus:ring-[#4cd7f6] focus:border-[#4cd7f6] outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <select 
                value={windowDays}
                onChange={(e) => { setWindowDays(e.target.value); setPage(1); }}
                className="bg-[#131b2e] border border-[#494454] rounded-lg py-2 pl-3 pr-8 text-sm text-[#dae2fd] outline-none appearance-none cursor-pointer"
              >
                <option value="ALL">All Time</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="365">This Year</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-[#cbc3d7] pointer-events-none" />
            </div>
            <div className="relative">
              <select 
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="bg-[#131b2e] border border-[#494454] rounded-lg py-2 pl-3 pr-8 text-sm text-[#dae2fd] outline-none appearance-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ENDED">Ended</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-[#cbc3d7] pointer-events-none" />
            </div>
            <button 
              onClick={resetFilters}
              className="text-[#cbc3d7] hover:text-[#dae2fd] text-sm font-medium px-2 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* The Data Grid */}
        <div className="bg-[rgba(30,41,59,0.6)] backdrop-blur-[20px] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-white/5 border-b border-[#494454]/50">
                  <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-[#cbc3d7]">Rank</th>
                  <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-[#cbc3d7]">Concert & Organizer</th>
                  <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-[#cbc3d7]">Event Date</th>
                  <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-[#cbc3d7]">Status</th>
                  <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-[#cbc3d7]">Tickets Sold</th>
                  <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-[#cbc3d7]">Check-in</th>
                  <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-[#cbc3d7] text-right">Total Gross</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#494454]/30">
                {isLoading ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-[#cbc3d7]">Loading reports...</td></tr>
                ) : error || !data ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-red-400">Failed to load reports</td></tr>
                ) : data.items.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-[#cbc3d7]">No concerts found</td></tr>
                ) : (
                  data.items.map((row, idx) => {
                    const rank = (page - 1) * data.limit + idx + 1;
                    const ticketPercentage = row.totalTickets > 0 ? Math.round((row.soldTickets / row.totalTickets) * 100) : 0;
                    const checkinPercentage = row.eligibleTickets > 0 ? Math.round((row.checkedInTickets / row.eligibleTickets) * 100) : 0;
                    const checkinIsHigh = checkinPercentage >= 80;
                    const { label, variant, dotClass } = mapStatus(row.status);
                    
                    let rankClass = 'bg-[#494454]/50 text-[#cbc3d7]';
                    if (rank === 1) rankClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
                    else if (rank === 2) rankClass = 'bg-slate-300/20 text-slate-200 border border-slate-300/30 shadow-[0_0_10px_rgba(203,213,225,0.2)]';
                    else if (rank === 3) rankClass = 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]';

                    const posterUrl = row.posterAssetId ? getAssetUrl(row.posterAssetId) : null;

                    return (
                      <tr key={row.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4">
                          <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-[12px] ${rankClass}`}>
                            {rank}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                              {posterUrl ? (
                                <img src={posterUrl} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-white/50 text-xs font-bold uppercase">{row.title.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-[#dae2fd] text-sm">{row.title}</p>
                              <p className="text-xs text-[#cbc3d7] mt-0.5">{row.organizerDisplayName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-[#dae2fd]">
                          {new Date(row.startsAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={variant as any} className="shadow-sm">
                            {dotClass && <span className={`size-1.5 rounded-full ${dotClass}`} />}
                            {label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <span className="font-mono text-xs text-[#cbc3d7]">
                              {row.soldTickets} <span className="opacity-50">/ {row.totalTickets}</span>
                            </span>
                            <div className="w-full bg-[#131b2e] h-1.5 rounded-full overflow-hidden">
                              <div className="h-full bg-[#4cd7f6]" style={{ width: `${ticketPercentage}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-mono text-sm font-bold ${checkinIsHigh ? 'text-[#4cd7f6]' : 'text-[#cbc3d7]'}`}>
                            {checkinPercentage}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-mono text-sm font-bold text-[#d0bcff]">
                            {formatCurrency(row.revenueVnd)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link to={`/admin/concerts/${row.id}/edit`} className="text-[#cbc3d7] hover:text-[#d0bcff] transition-colors inline-block p-1.5 hover:bg-[#d0bcff]/10 rounded-lg">
                            <ChevronRight className="w-5 h-5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {data && data.totalItems > 0 && (
            <div className="px-6 py-4 border-t border-[#494454]/30 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.01]">
              <p className="text-sm text-[#cbc3d7]">
                Showing <span className="font-mono text-[#dae2fd]">{(page - 1) * data.limit + 1}-{Math.min(page * data.limit, data.totalItems)}</span> of <span className="font-mono text-[#dae2fd]">{data.totalItems}</span> results
              </p>
              <div className="flex items-center gap-2">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#494454] text-sm font-medium text-[#cbc3d7] hover:bg-white/5 hover:text-[#dae2fd] disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <div className="flex items-center gap-1 font-mono text-sm">
                  {[...Array(data.totalPages)].map((_, i) => {
                    const p = i + 1;
                    if (p === 1 || p === data.totalPages || Math.abs(page - p) <= 1) {
                      return (
                        <button 
                          key={p} 
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg ${p === page ? 'bg-[#d0bcff]/20 text-[#d0bcff] border border-[#d0bcff]/50' : 'text-[#cbc3d7] hover:bg-white/5'}`}
                        >
                          {p}
                        </button>
                      );
                    }
                    if (Math.abs(page - p) === 2) return <span key={p} className="text-[#494454]">...</span>;
                    return null;
                  })}
                </div>
                <button 
                  disabled={page === data.totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#494454] text-sm font-medium text-[#cbc3d7] hover:bg-white/5 hover:text-[#dae2fd] disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
