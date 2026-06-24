import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOrganizerDashboardMetrics } from './api';
import { listConcerts } from '../concerts/api';
import { Area, AreaChart, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { Activity, Ticket, Users, CheckCircle2, ChevronRight, MapPin, MoreVertical, Plus, Map } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/currency';
import { useAuth } from '../../../shared/auth/AuthContext';
import { Link } from 'react-router-dom';

export function OrganizerDashboard() {
  const { session } = useAuth();
  const [windowDays, setWindowDays] = useState(14);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['organizer-dashboard-metrics', windowDays],
    queryFn: () => getOrganizerDashboardMetrics(windowDays),
  });

  const { data: concerts } = useQuery({
    queryKey: ['organizer-concerts'],
    queryFn: listConcerts,
  });

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-[#020617] text-[#dae2fd]">Loading...</div>;
  }

  if (error || !data) {
    return <div className="p-6 text-red-500">Failed to load dashboard metrics.</div>;
  }

  const { overallCheckinRate } = data;
  const checkinPercentage = Math.round(overallCheckinRate.rate * 100);
  const isHighCheckin = checkinPercentage >= 80;

  const activeConcerts = (concerts || [])
    .filter(c => c.status !== 'CANCELLED' && c.status !== 'ENDED')
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#020617] text-[#dae2fd] font-sans relative overflow-hidden pb-12">
      {/* Background Blooms */}
      <div className="fixed top-[-10%] right-[-5%] w-[400px] h-[400px] bg-[#d0bcff]/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] left-[10%] w-[350px] h-[350px] bg-[#4cd7f6]/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="relative z-10 px-10 py-12 mx-auto max-w-[1440px]">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-[#dae2fd] tracking-tight">Welcome back, Organizer</h2>
            <p className="text-[#cbc3d7] mt-1">Here is what's happening with your events today.</p>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[rgba(30,41,59,0.6)] backdrop-blur-[20px] border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[#cbc3d7] text-sm">Total Revenue</span>
              <div className="p-2 bg-[#d0bcff]/10 rounded-lg">
                <Activity className="w-5 h-5 text-[#d0bcff]" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#dae2fd]">{formatCurrency(data.myTotalRevenueVnd)}</div>
            <div className="mt-4 flex items-center gap-2 text-[#4cd7f6] text-sm">
              <Activity className="w-4 h-4" />
              <span>Real-time tracking</span>
            </div>
          </div>

          <div className="bg-[rgba(30,41,59,0.6)] backdrop-blur-[20px] border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[#cbc3d7] text-sm">Active Events</span>
              <div className="p-2 bg-[#4cd7f6]/10 rounded-lg">
                <Ticket className="w-5 h-5 text-[#4cd7f6]" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold text-[#dae2fd]">{activeConcerts.length}</div>
            </div>
            <div className="mt-4 w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-[#4cd7f6] w-[100%] rounded-full"></div>
            </div>
          </div>

          <div className="bg-[rgba(30,41,59,0.6)] backdrop-blur-[20px] border border-white/10 p-6 rounded-2xl border-l-4 border-[#10B981]/50">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[#cbc3d7] text-sm">Avg. Check-in Rate</span>
              <div className="p-2 bg-[#10B981]/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
              </div>
            </div>
            <div className={`text-3xl font-bold ${isHighCheckin ? 'text-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-[#F59E0B]'} inline-block`}>
              {checkinPercentage}%
            </div>
            <p className="text-[#cbc3d7] mt-4 text-sm">
              {overallCheckinRate.checkedInTickets} / {overallCheckinRate.eligibleTickets} eligible tickets
            </p>
          </div>
        </div>

        {/* Dashboard Columns */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column (Sales Velocity & Active Concerts) */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            
            {/* Sales Velocity Chart */}
            <div className="bg-[rgba(30,41,59,0.6)] backdrop-blur-[20px] border border-white/10 p-6 rounded-2xl h-[400px] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-[#dae2fd] text-base">Sales Velocity</h3>
                <div className="relative">
                  <select 
                    className="bg-[#171f33] border-none text-sm rounded-lg py-1 pl-3 pr-8 outline-none text-[#cbc3d7] focus:ring-1 focus:ring-[#d0bcff] cursor-pointer appearance-none"
                    value={windowDays}
                    onChange={(e) => setWindowDays(Number(e.target.value))}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23cbc3d7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>
              </div>
              <div className="flex-1 relative w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.ticketSalesVelocity.points}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d0bcff" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#d0bcff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      stroke="#cbc3d7" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <Tooltip 
                      cursor={{ stroke: '#494454', strokeWidth: 1, strokeDasharray: '4 4' }}
                      contentStyle={{ backgroundColor: '#131b2e', borderColor: '#494454', color: '#dae2fd', borderRadius: '8px' }}
                      itemStyle={{ color: '#d0bcff', fontWeight: 'bold' }}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                    />
                    <Area type="monotone" dataKey="revenueVnd" stroke="#d0bcff" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Active Concerts Table */}
            <div className="bg-[rgba(30,41,59,0.6)] backdrop-blur-[20px] border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 flex justify-between items-center border-b border-white/5">
                <h3 className="font-semibold text-[#dae2fd] text-base">My Active Concerts</h3>
                <Link to="/organizer/concerts" className="text-[#d0bcff] text-sm font-medium hover:underline">View All</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-[#cbc3d7] font-mono text-[11px] uppercase tracking-wider">
                      <th className="px-6 py-4">Event Name</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#494454]/30">
                    {activeConcerts.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-4 text-[#cbc3d7] text-sm text-center">No active concerts found.</td></tr>
                    ) : (
                      activeConcerts.map(concert => (
                        <tr key={concert.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-[#312E81]/50 flex items-center justify-center text-[#d0bcff]">
                                <Ticket className="w-5 h-5" />
                              </div>
                              <span className="font-medium">{concert.title}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              concert.status === 'PUBLISHED' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-white/10 text-[#cbc3d7]'
                            }`}>
                              {concert.status === 'PUBLISHED' ? 'Selling' : 'Draft'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-sm">
                            {new Date(concert.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4">
                            <Link to={`/organizer/concerts/${concert.id}/edit`} className="text-[#cbc3d7] hover:text-[#d0bcff] transition-colors"><MoreVertical className="w-5 h-5" /></Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column (Check-in Status & Quick Actions) */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            
            {/* Live Check-in Status */}
            <div className="bg-[rgba(30,41,59,0.6)] backdrop-blur-[20px] border border-white/10 p-8 rounded-2xl text-center">
              <h3 className="font-semibold text-left mb-8 text-[#dae2fd]">Live Check-in Status</h3>
              <div className="relative w-48 h-48 mx-auto mb-6">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(255,255,255,0.05)" strokeWidth="8"></circle>
                  <circle className="transition-all duration-1000" cx="50" cy="50" fill="none" r="45" stroke="#d0bcff" strokeDasharray="282.7" strokeDashoffset={`${282.7 - (checkinPercentage / 100) * 282.7}`} strokeWidth="8" strokeLinecap="round"></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-[#dae2fd]">{checkinPercentage}%</span>
                  <span className="text-[10px] text-[#cbc3d7] uppercase font-mono mt-1">Checked In</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 p-2 bg-[#10B981]/10 rounded-lg mt-8">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                <span className="text-xs text-[#10B981] font-semibold uppercase tracking-widest">Live Updates</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[rgba(30,41,59,0.6)] backdrop-blur-[20px] border border-white/10 p-6 rounded-2xl">
              <h3 className="font-semibold mb-6 text-[#dae2fd]">Quick Actions</h3>
              <div className="space-y-3">
                <Link to="/organizer/concerts" className="w-full group flex items-center justify-between p-4 rounded-xl border border-[#494454] bg-white/5 hover:border-[#d0bcff] hover:bg-[#d0bcff]/5 transition-all active:scale-[0.98]">
                  <div className="flex items-center gap-4">
                    <Users className="w-5 h-5 text-[#cbc3d7] group-hover:text-[#d0bcff] transition-colors" />
                    <span className="font-medium text-sm text-[#dae2fd]">Manage Concerts</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#cbc3d7] group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/organizer/venue-maps" className="w-full group flex items-center justify-between p-4 rounded-xl border border-[#494454] bg-white/5 hover:border-[#4cd7f6] hover:bg-[#4cd7f6]/5 transition-all active:scale-[0.98]">
                  <div className="flex items-center gap-4">
                    <Map className="w-5 h-5 text-[#cbc3d7] group-hover:text-[#4cd7f6] transition-colors" />
                    <span className="font-medium text-sm text-[#dae2fd]">Manage Venue Maps</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#cbc3d7] group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
