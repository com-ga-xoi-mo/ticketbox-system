export type ConcertStatus = 'PUBLISHED' | 'DRAFT' | 'ENDED' | 'CANCELLED';

export interface MockConcert {
  id: string;
  name: string;
  date: string;
  venue: string;
  status: ConcertStatus;
  organizer: string;
  city: string;
}

export interface MockStats {
  totalConcerts: number;
  totalTrend: string;
  published: number;
  drafts: number;
  cancelled: number;
  ended: number;
  ticketsAvailable: number;
  ticketsTotal: number;
  soldOutRate: number;
  reviewQueue: number;
  staffAssigned: number;
  checkinRate: number;
}

export const MOCK_STATS: MockStats = {
  totalConcerts: 147,
  totalTrend: '+8.4%',
  published: 91,
  drafts: 38,
  cancelled: 7,
  ended: 11,
  ticketsAvailable: 11840,
  ticketsTotal: 19750,
  soldOutRate: 64,
  reviewQueue: 9,
  staffAssigned: 73,
  checkinRate: 87.6,
};

export const MOCK_RECENT_CONCERTS: MockConcert[] = [
  {
    id: '1',
    name: 'Neon district live',
    date: '2026-06-28',
    venue: 'Grand Arena',
    organizer: 'Saigon Soundworks',
    city: 'Ho Chi Minh City',
    status: 'PUBLISHED',
  },
  {
    id: '2',
    name: 'Riverside piano sessions',
    date: '2026-07-04',
    venue: 'Echo Lounge',
    organizer: 'Thanh Am Collective',
    city: 'Da Nang',
    status: 'DRAFT',
  },
  {
    id: '3',
    name: 'Midnight jazz archive',
    date: '2026-06-09',
    venue: 'Blue Note Club',
    organizer: 'District 3 Jazz House',
    city: 'Ho Chi Minh City',
    status: 'ENDED',
  },
  {
    id: '4',
    name: 'Summer bass night',
    date: '2026-07-19',
    venue: 'Outdoor Pavilion',
    organizer: 'North Gate Events',
    city: 'Hanoi',
    status: 'CANCELLED',
  },
];
