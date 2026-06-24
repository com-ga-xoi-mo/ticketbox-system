import { Link } from 'react-router-dom';
import { Music, Briefcase, Trophy, Film, Drama, Ticket } from 'lucide-react';

const CATEGORIES = [
  { type: 'CONCERT', label: 'Âm nhạc', icon: Music },
  { type: 'WORKSHOP', label: 'Workshop', icon: Briefcase },
  { type: 'SPORT', label: 'Thể thao', icon: Trophy },
  { type: 'MOVIE', label: 'Điện ảnh', icon: Film },
  { type: 'THEATRE', label: 'Sân khấu', icon: Drama },
  { type: 'VOUCHER', label: 'Voucher', icon: Ticket },
];

export function CategoryNavBar() {
  return (
    <div className="w-full overflow-x-auto hide-scrollbar border-b bg-card">
      <div className="mx-auto flex max-w-7xl justify-start lg:justify-center gap-6 px-4 py-4 sm:px-6 lg:px-8 min-w-max">
        {CATEGORIES.map(({ type, label, icon: Icon }) => (
          <Link
            key={type}
            to={`/events?eventType=${type}`}
            className="flex flex-col items-center gap-2 group min-w-[80px]"
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10 group-hover:text-primary">
              <Icon className="size-6 text-muted-foreground group-hover:text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
