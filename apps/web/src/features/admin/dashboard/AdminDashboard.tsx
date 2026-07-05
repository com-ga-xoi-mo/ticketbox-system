import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAdminDashboardMetrics } from './api';
import { listConcerts } from '../concerts/api';
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { Users, Activity, Ticket, ChevronRight, Settings, FileText, Calendar, MapPin, ClipboardList, Map } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/currency';
import { Link } from 'react-router-dom';

export function AdminDashboard() {
  const [windowDays, setWindowDays] = useState(30);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard-metrics', windowDays],
    queryFn: () => getAdminDashboardMetrics(windowDays),
  });

  const { data: concerts } = useQuery({
    queryKey: ['admin-concerts'],
    queryFn: listConcerts,
  });

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-[#020617] text-[#dae2fd]">Đang tải...</div>;
  }

  if (error || !data) {
    return <div className="p-6 text-red-500">Không thể tải số liệu bảng điều khiển.</div>;
  }

  // Calculate upcoming concerts
  const now = new Date();
  const upcomingConcerts = (concerts || [])
    .filter((c) => c.status === 'PUBLISHED' && new Date(c.startsAt) >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-[#020617] text-[#dae2fd] font-sans relative overflow-hidden">
      {/* Background Blooms */}
      <div className="fixed top-[-10%] left-[-5%] w-96 h-96 bg-[#d0bcff] rounded-full blur-[120px] opacity-15 pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#fbabff] rounded-full blur-[120px] opacity-15 pointer-events-none z-0"></div>

      <div className="relative z-10 px-10 py-12 mx-auto max-w-[1440px]">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-[#dae2fd] mb-1">Tổng quan nền tảng</h2>
            <p className="text-[#cbc3d7] text-sm">Số liệu hiệu suất theo thời gian thực cho hệ sinh thái TicketBox.</p>
          </div>
          <div className="flex items-center gap-2 bg-[#222a3d] px-4 py-2 rounded-xl border border-[#494454] focus-within:border-[#d0bcff] focus-within:ring-1 focus-within:ring-[#d0bcff] transition-all">
            <Calendar className="w-5 h-5 text-[#d0bcff]" />
            <select 
              className="bg-transparent border-none text-sm text-[#dae2fd] font-medium outline-none cursor-pointer appearance-none pr-6"
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23cbc3d7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right center' }}
            >
              <option value={7} className="bg-[#131b2e]">7 ngày qua</option>
              <option value={14} className="bg-[#131b2e]">14 ngày qua</option>
              <option value={30} className="bg-[#131b2e]">30 ngày qua</option>
              <option value={90} className="bg-[#131b2e]">90 ngày qua</option>
            </select>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* KPI 1 */}
          <div className="bg-[rgba(30,41,59,0.6)] backdrop-blur-[12px] border border-white/5 border-t-white/10 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#d0bcff]/10 rounded-full blur-2xl group-hover:bg-[#d0bcff]/20 transition-all duration-500"></div>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-[#d0bcff]/20 rounded-xl">
                <Activity className="w-6 h-6 text-[#d0bcff]" />
              </div>
            </div>
            <p className="text-[#cbc3d7] text-sm mb-1">Tổng doanh thu nền tảng</p>
            <p className="text-3xl font-bold text-[#dae2fd]">{formatCurrency(data.totalPlatformRevenueVnd)}</p>
          </div>

          {/* KPI 2 */}
          <div className="bg-[rgba(30,41,59,0.6)] backdrop-blur-[12px] border border-white/5 border-t-white/10 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#fbabff]/10 rounded-full blur-2xl group-hover:bg-[#fbabff]/20 transition-all duration-500"></div>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-[#fbabff]/20 rounded-xl">
                <Ticket className="w-6 h-6 text-[#fbabff]" />
              </div>
            </div>
            <p className="text-[#cbc3d7] text-sm mb-1">Sự kiện hoạt động</p>
            <p className="text-3xl font-bold text-[#dae2fd]">{data.totalActiveConcerts} <span className="text-base opacity-60 font-normal">Sự kiện</span></p>
          </div>

          {/* KPI 3 */}
          <div className="bg-[rgba(30,41,59,0.6)] backdrop-blur-[12px] border border-white/5 border-t-white/10 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#4cd7f6]/10 rounded-full blur-2xl group-hover:bg-[#4cd7f6]/20 transition-all duration-500"></div>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-[#4cd7f6]/20 rounded-xl">
                <Users className="w-6 h-6 text-[#4cd7f6]" />
              </div>
            </div>
            <p className="text-[#cbc3d7] text-sm mb-1">Tổng số buổi biểu diễn (Toàn thời gian)</p>
            <p className="text-3xl font-bold text-[#dae2fd]">{concerts?.length || 0} <span className="text-base opacity-60 font-normal">Chương trình</span></p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left Column (60%) */}
          <div className="lg:w-[60%] space-y-6">
            
            {/* Revenue Trend Chart */}
            <div className="bg-[rgba(30,41,59,0.6)] backdrop-blur-[12px] border border-white/5 border-t-white/10 p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-bold text-[#dae2fd]">Xu hướng doanh thu nền tảng</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#d0bcff]"></div>
                  <span className="text-xs text-[#cbc3d7]">Doanh thu hàng ngày</span>
                </div>
              </div>
              <div className="h-64 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueTrend.points}>
                    <XAxis 
                      dataKey="date" 
                      stroke="#cbc3d7" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: '#131b2e', borderColor: '#494454', color: '#dae2fd', borderRadius: '8px', fontSize: '12px' }}
                      itemStyle={{ color: '#d0bcff', fontWeight: 'bold' }}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                    />
                    <Bar dataKey="revenueVnd" fill="#d0bcff" radius={[4, 4, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Grossing Concerts Table */}
            <div className="bg-[rgba(30,41,59,0.6)] backdrop-blur-[12px] border border-white/5 border-t-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-[#494454]/30 flex justify-between items-center">
                <h3 className="text-base font-bold text-[#dae2fd]">Các buổi biểu diễn doanh thu cao nhất</h3>
                <Link to="/admin/reports" className="text-[#d0bcff] text-xs font-medium hover:underline">Xem tất cả báo cáo</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#222a3d]/50">
                    <tr>
                      <th className="px-6 py-4 font-mono text-xs text-[#cbc3d7]">HẠNG</th>
                      <th className="px-6 py-4 font-mono text-xs text-[#cbc3d7]">TÊN BUỔI BIỂU DIỄN</th>
                      <th className="px-6 py-4 font-mono text-xs text-[#cbc3d7] text-right">TỔNG DOANH THU</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#494454]/20">
                    {data.topGrossingConcerts.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-4 text-[#cbc3d7] text-sm text-center">Không có dữ liệu.</td></tr>
                    ) : (
                      data.topGrossingConcerts.map((concert, idx) => (
                        <tr key={concert.concertId} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <span
                              className={`w-6 h-6 flex items-center justify-center rounded-full font-bold text-xs ${
                                idx === 0
                                  ? 'bg-[#FFD700]/20 text-[#FFD700] ring-1 ring-[#FFD700]/40'
                                  : idx === 1
                                    ? 'bg-[#C0C7D1]/20 text-[#C0C7D1] ring-1 ring-[#C0C7D1]/40'
                                    : idx === 2
                                      ? 'bg-[#CD7F32]/20 text-[#CD7F32] ring-1 ring-[#CD7F32]/40'
                                      : 'bg-white/5 text-[#cbc3d7]'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-[#dae2fd]">{concert.title}</p>
                            <p className="text-xs text-[#cbc3d7] mt-0.5">{concert.organizerDisplayName}</p>
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-right text-[#d0bcff] font-bold">
                            {formatCurrency(concert.revenueVnd)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>

          {/* Right Column (40%) */}
          <div className="lg:w-[40%] space-y-6">
            
            {/* Upcoming Concerts Timeline */}
            <div className="bg-[rgba(30,41,59,0.6)] backdrop-blur-[12px] border border-white/5 border-t-white/10 p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-bold text-[#dae2fd]">Các buổi biểu diễn sắp tới</h3>
                <span className="px-2 py-1 bg-[#4cd7f6]/10 text-[#4cd7f6] text-[10px] font-bold rounded-full uppercase tracking-tighter">Sắp diễn ra</span>
              </div>
              
              <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-[#494454]/30">
                
                {upcomingConcerts.length === 0 ? (
                   <p className="text-sm text-[#cbc3d7] pl-2">Không tìm thấy buổi biểu diễn nào sắp tới.</p>
                ) : (
                  upcomingConcerts.map((concert, index) => {
                    const isFirst = index === 0;
                    return (
                      <div key={concert.id} className="relative pl-10">
                        <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 ${isFirst ? 'border-[#d0bcff]' : 'border-[#494454]'} bg-[#020617] flex items-center justify-center z-10`}>
                          <div className={`w-2 h-2 rounded-full ${isFirst ? 'bg-[#d0bcff] animate-pulse' : 'bg-[#494454]'}`}></div>
                        </div>
                        <div className="mb-1">
                          <span className={`font-mono text-[11px] ${isFirst ? 'text-[#d0bcff]' : 'text-[#cbc3d7]'}`}>
                            {new Date(concert.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(concert.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#dae2fd]">{concert.title}</h4>
                        <div className="flex items-center gap-1 text-[12px] text-[#cbc3d7] mt-1">
                          <MapPin className="w-3.5 h-3.5" /> {concert.venueName}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* System Actions */}
            <div className="bg-[rgba(30,41,59,0.6)] backdrop-blur-[12px] border border-white/5 border-t-white/10 p-6 rounded-2xl">
              <h3 className="text-base font-bold text-[#dae2fd] mb-6">Hành động hệ thống</h3>
              <div className="grid grid-cols-1 gap-3">
                <Link to="/admin/accounts" className="flex items-center justify-between p-4 bg-[#222a3d] rounded-xl border border-[#494454] group hover:border-[#d0bcff]/50 transition-all">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-[#d0bcff] group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Quản lý người dùng</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#cbc3d7]" />
                </Link>
                <Link to="/admin/assignments" className="flex items-center justify-between p-4 bg-[#222a3d] rounded-xl border border-[#494454] group hover:border-[#d0bcff]/50 transition-all">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-[#d0bcff] group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Phân công nhân viên</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#cbc3d7]" />
                </Link>
                <Link to="/admin/venue-maps" className="flex items-center justify-between p-4 bg-[#222a3d] rounded-xl border border-[#494454] group hover:border-[#d0bcff]/50 transition-all">
                  <div className="flex items-center gap-3">
                    <Map className="w-5 h-5 text-[#d0bcff] group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Quản lý bản đồ địa điểm</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#cbc3d7]" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
