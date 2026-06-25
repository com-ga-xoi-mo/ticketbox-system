import {
  AssetKind,
  AssetStatus,
  ConcertStatus,
  PrismaClient,
  RoleCode,
  SeatingZoneStatus,
  TicketTypeStatus,
  UserStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const demoPasswordHash = '$2b$10$8c.VgqzGzMFgwfEpq2K5XOct3iK5I.THdHvnyrIX.MIlCBJ7PTPNe'; // hashes to 'demoPassword'

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
  zones: SeedZone[];
  ticketTypes: SeedTicketType[];
};

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

async function upsertAsset(params: {
  kind: AssetKind;
  slug: string;
  suffix: string;
  originalName: string;
  contentType: string;
  uploadedById: string;
}): Promise<string> {
  const storageKey = `demo/${params.slug}/${params.suffix}`;
  const asset = await prisma.asset.upsert({
    where: { storageKey },
    update: {
      kind: params.kind,
      status: AssetStatus.ACTIVE,
      originalName: params.originalName,
      contentType: params.contentType,
      uploadedById: params.uploadedById,
    },
    create: {
      kind: params.kind,
      status: AssetStatus.ACTIVE,
      storageKey,
      publicUrl: `/storage/${storageKey}`,
      originalName: params.originalName,
      contentType: params.contentType,
      uploadedById: params.uploadedById,
      metadata: { seeded: true },
    },
  });

  return asset.id;
}


async function seedArtists(): Promise<Map<string, string>> {
  const artists = [
    { slug: 'anh-trai-say-hi', displayName: 'Anh Trai Say Hi', bio: 'Popular boy band showcase group.' },
    { slug: 'anh-trai-vuot-ngan-chong-gai', displayName: 'Anh Trai Vuot Ngan Chong Gai', bio: 'Legendary male artists reunion.' },
    { slug: 'em-xinh-say-hi', displayName: 'Em Xinh Say Hi', bio: 'Rising stars female artists showcase.' },
    { slug: 'chi-dep-dap-gio-re-song', displayName: 'Chi Dep Dap Gio Re Song', bio: 'Top female artists performing together.' },
  ];

  const artistMap = new Map<string, string>();
  for (const artist of artists) {
    const record = await prisma.artist.upsert({
      where: { slug: artist.slug },
      update: { displayName: artist.displayName, bio: artist.bio, status: 'ACTIVE' },
      create: { slug: artist.slug, displayName: artist.displayName, bio: artist.bio, status: 'ACTIVE' },
    });
    artistMap.set(record.displayName, record.id);
  }
  return artistMap;
}

async function seedConcertData(organizerId: string, staffId: string, artistMap: Map<string, string>): Promise<void> {
  const saleStartsAt = daysFromNow(-1);
  const saleEndsAt = daysFromNow(120);

  for (const concertSeed of seedConcerts) {
    const posterAssetId = await upsertAsset({
      kind: AssetKind.POSTER,
      slug: concertSeed.slug,
      suffix: 'poster.jpg',
      originalName: `${concertSeed.slug}-poster.jpg`,
      contentType: 'image/jpeg',
      uploadedById: organizerId,
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
        createdById: organizerId,
        posterAssetId,
        seatingMapAssetId,
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
        createdById: organizerId,
        posterAssetId,
        seatingMapAssetId,
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

async function main(): Promise<void> {
  const roleIds = await seedRoles();
  const { organizerId, staffId } = await seedUsers(roleIds);
  const artistMap = await seedArtists();
  await seedConcertData(organizerId, staffId, artistMap);
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
