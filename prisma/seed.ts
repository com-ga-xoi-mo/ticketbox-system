import {
  AssetKind,
  AssetStatus,
  ArtistBioStatus,
  CheckinEventResult,
  CheckinEventSource,
  ConcertStatus,
  DiscountType,
  EventType,
  GuestListBatchStatus,
  GuestListEntryStatus,
  NotificationChannel,
  NotificationResourceType,
  NotificationStatus,
  OrderStatus,
  PaymentEventType,
  PaymentStatus,
  PrismaClient,
  RefundRequestReason,
  RefundRequestStatus,
  RoleCode,
  SeatingZoneStatus,
  SupportRequestCategory,
  SupportRequestStatus,
  TicketStatus,
  TicketTypeStatus,
  UserStatus,
} from '@prisma/client';
import { v5 as uuidv5 } from 'uuid';

import { QrTicketTokenService } from '../packages/backend/src/ordering/domain/qr-ticket-token.service';

const prisma = new PrismaClient();

// Fixed namespace → deterministic UUIDs so re-running the seed is idempotent.
const SEED_NAMESPACE = '8f5b6c2a-1d4e-4a7b-9c3f-2e6d8a0b1c5d';
const detId = (key: string): string => uuidv5(key, SEED_NAMESPACE);

// Same QR token computation as the issuing flow, so seeded tickets are scannable.
const qrService = new QrTicketTokenService(
  process.env.QR_TOKEN_SECRET ?? 'ticketbox-qr-token-dev-secret',
);

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function pad(n: number, width = 3): string {
  return String(n).padStart(width, '0');
}

const demoPasswordHash = '$2b$10$8c.VgqzGzMFgwfEpq2K5XOct3iK5I.THdHvnyrIX.MIlCBJ7PTPNe'; // hashes to 'demoPassword'
const assetPublicBaseUrl = (process.env.S3_PUBLIC_BASE_URL ?? 'https://assets.example.com').replace(
  /\/+$/,
  '',
);

type SeedZone = {
  svgElementId: string;
  label: string;
  color: string;
  displayOrder: number;
};

type SeedTicketType = {
  code: string;
  name: string;
  description: string;
  priceVnd: number;
  totalQuantity: number;
  maxPerUser: number;
  zoneElementIds: string[];
};

type SeedConcert = {
  slug: string;
  title: string;
  artistName: string;
  description: string;
  venueName: string;
  venueAddress: string;
  city: string;
  startsInDays: number;
  eventType: EventType;
  zones: SeedZone[];
  ticketTypes: SeedTicketType[];
};

const standardZones: SeedZone[] = [
  { svgElementId: 'zone-vip', label: 'VIP', color: '#F97316', displayOrder: 1 },
  { svgElementId: 'zone-standard', label: 'Standard', color: '#2563EB', displayOrder: 2 },
  { svgElementId: 'zone-economy', label: 'Economy', color: '#16A34A', displayOrder: 3 },
];

function standardTicketTypes(basePriceVnd: number): SeedTicketType[] {
  return [
    {
      code: 'VIP',
      name: 'VIP',
      description: 'Premium seeded allocation.',
      priceVnd: basePriceVnd * 2,
      totalQuantity: 300,
      maxPerUser: 4,
      zoneElementIds: ['zone-vip'],
    },
    {
      code: 'STANDARD',
      name: 'Standard',
      description: 'Main seeded allocation.',
      priceVnd: basePriceVnd,
      totalQuantity: 1200,
      maxPerUser: 6,
      zoneElementIds: ['zone-standard'],
    },
    {
      code: 'ECONOMY',
      name: 'Economy',
      description: 'Entry seeded allocation.',
      priceVnd: Math.max(50000, Math.floor(basePriceVnd * 0.55)),
      totalQuantity: 2000,
      maxPerUser: 8,
      zoneElementIds: ['zone-economy'],
    },
  ];
}

function eventSeeds(params: {
  eventType: EventType;
  slugPrefix: string;
  titles: string[];
  artistName: string;
  description: string;
  venueName: string;
  venueAddress: string;
  city: string;
  startsInDaysBase: number;
  basePriceVnd: number;
}): SeedConcert[] {
  return params.titles.map((title, index) => ({
    slug: `${params.slugPrefix}-${index + 1}-2026`,
    title,
    artistName: params.artistName,
    description: params.description,
    venueName: params.venueName,
    venueAddress: params.venueAddress,
    city: params.city,
    startsInDays: params.startsInDaysBase + index * 9,
    eventType: params.eventType,
    zones: standardZones,
    ticketTypes: standardTicketTypes(params.basePriceVnd),
  }));
}

const seedConcerts: SeedConcert[] = [
  {
    slug: 'anh-trai-say-hi-2026',
    title: 'Anh Trai Say Hi Live Concert',
    artistName: 'Anh Trai Say Hi',
    description: 'Demo concert for high-demand boy band ticketing scenarios.',
    venueName: 'San van dong My Dinh',
    venueAddress: 'Le Duc Tho, Nam Tu Liem',
    city: 'Ha Noi',
    startsInDays: 30,
    eventType: EventType.CONCERT,
    zones: [
      { svgElementId: 'zone-svip', label: 'SVIP', color: '#E11D48', displayOrder: 1 },
      { svgElementId: 'zone-vip', label: 'VIP', color: '#F97316', displayOrder: 2 },
      { svgElementId: 'zone-ga', label: 'GA', color: '#2563EB', displayOrder: 3 },
    ],
    ticketTypes: [
      {
        code: 'SVIP',
        name: 'SVIP',
        description: 'Small premium pool used for oversell and per-user limit demos.',
        priceVnd: 4500000,
        totalQuantity: 200,
        maxPerUser: 2,
        zoneElementIds: ['zone-svip'],
      },
      {
        code: 'VIP',
        name: 'VIP',
        description: 'Premium seating close to the stage.',
        priceVnd: 2800000,
        totalQuantity: 1000,
        maxPerUser: 4,
        zoneElementIds: ['zone-vip'],
      },
      {
        code: 'GA',
        name: 'General Admission',
        description: 'Standing general admission area.',
        priceVnd: 1200000,
        totalQuantity: 5000,
        maxPerUser: 6,
        zoneElementIds: ['zone-ga'],
      },
    ],
  },
  {
    slug: 'anh-trai-vuot-ngan-chong-gai-2026',
    title: 'Anh Trai Vuot Ngan Chong Gai Concert',
    artistName: 'Anh Trai Vuot Ngan Chong Gai',
    description: 'Demo concert with multiple seated categories.',
    venueName: 'Nha thi dau Phu Tho',
    venueAddress: '1 Lu Gia, Quan 11',
    city: 'Ho Chi Minh City',
    startsInDays: 45,
    eventType: EventType.CONCERT,
    zones: [
      { svgElementId: 'zone-diamond', label: 'Diamond', color: '#7C3AED', displayOrder: 1 },
      { svgElementId: 'zone-gold', label: 'Gold', color: '#D97706', displayOrder: 2 },
      { svgElementId: 'zone-cat1', label: 'CAT 1', color: '#059669', displayOrder: 3 },
      { svgElementId: 'zone-cat2', label: 'CAT 2', color: '#0891B2', displayOrder: 4 },
    ],
    ticketTypes: [
      {
        code: 'DIAMOND',
        name: 'Diamond',
        description: 'Best seated category.',
        priceVnd: 3900000,
        totalQuantity: 350,
        maxPerUser: 2,
        zoneElementIds: ['zone-diamond'],
      },
      {
        code: 'GOLD',
        name: 'Gold',
        description: 'Central seated category.',
        priceVnd: 2500000,
        totalQuantity: 900,
        maxPerUser: 4,
        zoneElementIds: ['zone-gold'],
      },
      {
        code: 'CAT1',
        name: 'CAT 1',
        description: 'Upper bowl category one.',
        priceVnd: 1600000,
        totalQuantity: 1600,
        maxPerUser: 6,
        zoneElementIds: ['zone-cat1'],
      },
      {
        code: 'CAT2',
        name: 'CAT 2',
        description: 'Upper bowl category two.',
        priceVnd: 900000,
        totalQuantity: 2200,
        maxPerUser: 6,
        zoneElementIds: ['zone-cat2'],
      },
    ],
  },
  {
    slug: 'em-xinh-say-hi-2026',
    title: 'Em Xinh Say Hi Showcase',
    artistName: 'Em Xinh Say Hi',
    description: 'Demo showcase with couple and standing ticket types.',
    venueName: 'Trung tam Hoi nghi Quoc gia',
    venueAddress: 'Pham Hung, Nam Tu Liem',
    city: 'Ha Noi',
    startsInDays: 60,
    eventType: EventType.CONCERT,
    zones: [
      { svgElementId: 'zone-vip-left', label: 'VIP Left', color: '#DB2777', displayOrder: 1 },
      { svgElementId: 'zone-vip-right', label: 'VIP Right', color: '#BE185D', displayOrder: 2 },
      { svgElementId: 'zone-standing', label: 'Standing', color: '#16A34A', displayOrder: 3 },
    ],
    ticketTypes: [
      {
        code: 'VIP',
        name: 'VIP',
        description: 'VIP seating on both sides of the main stage.',
        priceVnd: 2200000,
        totalQuantity: 700,
        maxPerUser: 4,
        zoneElementIds: ['zone-vip-left', 'zone-vip-right'],
      },
      {
        code: 'COUPLE',
        name: 'Couple',
        description: 'Two-person package mapped to VIP areas.',
        priceVnd: 3800000,
        totalQuantity: 250,
        maxPerUser: 2,
        zoneElementIds: ['zone-vip-left', 'zone-vip-right'],
      },
      {
        code: 'STANDING',
        name: 'Standing',
        description: 'Standing floor area.',
        priceVnd: 1100000,
        totalQuantity: 2000,
        maxPerUser: 6,
        zoneElementIds: ['zone-standing'],
      },
    ],
  },
  {
    slug: 'chi-dep-dap-gio-re-song-2026',
    title: 'Chi Dep Dap Gio Re Song Gala',
    artistName: 'Chi Dep Dap Gio Re Song',
    description: 'Demo gala concert with tiered seating.',
    venueName: 'Cung Dien Kinh My Dinh',
    venueAddress: 'Tran Huu Duc, Nam Tu Liem',
    city: 'Ha Noi',
    startsInDays: 75,
    eventType: EventType.CONCERT,
    zones: [
      { svgElementId: 'zone-svip', label: 'SVIP', color: '#DC2626', displayOrder: 1 },
      { svgElementId: 'zone-cat1-a', label: 'CAT 1A', color: '#4F46E5', displayOrder: 2 },
      { svgElementId: 'zone-cat1-b', label: 'CAT 1B', color: '#4338CA', displayOrder: 3 },
      { svgElementId: 'zone-cat2', label: 'CAT 2', color: '#0D9488', displayOrder: 4 },
    ],
    ticketTypes: [
      {
        code: 'SVIP',
        name: 'SVIP',
        description: 'Premium gala seats.',
        priceVnd: 4200000,
        totalQuantity: 180,
        maxPerUser: 2,
        zoneElementIds: ['zone-svip'],
      },
      {
        code: 'CAT1',
        name: 'CAT 1',
        description: 'Category one across two SVG sections.',
        priceVnd: 2100000,
        totalQuantity: 1200,
        maxPerUser: 4,
        zoneElementIds: ['zone-cat1-a', 'zone-cat1-b'],
      },
      {
        code: 'CAT2',
        name: 'CAT 2',
        description: 'Accessible upper category.',
        priceVnd: 950000,
        totalQuantity: 1800,
        maxPerUser: 6,
        zoneElementIds: ['zone-cat2'],
      },
    ],
  },
  // --- Concerts spanning past / near-term so the concert-end assignment filter and
  // listings are exercisable. Standard SVIP/VIP/GA layout. ---
  ...(['ended-20', 'ended-3', 'near-2'] as const).map((tag, idx) => {
    const startsInDays = tag === 'ended-20' ? -20 : tag === 'ended-3' ? -3 : 2;
    return {
      slug: `demo-${tag}`,
      title:
        tag === 'near-2'
          ? 'Live Fest (Sap dien ra)'
          : `Retro Live ${tag === 'ended-20' ? 'Vol.1' : 'Vol.2'} (Da ket thuc)`,
      artistName: `Demo Artist ${idx + 1}`,
      description: 'Seeded concert for time-window coverage (past/near).',
      venueName: 'Nha hat Hoa Binh',
      venueAddress: '240 3/2, Quan 10',
      city: 'Ho Chi Minh City',
      startsInDays,
      eventType: EventType.CONCERT,
      zones: [
        { svgElementId: 'zone-svip', label: 'SVIP', color: '#E11D48', displayOrder: 1 },
        { svgElementId: 'zone-vip', label: 'VIP', color: '#F97316', displayOrder: 2 },
        { svgElementId: 'zone-ga', label: 'GA', color: '#2563EB', displayOrder: 3 },
      ],
      ticketTypes: [
        {
          code: 'SVIP',
          name: 'SVIP',
          description: 'Premium.',
          priceVnd: 3000000,
          totalQuantity: 150,
          maxPerUser: 2,
          zoneElementIds: ['zone-svip'],
        },
        {
          code: 'VIP',
          name: 'VIP',
          description: 'Premium seating.',
          priceVnd: 1800000,
          totalQuantity: 600,
          maxPerUser: 4,
          zoneElementIds: ['zone-vip'],
        },
        {
          code: 'GA',
          name: 'General Admission',
          description: 'Standing.',
          priceVnd: 800000,
          totalQuantity: 3000,
          maxPerUser: 6,
          zoneElementIds: ['zone-ga'],
        },
      ],
    };
  }),
  ...eventSeeds({
    eventType: EventType.CONCERT,
    slugPrefix: 'vpop-live',
    titles: [
      'Son Tung M-TP Sky Tour Demo',
      'My Tam Acoustic Night',
      'Den Vau Rap Show',
      'Hoang Thuy Linh Folk Pop Live',
      'Vu Indie Night',
    ],
    artistName: 'Son Tung M-TP',
    description: 'Additional music event seeded for richer discovery and purchase demos.',
    venueName: 'Nha thi dau Quan Khu 7',
    venueAddress: '202 Hoang Van Thu, Tan Binh',
    city: 'Ho Chi Minh City',
    startsInDaysBase: 12,
    basePriceVnd: 950000,
  }),
  ...eventSeeds({
    eventType: EventType.WORKSHOP,
    slugPrefix: 'workshop-demo',
    titles: [
      'AI Product Builder Workshop',
      'Startup Growth Masterclass',
      'Frontend Design Systems Bootcamp',
      'Data Analytics for Business',
      'Creator Economy Lab',
    ],
    artistName: 'TicketBox Workshop',
    description: 'Workshop seeded for non-music marketplace coverage.',
    venueName: 'Dreamplex Nguyen Trung Ngan',
    venueAddress: '21 Nguyen Trung Ngan, Quan 1',
    city: 'Ho Chi Minh City',
    startsInDaysBase: 8,
    basePriceVnd: 450000,
  }),
  ...eventSeeds({
    eventType: EventType.SPORT,
    slugPrefix: 'sport-demo',
    titles: [
      'Vietnam Basketball Showcase',
      'Hanoi Night Run',
      'Saigon Futsal Derby',
      'Pickleball Open Day',
      'Youth Football Cup',
    ],
    artistName: 'TicketBox Sports',
    description: 'Sports event seeded for marketplace category coverage.',
    venueName: 'Cung the thao Tien Son',
    venueAddress: 'Phan Dang Luu, Hai Chau',
    city: 'Da Nang',
    startsInDaysBase: 15,
    basePriceVnd: 250000,
  }),
  ...eventSeeds({
    eventType: EventType.MOVIE,
    slugPrefix: 'movie-demo',
    titles: [
      'Indie Film Premiere',
      'Outdoor Cinema Night',
      'Animation Fan Screening',
      'Documentary Weekend',
      'Classic Movie Marathon',
    ],
    artistName: 'TicketBox Cinema',
    description: 'Movie screening seeded for marketplace category coverage.',
    venueName: 'CGV Landmark 81',
    venueAddress: '720A Dien Bien Phu, Binh Thanh',
    city: 'Ho Chi Minh City',
    startsInDaysBase: 18,
    basePriceVnd: 180000,
  }),
  ...eventSeeds({
    eventType: EventType.THEATRE,
    slugPrefix: 'theatre-demo',
    titles: [
      'Contemporary Dance Stage',
      'Weekend Comedy Play',
      'Cai Luong Heritage Night',
      'Modern Drama Showcase',
      'Family Musical Matinee',
    ],
    artistName: 'TicketBox Theatre',
    description: 'Theatre event seeded for marketplace category coverage.',
    venueName: 'Nha hat Thanh pho',
    venueAddress: '7 Cong Truong Lam Son, Quan 1',
    city: 'Ho Chi Minh City',
    startsInDaysBase: 22,
    basePriceVnd: 350000,
  }),
  ...eventSeeds({
    eventType: EventType.VOUCHER,
    slugPrefix: 'voucher-demo',
    titles: [
      'Food Festival Voucher Pack',
      'Coffee Tasting Voucher',
      'Family Entertainment Pass',
      'Museum Weekend Pass',
      'Wellness Day Voucher',
    ],
    artistName: 'TicketBox Voucher',
    description: 'Voucher product seeded for marketplace category coverage.',
    venueName: 'TicketBox Partner Network',
    venueAddress: 'Multiple redemption points',
    city: 'Ho Chi Minh City',
    startsInDaysBase: 5,
    basePriceVnd: 120000,
  }),
];

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(13, 0, 0, 0);
  return date;
}

async function seedRoles(): Promise<Map<RoleCode, string>> {
  const roles = [
    { code: RoleCode.AUDIENCE, name: 'Audience', description: 'Browse concerts and buy tickets.' },
    {
      code: RoleCode.ORGANIZER,
      name: 'Organizer',
      description: 'Manage concerts and ticket types.',
    },
    {
      code: RoleCode.CHECKIN_STAFF,
      name: 'Check-in Staff',
      description: 'Scan tickets at assigned gates.',
    },
    { code: RoleCode.ADMIN, name: 'Admin', description: 'Operate the TicketBox platform.' },
  ];

  const roleIds = new Map<RoleCode, string>();
  for (const role of roles) {
    const record = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: role,
    });
    roleIds.set(record.code, record.id);
  }

  return roleIds;
}

async function seedUsers(
  roleIds: Map<RoleCode, string>,
): Promise<{ organizerId: string; staffId: string }> {
  const users = [
    {
      email: 'audience@ticketbox.test',
      displayName: 'TicketBox Audience',
      roles: [RoleCode.AUDIENCE],
    },
    {
      email: 'organizer@ticketbox.test',
      displayName: 'TicketBox Organizer',
      roles: [RoleCode.ORGANIZER],
    },
    {
      email: 'staff@ticketbox.test',
      displayName: 'TicketBox Check-in Staff',
      roles: [RoleCode.CHECKIN_STAFF],
    },
    {
      email: 'admin@ticketbox.test',
      displayName: 'TicketBox Admin',
      roles: [RoleCode.ADMIN],
    },
  ];

  let organizerId = '';
  let staffId = '';

  for (const user of users) {
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        displayName: user.displayName,
        passwordHash: demoPasswordHash,
        status: UserStatus.ACTIVE,
      },
      create: {
        email: user.email,
        displayName: user.displayName,
        passwordHash: demoPasswordHash,
        status: UserStatus.ACTIVE,
      },
    });

    for (const roleCode of user.roles) {
      const roleId = roleIds.get(roleCode);
      if (!roleId) {
        throw new Error(`Missing role id for ${roleCode}`);
      }
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: record.id, roleId } },
        update: {},
        create: { userId: record.id, roleId },
      });
    }

    if (user.email === 'organizer@ticketbox.test') {
      organizerId = record.id;
    }
    if (user.email === 'staff@ticketbox.test') {
      staffId = record.id;
    }
  }

  return { organizerId, staffId };
}

// Real, keyword-themed, deterministic demo images (LoremFlickr serves real Flickr photos).
function concertImageUrl(idx: number): string {
  return `https://loremflickr.com/1200/675/concert,music,stage/all?lock=${100 + idx}`;
}
function artistImageUrl(idx: number): string {
  return `https://loremflickr.com/600/600/singer,musician,portrait/all?lock=${200 + idx}`;
}

// Real (chinh chu) artist portraits from Wikimedia Commons (free license, hotlink-stable).
// Shows/placeholder artists keep the themed LoremFlickr fallback.
const ARTIST_IMAGE_OVERRIDES: Record<string, string> = {
  'son-tung-mtp':
    'https://upload.wikimedia.org/wikipedia/commons/4/41/Son_Tung_M-TP_1_%282021%29.png',
  'my-tam':
    'https://upload.wikimedia.org/wikipedia/commons/8/87/MY_TAM_-_LIGHT_%26_SHADOW_LIVE_-_INAX_VIETNAM.jpg',
  'den-vau': 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Den_Vau_in_Song_Gallery_2021.jpg',
  'hoang-thuy-linh': 'https://upload.wikimedia.org/wikipedia/commons/2/28/HOANG_THUY_LINH.jpg',
  vu: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/V%C5%A8_-_CHILL_CLUB_HK_2024.png',
  'phan-manh-quynh':
    'https://upload.wikimedia.org/wikipedia/commons/c/c7/Phan_M%E1%BA%A1nh_Qu%E1%BB%B3nh.png',
  tlinh:
    'https://upload.wikimedia.org/wikipedia/commons/4/49/TLINH_%E2%80%93_CF%26Y_2023_%E2%80%93_OFFICIAL_PORTRAIT_PHOTO.png',
  hieuthuhai: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/HIEUTHUHAI.jpg',
};

async function upsertAsset(params: {
  kind: AssetKind;
  slug: string;
  suffix: string;
  originalName: string;
  contentType: string;
  uploadedById: string;
  imageUrl?: string;
}): Promise<string> {
  const storageKey = `demo/${params.slug}/${params.suffix}`;
  const publicUrl = params.imageUrl ?? `${assetPublicBaseUrl}/${storageKey}`;
  const asset = await prisma.asset.upsert({
    where: { storageKey },
    update: {
      kind: params.kind,
      status: AssetStatus.ACTIVE,
      publicUrl,
      originalName: params.originalName,
      contentType: params.contentType,
      uploadedById: params.uploadedById,
    },
    create: {
      kind: params.kind,
      status: AssetStatus.ACTIVE,
      storageKey,
      publicUrl,
      originalName: params.originalName,
      contentType: params.contentType,
      uploadedById: params.uploadedById,
      metadata: { seeded: true },
    },
  });

  return asset.id;
}

async function seedArtists(organizerId: string): Promise<Map<string, string>> {
  const artists = [
    {
      slug: 'anh-trai-say-hi',
      displayName: 'Anh Trai Say Hi',
      bio: 'Popular boy band showcase group.',
    },
    {
      slug: 'anh-trai-vuot-ngan-chong-gai',
      displayName: 'Anh Trai Vuot Ngan Chong Gai',
      bio: 'Legendary male artists reunion.',
    },
    {
      slug: 'em-xinh-say-hi',
      displayName: 'Em Xinh Say Hi',
      bio: 'Rising stars female artists showcase.',
    },
    {
      slug: 'chi-dep-dap-gio-re-song',
      displayName: 'Chi Dep Dap Gio Re Song',
      bio: 'Top female artists performing together.',
    },
    {
      slug: 'demo-artist-1',
      displayName: 'Demo Artist 1',
      bio: 'Seeded artist for catalog breadth.',
    },
    {
      slug: 'demo-artist-2',
      displayName: 'Demo Artist 2',
      bio: 'Seeded artist for catalog breadth.',
    },
    {
      slug: 'demo-artist-3',
      displayName: 'Demo Artist 3',
      bio: 'Seeded artist for catalog breadth.',
    },
    { slug: 'son-tung-mtp', displayName: 'Son Tung M-TP', bio: 'V-pop superstar.' },
    { slug: 'my-tam', displayName: 'My Tam', bio: 'Iconic Vietnamese diva.' },
    { slug: 'den-vau', displayName: 'Den Vau', bio: 'Beloved indie rapper.' },
    { slug: 'hoang-thuy-linh', displayName: 'Hoang Thuy Linh', bio: 'Folk-pop performer.' },
    { slug: 'vu', displayName: 'Vu.', bio: 'Indie singer-songwriter.' },
    { slug: 'hieuthuhai', displayName: 'HIEUTHUHAI', bio: 'Rising rap star.' },
    { slug: 'phan-manh-quynh', displayName: 'Phan Manh Quynh', bio: 'Ballad songwriter.' },
    { slug: 'tlinh', displayName: 'tlinh', bio: 'Gen-Z rap/pop artist.' },
  ];

  const artistMap = new Map<string, string>();
  for (const [idx, artist] of artists.entries()) {
    const avatarAssetId = await upsertAsset({
      kind: AssetKind.POSTER,
      slug: `artist/${artist.slug}`,
      suffix: 'avatar.jpg',
      originalName: `${artist.slug}-avatar.jpg`,
      contentType: 'image/jpeg',
      uploadedById: organizerId,
      imageUrl: ARTIST_IMAGE_OVERRIDES[artist.slug] ?? artistImageUrl(idx),
    });
    const record = await prisma.artist.upsert({
      where: { slug: artist.slug },
      update: {
        displayName: artist.displayName,
        bio: artist.bio,
        status: 'ACTIVE',
        avatarAssetId,
        posterAssetId: avatarAssetId,
      },
      create: {
        slug: artist.slug,
        displayName: artist.displayName,
        bio: artist.bio,
        status: 'ACTIVE',
        avatarAssetId,
        posterAssetId: avatarAssetId,
      },
    });
    artistMap.set(record.displayName, record.id);
  }
  return artistMap;
}

async function seedConcertData(
  organizerId: string,
  staffId: string,
  artistMap: Map<string, string>,
): Promise<void> {
  const saleStartsAt = daysFromNow(-1);
  const saleEndsAt = daysFromNow(120);

  for (const [concertIndex, concertSeed] of seedConcerts.entries()) {
    const posterImage = concertImageUrl(concertIndex);
    const posterAssetId = await upsertAsset({
      kind: AssetKind.POSTER,
      slug: concertSeed.slug,
      suffix: 'poster.jpg',
      originalName: `${concertSeed.slug}-poster.jpg`,
      contentType: 'image/jpeg',
      uploadedById: organizerId,
      imageUrl: posterImage,
    });
    const bannerAssetId = await upsertAsset({
      kind: AssetKind.POSTER,
      slug: concertSeed.slug,
      suffix: 'banner.jpg',
      originalName: `${concertSeed.slug}-banner.jpg`,
      contentType: 'image/jpeg',
      uploadedById: organizerId,
      imageUrl: posterImage,
    });
    const seatingMapAssetId = await upsertAsset({
      kind: AssetKind.SEATING_MAP,
      slug: concertSeed.slug,
      suffix: 'seating-map.svg',
      originalName: `${concertSeed.slug}-seating-map.svg`,
      contentType: 'image/svg+xml',
      uploadedById: organizerId,
    });

    const startsAt = daysFromNow(concertSeed.startsInDays);
    const endsAt = new Date(startsAt);
    endsAt.setUTCHours(16, 0, 0, 0);

    const concert = await prisma.concert.upsert({
      where: { slug: concertSeed.slug },
      update: {
        title: concertSeed.title,
        artistName: concertSeed.artistName,
        description: concertSeed.description,
        venueName: concertSeed.venueName,
        venueAddress: concertSeed.venueAddress,
        city: concertSeed.city,
        startsAt,
        endsAt,
        status: ConcertStatus.PUBLISHED,
        eventType: concertSeed.eventType,
        createdById: organizerId,
        posterAssetId,
        seatingMapAssetId,
        bannerAssetId,
        seoImageUrl: posterImage,
        publishedAt: new Date(),
      },
      create: {
        slug: concertSeed.slug,
        title: concertSeed.title,
        artistName: concertSeed.artistName,
        description: concertSeed.description,
        venueName: concertSeed.venueName,
        venueAddress: concertSeed.venueAddress,
        city: concertSeed.city,
        startsAt,
        endsAt,
        status: ConcertStatus.PUBLISHED,
        eventType: concertSeed.eventType,
        createdById: organizerId,
        posterAssetId,
        seatingMapAssetId,
        bannerAssetId,
        seoImageUrl: posterImage,
        publishedAt: new Date(),
      },
    });

    const artistId = artistMap.get(concertSeed.artistName);
    if (artistId) {
      await prisma.concertArtist.upsert({
        where: { concertId_artistId: { concertId: concert.id, artistId } },
        update: { displayOrder: 0 },
        create: { concertId: concert.id, artistId, displayOrder: 0 },
      });
    }

    await prisma.checkinStaffAssignment.upsert({
      where: {
        staffId_concertId_gateName: {
          staffId,
          concertId: concert.id,
          gateName: 'Main Gate',
        },
      },
      update: {
        status: 'ACTIVE',
      },
      create: {
        staffId,
        concertId: concert.id,
        gateName: 'Main Gate',
        status: 'ACTIVE',
      },
    });

    const zoneIds = new Map<string, string>();
    for (const zoneSeed of concertSeed.zones) {
      const zone = await prisma.seatingZone.upsert({
        where: {
          concertId_svgElementId: {
            concertId: concert.id,
            svgElementId: zoneSeed.svgElementId,
          },
        },
        update: {
          label: zoneSeed.label,
          color: zoneSeed.color,
          displayOrder: zoneSeed.displayOrder,
          status: SeatingZoneStatus.ACTIVE,
        },
        create: {
          concertId: concert.id,
          svgElementId: zoneSeed.svgElementId,
          label: zoneSeed.label,
          color: zoneSeed.color,
          displayOrder: zoneSeed.displayOrder,
          status: SeatingZoneStatus.ACTIVE,
        },
      });
      zoneIds.set(zoneSeed.svgElementId, zone.id);
    }

    for (const ticketTypeSeed of concertSeed.ticketTypes) {
      const ticketType = await prisma.ticketType.upsert({
        where: {
          concertId_code: {
            concertId: concert.id,
            code: ticketTypeSeed.code,
          },
        },
        update: {
          name: ticketTypeSeed.name,
          description: ticketTypeSeed.description,
          priceVnd: ticketTypeSeed.priceVnd,
          totalQuantity: ticketTypeSeed.totalQuantity,
          reservedQuantity: 0,
          soldQuantity: 0,
          maxPerUser: ticketTypeSeed.maxPerUser,
          saleStartsAt,
          saleEndsAt,
          status: TicketTypeStatus.ACTIVE,
        },
        create: {
          concertId: concert.id,
          code: ticketTypeSeed.code,
          name: ticketTypeSeed.name,
          description: ticketTypeSeed.description,
          priceVnd: ticketTypeSeed.priceVnd,
          totalQuantity: ticketTypeSeed.totalQuantity,
          reservedQuantity: 0,
          soldQuantity: 0,
          maxPerUser: ticketTypeSeed.maxPerUser,
          saleStartsAt,
          saleEndsAt,
          status: TicketTypeStatus.ACTIVE,
        },
      });

      for (const svgElementId of ticketTypeSeed.zoneElementIds) {
        const seatingZoneId = zoneIds.get(svgElementId);
        if (!seatingZoneId) {
          throw new Error(`Missing seating zone ${svgElementId} for ${concertSeed.slug}`);
        }
        await prisma.ticketTypeZone.upsert({
          where: {
            ticketTypeId_seatingZoneId: {
              ticketTypeId: ticketType.id,
              seatingZoneId,
            },
          },
          update: {
            concertId: concert.id,
          },
          create: {
            ticketTypeId: ticketType.id,
            seatingZoneId,
            concertId: concert.id,
          },
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Tier 1 — audience users
// ---------------------------------------------------------------------------
const AUDIENCE_FIRST = ['An', 'Binh', 'Chi', 'Dung', 'Giang', 'Ha', 'Khanh', 'Linh', 'Minh', 'Nam'];
const AUDIENCE_LAST = ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang'];

async function seedAudienceUsers(roleIds: Map<RoleCode, string>): Promise<string[]> {
  const audienceRoleId = roleIds.get(RoleCode.AUDIENCE)!;
  const ids: string[] = [];
  for (let i = 0; i < 20; i++) {
    const id = detId(`audience-${i}`);
    const email = `seed.audience${pad(i)}@ticketbox.test`;
    const displayName = `${AUDIENCE_FIRST[i % AUDIENCE_FIRST.length]} ${AUDIENCE_LAST[i % AUDIENCE_LAST.length]}`;
    await prisma.user.upsert({
      where: { id },
      update: { displayName, passwordHash: demoPasswordHash, status: UserStatus.ACTIVE },
      create: { id, email, displayName, passwordHash: demoPasswordHash, status: UserStatus.ACTIVE },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: id, roleId: audienceRoleId } },
      update: {},
      create: { userId: id, roleId: audienceRoleId },
    });
    ids.push(id);
  }
  return ids;
}

async function seedExtraStaff(roleIds: Map<RoleCode, string>): Promise<string[]> {
  const staffRoleId = roleIds.get(RoleCode.CHECKIN_STAFF)!;
  const ids: string[] = [];
  for (let i = 0; i < 3; i++) {
    const id = detId(`staff-extra-${i}`);
    await prisma.user.upsert({
      where: { id },
      update: {
        displayName: `Check-in Staff ${i + 2}`,
        passwordHash: demoPasswordHash,
        status: UserStatus.ACTIVE,
      },
      create: {
        id,
        email: `seed.staff${pad(i)}@ticketbox.test`,
        displayName: `Check-in Staff ${i + 2}`,
        passwordHash: demoPasswordHash,
        status: UserStatus.ACTIVE,
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: id, roleId: staffRoleId } },
      update: {},
      create: { userId: id, roleId: staffRoleId },
    });
    ids.push(id);
  }
  return ids;
}

type CatalogConcert = {
  id: string;
  concertId: string;
  startsAt: Date;
  ticketTypes: { id: string; code: string; priceVnd: number }[];
};

interface SeededPaidOrder {
  orderId: string;
  userId: string;
  concertId: string;
  ticketTypeId: string;
  ticketIds: string[];
}

// ---------------------------------------------------------------------------
// Tier 1 — orders, items, payments, tickets (with valid QR), check-ins
// ---------------------------------------------------------------------------
async function seedTransactions(
  audienceIds: string[],
  concerts: CatalogConcert[],
  staffId: string,
): Promise<SeededPaidOrder[]> {
  const ORDER_COUNT = 50;
  const paidOrders: SeededPaidOrder[] = [];

  for (let i = 0; i < ORDER_COUNT; i++) {
    const userId = audienceIds[i % audienceIds.length];
    const concert = concerts[i % concerts.length];
    const tt = concert.ticketTypes[i % concert.ticketTypes.length];
    const qty = (i % 3) + 1;
    const bucket = i % 10; // 0-7 PAID, 8 PENDING, 9 CANCELLED
    const status =
      bucket < 8
        ? OrderStatus.PAID
        : bucket === 8
          ? OrderStatus.PENDING_PAYMENT
          : OrderStatus.CANCELLED;
    const subtotal = tt.priceVnd * qty;
    const orderId = detId(`order-${i}`);
    const createdAt = hoursAgo(ORDER_COUNT - i + 24);
    const paidAt = status === OrderStatus.PAID ? hoursAgo(ORDER_COUNT - i) : null;

    await prisma.order.upsert({
      where: { id: orderId },
      update: {
        userId,
        concertId: concert.concertId,
        idempotencyKey: `seed-ord-${i}`,
        status,
        subtotalVnd: subtotal,
        totalAmountVnd: subtotal,
        reservationExpiresAt:
          status === OrderStatus.PENDING_PAYMENT ? new Date(Date.now() + 15 * 60 * 1000) : null,
        paidAt,
        cancelledAt: status === OrderStatus.CANCELLED ? createdAt : null,
      },
      create: {
        id: orderId,
        orderNumber: `SEED-ORD-${pad(i)}`,
        userId,
        concertId: concert.concertId,
        idempotencyKey: `seed-ord-${i}`,
        status,
        subtotalVnd: subtotal,
        totalAmountVnd: subtotal,
        reservationExpiresAt:
          status === OrderStatus.PENDING_PAYMENT ? new Date(Date.now() + 15 * 60 * 1000) : null,
        paidAt,
        cancelledAt: status === OrderStatus.CANCELLED ? createdAt : null,
        createdAt,
      },
    });

    const orderItemId = detId(`orderitem-${i}`);
    await prisma.orderItem.upsert({
      where: { id: orderItemId },
      update: {
        orderId,
        ticketTypeId: tt.id,
        quantity: qty,
        unitPriceVnd: tt.priceVnd,
        totalPriceVnd: subtotal,
      },
      create: {
        id: orderItemId,
        orderId,
        ticketTypeId: tt.id,
        quantity: qty,
        unitPriceVnd: tt.priceVnd,
        totalPriceVnd: subtotal,
      },
    });

    // Payment
    const paymentId = detId(`payment-${i}`);
    const payStatus =
      status === OrderStatus.PAID
        ? PaymentStatus.SUCCEEDED
        : status === OrderStatus.CANCELLED
          ? PaymentStatus.CANCELLED
          : PaymentStatus.PENDING;
    await prisma.payment.upsert({
      where: { id: paymentId },
      update: {
        orderId,
        userId,
        provider: 'SIMULATOR',
        providerTransactionId: `seed-txn-${pad(i)}`,
        status: payStatus,
        amountVnd: subtotal,
        completedAt: paidAt,
      },
      create: {
        id: paymentId,
        orderId,
        userId,
        provider: 'SIMULATOR',
        providerTransactionId: `seed-txn-${pad(i)}`,
        status: payStatus,
        amountVnd: subtotal,
        completedAt: paidAt,
        createdAt,
      },
    });
    const paymentEventId = detId(`payevent-${i}`);
    await prisma.paymentEvent.upsert({
      where: { id: paymentEventId },
      update: {
        paymentId,
        eventType:
          status === OrderStatus.PAID
            ? PaymentEventType.CALLBACK_RECEIVED
            : PaymentEventType.REDIRECT_CREATED,
        providerEventId: `seed-evt-${pad(i)}`,
        providerTransactionId: `seed-txn-${pad(i)}`,
      },
      create: {
        id: paymentEventId,
        paymentId,
        eventType:
          status === OrderStatus.PAID
            ? PaymentEventType.CALLBACK_RECEIVED
            : PaymentEventType.REDIRECT_CREATED,
        providerEventId: `seed-evt-${pad(i)}`,
        providerTransactionId: `seed-txn-${pad(i)}`,
      },
    });

    if (status !== OrderStatus.PAID) continue;

    // Issue tickets with valid QR; ~20% already checked in
    const ticketIds: string[] = [];
    for (let k = 0; k < qty; k++) {
      const ticketId = detId(`ticket-${i}-${k}`);
      const ticketNumber = `SEED-TCK-${pad(i)}-${k}`;
      const issuedAt = paidAt ?? createdAt;
      const qrPayload = qrService.createPayload({
        ticketId,
        ticketNumber,
        orderId,
        userId,
        concertId: concert.concertId,
        issuedAt,
      });
      const qrTokenHash = qrService.hashPayload(qrPayload);
      const checkedIn = i % 5 === 0 && k === 0;
      const checkedInAt = checkedIn ? hoursAgo(1) : null;
      await prisma.ticket.upsert({
        where: { id: ticketId },
        update: {
          ticketNumber,
          orderId,
          orderItemId,
          userId,
          concertId: concert.concertId,
          ticketTypeId: tt.id,
          status: checkedIn ? TicketStatus.CHECKED_IN : TicketStatus.ISSUED,
          issuedAt,
          checkedInAt,
          qrTokenHash,
        },
        create: {
          id: ticketId,
          ticketNumber,
          orderId,
          orderItemId,
          userId,
          concertId: concert.concertId,
          ticketTypeId: tt.id,
          qrTokenHash,
          status: checkedIn ? TicketStatus.CHECKED_IN : TicketStatus.ISSUED,
          issuedAt,
          checkedInAt,
        },
      });
      if (checkedIn) {
        const checkinId = detId(`checkin-${i}-${k}`);
        await prisma.checkinEvent.upsert({
          where: { id: checkinId },
          update: {
            ticketId,
            concertId: concert.concertId,
            staffId,
            source: CheckinEventSource.ONLINE,
            result: CheckinEventResult.ACCEPTED,
            scannedQrHash: qrTokenHash,
            occurredAt: checkedInAt ?? hoursAgo(1),
          },
          create: {
            id: checkinId,
            ticketId,
            concertId: concert.concertId,
            staffId,
            source: CheckinEventSource.ONLINE,
            result: CheckinEventResult.ACCEPTED,
            scannedQrHash: qrTokenHash,
            occurredAt: checkedInAt ?? hoursAgo(1),
          },
        });
      }
      ticketIds.push(ticketId);
    }
    paidOrders.push({
      orderId,
      userId,
      concertId: concert.concertId,
      ticketTypeId: tt.id,
      ticketIds,
    });
  }

  // Reconcile against all current order items so re-running the seed does not corrupt
  // availability on a database that already contains non-seed demo activity.
  const ticketTypes = await prisma.ticketType.findMany({
    select: {
      id: true,
      orderItems: {
        select: {
          quantity: true,
          order: { select: { status: true } },
        },
      },
    },
  });
  for (const ticketType of ticketTypes) {
    const soldQuantity = ticketType.orderItems
      .filter((item) => item.order.status === OrderStatus.PAID)
      .reduce((total, item) => total + item.quantity, 0);
    const reservedQuantity = ticketType.orderItems
      .filter((item) => item.order.status === OrderStatus.PENDING_PAYMENT)
      .reduce((total, item) => total + item.quantity, 0);

    await prisma.ticketType.update({
      where: { id: ticketType.id },
      data: { soldQuantity, reservedQuantity },
    });
  }

  return paidOrders;
}

// ---------------------------------------------------------------------------
// Tier 1 — notifications for seeded activity
// ---------------------------------------------------------------------------
async function seedNotifications(paidOrders: SeededPaidOrder[]): Promise<void> {
  let n = 0;
  for (const order of paidOrders) {
    const read = n % 3 === 0;
    const base = {
      userId: order.userId,
      concertId: order.concertId,
      type: 'PURCHASE_CONFIRMATION',
      subject: 'Xac nhan mua ve',
      body: 'Don hang cua ban da duoc thanh toan. Ve dien tu da san sang.',
      resourceType: NotificationResourceType.ORDER,
      resourceId: order.orderId,
      readAt: read ? hoursAgo(2) : null,
      sentAt: hoursAgo(3),
    };
    await prisma.notification.upsert({
      where: { dedupeKey: `purchase-confirmation:${order.orderId}:in-app` },
      update: { status: NotificationStatus.SENT, readAt: base.readAt },
      create: {
        ...base,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        dedupeKey: `purchase-confirmation:${order.orderId}:in-app`,
      },
    });
    await prisma.notification.upsert({
      where: { dedupeKey: `purchase-confirmation:${order.orderId}:email` },
      update: { status: NotificationStatus.SENT },
      create: {
        ...base,
        readAt: null,
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.SENT,
        dedupeKey: `purchase-confirmation:${order.orderId}:email`,
      },
    });
    n++;
  }
}

// ---------------------------------------------------------------------------
// Tier 2 — promotions
// ---------------------------------------------------------------------------
async function seedPromotions(): Promise<void> {
  const promos = [
    {
      code: 'WELCOME10',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      maxDiscountVnd: 200000,
      isActive: true,
      validDays: 60,
    },
    {
      code: 'SAVE50K',
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 50000,
      isActive: true,
      validDays: 30,
    },
    {
      code: 'VIP15',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 15,
      maxDiscountVnd: 500000,
      isActive: true,
      validDays: 45,
    },
    {
      code: 'EXPIRED20',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      isActive: false,
      validDays: -5,
    },
    {
      code: 'EARLYBIRD',
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 100000,
      isActive: true,
      validDays: 90,
    },
  ];
  for (const p of promos) {
    const id = detId(`promo-${p.code}`);
    await prisma.promotion.upsert({
      where: { code: p.code },
      update: { isActive: p.isActive, discountValue: p.discountValue },
      create: {
        id,
        code: p.code,
        discountType: p.discountType,
        discountValue: p.discountValue,
        maxDiscountVnd: p.maxDiscountVnd ?? null,
        maxUsageCount: 1000,
        maxUsagePerUser: 1,
        validFrom: hoursAgo(24 * 10),
        validUntil: new Date(Date.now() + p.validDays * 24 * 60 * 60 * 1000),
        isActive: p.isActive,
        usedCount: 0,
        applicableEventIds: [],
        applicableCategoryIds: [],
        applicableTicketTypeIds: [],
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Tier 2 — engagement: favorite concerts, artist follows/favorites
// ---------------------------------------------------------------------------
async function seedEngagement(
  audienceIds: string[],
  concertIds: string[],
  artistIds: string[],
): Promise<void> {
  for (let i = 0; i < audienceIds.length; i++) {
    const userId = audienceIds[i];
    for (let j = 0; j < 3; j++) {
      const concertId = concertIds[(i + j) % concertIds.length];
      await prisma.favoriteConcert.upsert({
        where: { userId_concertId: { userId, concertId } },
        update: {},
        create: { userId, concertId },
      });
      const artistId = artistIds[(i + j) % artistIds.length];
      await prisma.artistFollow.upsert({
        where: { userId_artistId: { userId, artistId } },
        update: {},
        create: { id: detId(`follow-${i}-${j}`), userId, artistId },
      });
      await prisma.artistFavorite.upsert({
        where: { userId_artistId: { userId, artistId } },
        update: {},
        create: { id: detId(`artfav-${i}-${j}`), userId, artistId },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Tier 2 — support & refund requests with status history
// ---------------------------------------------------------------------------
async function seedSupportRefunds(paidOrders: SeededPaidOrder[]): Promise<void> {
  const supportStatuses = [
    SupportRequestStatus.OPEN,
    SupportRequestStatus.IN_PROGRESS,
    SupportRequestStatus.RESOLVED,
  ];
  for (let i = 0; i < Math.min(5, paidOrders.length); i++) {
    const o = paidOrders[i];
    const id = detId(`support-${i}`);
    const status = supportStatuses[i % supportStatuses.length];
    await prisma.supportRequest.upsert({
      where: { id },
      update: { status },
      create: {
        id,
        userId: o.userId,
        orderId: o.orderId,
        category: SupportRequestCategory.ORDER_HELP,
        status,
        subject: 'Can ho tro ve don hang',
        message: 'Toi can ho tro voi don hang nay.',
      },
    });
    await prisma.supportRequestStatusHistory.upsert({
      where: { id: detId(`support-hist-${i}`) },
      update: {},
      create: {
        id: detId(`support-hist-${i}`),
        supportRequestId: id,
        status,
        note: 'Trang thai khoi tao.',
      },
    });
  }

  const refundStatuses = [
    RefundRequestStatus.REQUESTED,
    RefundRequestStatus.UNDER_REVIEW,
    RefundRequestStatus.APPROVED,
  ];
  for (let i = 0; i < Math.min(3, paidOrders.length); i++) {
    const o = paidOrders[i];
    const id = detId(`refund-${i}`);
    const status = refundStatuses[i % refundStatuses.length];
    await prisma.refundRequest.upsert({
      where: { id },
      update: { status },
      create: {
        id,
        userId: o.userId,
        orderId: o.orderId,
        status,
        reason: RefundRequestReason.CANNOT_ATTEND,
        message: 'Toi khong the tham du.',
        requestedTicketCount: 1,
      },
    });
    await prisma.refundRequestStatusHistory.upsert({
      where: { id: detId(`refund-hist-${i}`) },
      update: {},
      create: {
        id: detId(`refund-hist-${i}`),
        refundRequestId: id,
        status,
        note: 'Trang thai khoi tao.',
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Tier 2/3 — artist bios + guest list
// ---------------------------------------------------------------------------
async function seedArtistBios(concertIds: string[]): Promise<void> {
  for (let i = 0; i < Math.min(3, concertIds.length); i++) {
    const id = detId(`artistbio-${i}`);
    await prisma.artistBio.upsert({
      where: { id },
      update: { status: ArtistBioStatus.PUBLISHED },
      create: {
        id,
        concertId: concertIds[i],
        status: ArtistBioStatus.PUBLISHED,
        sourceText: 'Press kit source text (seeded).',
        generatedBio: 'Tieu su nghe si duoc tao boi AI (seeded).',
        publishedBio: 'Tieu su nghe si da xuat ban (seeded).',
        provider: 'local',
        retryCount: 0,
        maxAttempts: 3,
      },
    });
  }
}

async function seedGuestList(concertIds: string[], organizerId: string): Promise<void> {
  const concertId = concertIds[0];
  const batchId = detId('guestlist-batch-0');
  await prisma.guestListBatch.upsert({
    where: { id: batchId },
    update: { status: GuestListBatchStatus.COMPLETED },
    create: {
      id: batchId,
      concertId,
      uploadedById: organizerId,
      sourceName: 'sponsor-vip-list.csv',
      importSequence: 1,
      status: GuestListBatchStatus.COMPLETED,
      processingAttempt: 1,
      totalRows: 20,
      validRows: 20,
      invalidRows: 0,
      duplicateRows: 0,
      importedRows: 20,
    },
  });
  for (let i = 0; i < 20; i++) {
    const id = detId(`guestlist-entry-${i}`);
    const email = `vip.guest${pad(i)}@sponsor.test`;
    await prisma.guestListEntry.upsert({
      where: { id },
      update: { status: GuestListEntryStatus.ACTIVE },
      create: {
        id,
        concertId,
        latestBatchId: batchId,
        guestName: `VIP Guest ${i + 1}`,
        email,
        normalizedEmail: email,
        status: GuestListEntryStatus.ACTIVE,
      },
    });
  }
}

async function main(): Promise<void> {
  const roleIds = await seedRoles();
  const { organizerId, staffId } = await seedUsers(roleIds);
  const audienceIds = await seedAudienceUsers(roleIds);
  const extraStaffIds = await seedExtraStaff(roleIds);
  const artistMap = await seedArtists(organizerId);
  await seedConcertData(organizerId, staffId, artistMap);

  // Give extra staff active assignments across a couple of concerts/gates so
  // multi-staff / multi-gate scenarios are seeded.
  const concertList = await prisma.concert.findMany({
    select: { id: true },
    orderBy: { startsAt: 'asc' },
  });
  for (let s = 0; s < extraStaffIds.length; s++) {
    for (let g = 0; g < 2; g++) {
      const concert = concertList[(s + g) % concertList.length];
      if (!concert) continue;
      const gateName = g === 0 ? 'Main Gate' : 'Side Gate';
      await prisma.checkinStaffAssignment.upsert({
        where: {
          staffId_concertId_gateName: {
            staffId: extraStaffIds[s],
            concertId: concert.id,
            gateName,
          },
        },
        update: { status: 'ACTIVE' },
        create: { staffId: extraStaffIds[s], concertId: concert.id, gateName, status: 'ACTIVE' },
      });
    }
  }

  // Read back the catalog for transactional seeding.
  const concertRows = await prisma.concert.findMany({
    include: { ticketTypes: { select: { id: true, code: true, priceVnd: true } } },
  });
  const concerts: CatalogConcert[] = concertRows.map((c) => ({
    id: c.id,
    concertId: c.id,
    startsAt: c.startsAt,
    ticketTypes: c.ticketTypes,
  }));
  const concertIds = concerts.map((c) => c.concertId);
  const artistIds = Array.from(artistMap.values());

  await seedPromotions();
  const paidOrders = await seedTransactions(audienceIds, concerts, staffId);
  await seedNotifications(paidOrders);
  await seedEngagement(audienceIds, concertIds, artistIds);
  await seedSupportRefunds(paidOrders);
  await seedArtistBios(concertIds);
  await seedGuestList(concertIds, organizerId);

  console.log(
    `Seed complete: ${audienceIds.length} audience, ${concerts.length} concerts, ` +
      `${paidOrders.length} paid orders with tickets.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
