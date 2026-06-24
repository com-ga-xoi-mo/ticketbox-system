import { Link } from 'react-router-dom';
import { Music, Briefcase, Trophy, Film, Drama, Ticket } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';

const CATEGORIES = [
  { type: 'CONCERT', label: 'Âm nhạc', icon: Music, color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { type: 'WORKSHOP', label: 'Workshop', icon: Briefcase, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  { type: 'SPORT', label: 'Thể thao', icon: Trophy, color: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  { type: 'MOVIE', label: 'Điện ảnh', icon: Film, color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  { type: 'THEATRE', label: 'Sân khấu', icon: Drama, color: 'bg-rose-500/10 text-rose-600 border-rose-200' },
  { type: 'VOUCHER', label: 'Voucher', icon: Ticket, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200' },
];

export function PopularCategoriesGrid() {
  return (
    <div className="py-12">
      <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl mb-8">Danh mục phổ biến</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {CATEGORIES.map(({ type, label, icon: Icon, color }) => (
          <Link key={type} to={`/events?eventType=${type}`} className="block group outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
            <Card className={`h-full border transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md ${color}`}>
              <CardContent className="flex flex-col items-center justify-center p-6 gap-4 text-center">
                <Icon className="size-8" />
                <span className="font-bold">{label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
