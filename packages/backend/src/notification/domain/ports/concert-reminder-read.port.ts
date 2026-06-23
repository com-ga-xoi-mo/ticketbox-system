export const CONCERT_REMINDER_READ_PORT = Symbol('ConcertReminderReadPort');

/**
 * A published concert whose start time falls inside the reminder scan window.
 * Only PUBLISHED concerts are returned by the adapter; DRAFT/CANCELLED/ENDED are excluded.
 */
export interface UpcomingConcertReminderTarget {
  concertId: string;
  concertTitle: string;
  startsAt: Date;
}

/**
 * A user who holds at least one active (ISSUED or CHECKED_IN) ticket on a PAID order
 * for the concert, and is therefore eligible to receive a reminder.
 */
export interface ReminderRecipient {
  userId: string;
  userDisplayName: string;
  toEmail: string;
  ticketCount: number;
}

/**
 * Read-only access to concert and ticket-holder data owned by other modules.
 * Implemented in infrastructure so the notification module never imports
 * concert-management / ordering Prisma models directly.
 */
export interface ConcertReminderReadPort {
  findConcertsStartingWithin(
    windowStart: Date,
    windowEnd: Date,
  ): Promise<UpcomingConcertReminderTarget[]>;
  findValidTicketHolders(concertId: string): Promise<ReminderRecipient[]>;
}
