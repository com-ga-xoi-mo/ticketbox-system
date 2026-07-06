import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.S3_ENDPOINT ??= 'http://localhost:9000';
  process.env.S3_REGION ??= 'us-east-1';
  process.env.S3_BUCKET ??= 'ticketbox-test';
  process.env.S3_ACCESS_KEY_ID ??= 'test';
  process.env.S3_SECRET_ACCESS_KEY ??= 'test';
  process.env.S3_PUBLIC_BASE_URL ??= 'http://localhost:9000/ticketbox-test';
});

import { AdminArtistBioController } from '../../ai-artist-bio/adapters/http/admin-artist-bio.controller';
import { OrganizerArtistBioController } from '../../ai-artist-bio/adapters/http/organizer-artist-bio.controller';
import { CheckinController } from '../../checkin/adapters/http/checkin.controller';
import { AdminConcertController } from '../../concert-management/adapters/http/admin-concert.controller';
import { OrganizerConcertController } from '../../concert-management/adapters/http/organizer-concert.controller';
import { OrganizerPosterController } from '../../concert-management/adapters/http/organizer-poster.controller';
import { OrganizerSeatingMapController } from '../../concert-management/adapters/http/organizer-seating-map.controller';
import { OrganizerTicketTypeController } from '../../concert-management/adapters/http/organizer-ticket-type.controller';
import { PublicConcertCatalogController } from '../../concert-management/adapters/http/public-concert-catalog.controller';
import { AdminGuestListController } from '../../guest-list-import/adapters/http/admin-guest-list.controller';
import { AdminCheckinStaffAssignmentsController } from '../../identity/adapters/http/admin-checkin-staff-assignments.controller';
import { AdminUsersController } from '../../identity/adapters/http/admin-users.controller';
import { OrderController } from '../../ordering/adapters/http/order.controller';
import { PaymentController } from '../../payment/adapters/http/payment.controller';
import { RATE_LIMIT_POLICY_KEY } from './rate-limit.decorator';
import { RateLimitPolicy } from './rate-limit-policy';

function expectPolicy(handler: Function, policy: RateLimitPolicy): void {
  expect(Reflect.getMetadata(RATE_LIMIT_POLICY_KEY, handler)).toBe(policy);
}

function expectNoPolicy(handler: Function): void {
  expect(Reflect.getMetadata(RATE_LIMIT_POLICY_KEY, handler)).toBeUndefined();
}

describe('rate limit route metadata', () => {
  it('marks checkout order creation with the checkout policy', () => {
    expectPolicy(OrderController.prototype.createOrder, RateLimitPolicy.CHECKOUT);
  });

  it('marks payment initiation with the payment initiation policy', () => {
    expectPolicy(PaymentController.prototype.initiatePayment, RateLimitPolicy.PAYMENT_INITIATION);
  });

  it('marks public catalog browsing routes with the browsing policy', () => {
    for (const handler of [
      PublicConcertCatalogController.prototype.listConcerts,
      PublicConcertCatalogController.prototype.listFeatured,
      PublicConcertCatalogController.prototype.listCities,
      PublicConcertCatalogController.prototype.getConcertDetail,
      PublicConcertCatalogController.prototype.getAvailability,
    ]) {
      expectPolicy(handler, RateLimitPolicy.BROWSING);
    }
  });

  it('marks check-in sync but leaves online scan and cache reads unclassified', () => {
    expectPolicy(CheckinController.prototype.sync, RateLimitPolicy.CHECKIN_SYNC);
    expectNoPolicy(CheckinController.prototype.scan);
    expectNoPolicy(CheckinController.prototype.ticketCache);
  });

  it('marks admin and organizer concert write routes but leaves read-only routes unclassified', () => {
    for (const handler of [
      AdminConcertController.prototype.update,
      AdminConcertController.prototype.publish,
      AdminConcertController.prototype.cancel,
      AdminConcertController.prototype.createTicketType,
      AdminConcertController.prototype.updateTicketType,
      AdminConcertController.prototype.archiveTicketType,
      AdminConcertController.prototype.uploadPoster,
      AdminConcertController.prototype.uploadSeatingMap,
      AdminConcertController.prototype.upsertZones,
      AdminConcertController.prototype.updateZoneMappings,
      OrganizerConcertController.prototype.create,
      OrganizerConcertController.prototype.update,
      OrganizerConcertController.prototype.publish,
      OrganizerConcertController.prototype.cancel,
      OrganizerTicketTypeController.prototype.create,
      OrganizerTicketTypeController.prototype.update,
      OrganizerTicketTypeController.prototype.archive,
      OrganizerPosterController.prototype.uploadPoster,
      OrganizerSeatingMapController.prototype.uploadSeatingMap,
      OrganizerSeatingMapController.prototype.upsertZones,
      OrganizerSeatingMapController.prototype.updateZoneMappings,
    ]) {
      expectPolicy(handler, RateLimitPolicy.ADMIN_WRITE);
    }

    expectNoPolicy(AdminConcertController.prototype.list);
    expectNoPolicy(AdminConcertController.prototype.get);
    expectNoPolicy(OrganizerConcertController.prototype.list);
    expectNoPolicy(OrganizerConcertController.prototype.get);
    expectNoPolicy(OrganizerTicketTypeController.prototype.getTicketTypes);
    expectNoPolicy(OrganizerSeatingMapController.prototype.getSeatingMap);
  });

  it('marks admin-user, guest-list, artist, and AI heavy write routes with admin write policy', () => {
    for (const handler of [
      AdminGuestListController.prototype.requestImport,
      AdminGuestListController.prototype.discover,
      AdminUsersController.prototype.create,
      AdminUsersController.prototype.update,
      AdminUsersController.prototype.setStatus,
      AdminArtistBioController.prototype.upload,
      AdminArtistBioController.prototype.retry,
      AdminArtistBioController.prototype.publish,
      AdminArtistBioController.prototype.reject,
      OrganizerArtistBioController.prototype.upload,
      OrganizerArtistBioController.prototype.retry,
      OrganizerArtistBioController.prototype.publish,
      OrganizerArtistBioController.prototype.reject,
    ]) {
      expectPolicy(handler, RateLimitPolicy.ADMIN_WRITE);
    }

    expectNoPolicy(AdminGuestListController.prototype.list);
    expectNoPolicy(AdminGuestListController.prototype.get);
    expectNoPolicy(AdminGuestListController.prototype.report);
    expectNoPolicy(AdminUsersController.prototype.list);
    expectNoPolicy(AdminUsersController.prototype.get);
    expectNoPolicy(AdminArtistBioController.prototype.getLatest);
    expectNoPolicy(OrganizerArtistBioController.prototype.getLatest);
  });

  it('marks admin assignment writes but leaves read-only listing unclassified', () => {
    expectPolicy(AdminCheckinStaffAssignmentsController.prototype.assign, RateLimitPolicy.ADMIN_WRITE);
    expectPolicy(AdminCheckinStaffAssignmentsController.prototype.revoke, RateLimitPolicy.ADMIN_WRITE);
    expectNoPolicy(AdminCheckinStaffAssignmentsController.prototype.list);
  });
});
