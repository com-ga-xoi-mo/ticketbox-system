import { ForbiddenException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { HttpCheckinMobileApiClient } from '../../apps/checkin-mobile/src/api/http-checkin-mobile-api-client';
import { CheckinAssignmentsController } from '../../packages/backend/src/checkin/adapters/http/checkin-assignments.controller';
import { CheckinController } from '../../packages/backend/src/checkin/adapters/http/checkin.controller';
import { ListMyCheckinAssignmentsQuery } from '../../packages/backend/src/checkin/application/queries/list-my-checkin-assignments.query';
import { OnlineCheckinUseCase } from '../../packages/backend/src/checkin/application/use-cases/online-checkin.use-case';
import { AuthController } from '../../packages/backend/src/identity/adapters/http/auth.controller';
import { RolesGuard } from '../../packages/backend/src/identity/adapters/http/guards/roles.guard';
import { ProfileController } from '../../packages/backend/src/identity/adapters/http/profile.controller';
import { GetMyProfileQuery } from '../../packages/backend/src/identity/application/queries/get-my-profile.query';
import { LoginUseCase } from '../../packages/backend/src/identity/application/use-cases/login.use-case';
import { RegisterUseCase } from '../../packages/backend/src/identity/application/use-cases/register.use-case';
import { Role } from '../../packages/backend/src/identity/domain/role.enum';
import { JwtAuthGuard } from '../../packages/backend/src/identity/infrastructure/passport/jwt-auth.guard';

const staffId = '11111111-1111-4111-8111-111111111111';
const audienceId = '22222222-2222-4222-8222-222222222222';
const assignmentId = '33333333-3333-4333-8333-333333333333';
const concertId = '44444444-4444-4444-8444-444444444444';
const ticketId = '55555555-5555-4555-8555-555555555555';
const timestamp = '2026-07-01T12:00:00.000Z';

describe('shared API contracts across real HTTP routes and mobile client', () => {
  let app: Awaited<
    ReturnType<ReturnType<typeof Test.createTestingModule>['compile']>
  >['createNestApplication'] extends (...args: never[]) => infer R
    ? R
    : never;
  let client: HttpCheckinMobileApiClient;
  const onlineCheckin = {
    execute: vi.fn(async (command: { qrPayload: string; deviceId: string }) => {
      if (command.qrPayload === 'invalid') {
        return {
          status: 'invalid' as const,
          message: 'Invalid',
          reasonCode: 'INVALID_TICKET' as const,
        };
      }
      if (command.qrPayload === 'unassigned') {
        return {
          status: 'unassigned' as const,
          message: 'Unassigned',
          reasonCode: 'ASSIGNMENT_MISMATCH' as const,
        };
      }
      if (command.qrPayload === 'duplicate') {
        return { status: 'duplicate' as const, message: 'Duplicate', ticketId };
      }
      return {
        status: 'accepted' as const,
        message: 'Accepted',
        ticketId,
        checkedInAt: new Date(timestamp),
      };
    }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        AuthController,
        ProfileController,
        CheckinAssignmentsController,
        CheckinController,
      ],
      providers: [
        { provide: RegisterUseCase, useValue: { execute: vi.fn() } },
        {
          provide: LoginUseCase,
          useValue: {
            execute: vi.fn(async ({ email }: { email: string }) => ({
              accessToken: email.startsWith('audience') ? 'audience-token' : 'staff-token',
            })),
          },
        },
        {
          provide: GetMyProfileQuery,
          useValue: {
            execute: vi.fn(async (id: string) => ({
              email: id === audienceId ? 'audience@ticketbox.test' : 'staff@ticketbox.test',
              displayName: id === audienceId ? 'Audience' : 'Gate Staff',
            })),
          },
        },
        {
          provide: ListMyCheckinAssignmentsQuery,
          useValue: {
            execute: vi.fn(async () => [
              {
                assignmentId,
                concertId,
                concertTitle: 'TicketBox Live',
                gate: 'Main Gate',
                startsAt: new Date(timestamp),
                status: 'ACTIVE' as const,
              },
            ]),
          },
        },
        { provide: OnlineCheckinUseCase, useValue: onlineCheckin },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: {
          switchToHttp(): { getRequest(): { headers: Record<string, string>; user?: unknown } };
        }) {
          const request = context.switchToHttp().getRequest();
          const authorization = request.headers.authorization;
          if (authorization === 'Bearer staff-token') {
            request.user = { id: staffId, roles: [Role.CHECKIN_STAFF] };
            return true;
          }
          if (authorization === 'Bearer audience-token') {
            request.user = { id: audienceId, roles: [Role.AUDIENCE] };
            return true;
          }
          throw new UnauthorizedException();
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate(context: { switchToHttp(): { getRequest(): { user: { roles: Role[] } } } }) {
          const request = context.switchToHttp().getRequest();
          if (!request.user.roles.includes(Role.CHECKIN_STAFF)) throw new ForbiddenException();
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.listen(0);
    const address = (app.getHttpServer() as Server).address();
    const port = typeof address === 'object' && address ? address.port : 3001;
    client = new HttpCheckinMobileApiClient({ baseUrl: `http://127.0.0.1:${port}` });
  });

  afterAll(async () => app?.close());

  it('runs login -> profile -> assignments -> selection -> accepted scan', async () => {
    const session = await client.login({ email: 'staff@ticketbox.test', password: 'secret' });
    const assignments = await client.listStaffAssignments(session.accessToken);
    const selected = assignments[0];
    const result = await client.submitOnlineScan(session.accessToken, {
      assignmentId: selected.assignmentId,
      concertId: selected.concertId,
      gate: selected.gate,
      qrPayload: 'accepted',
      scannedAt: timestamp,
      deviceId: '66666666-6666-4666-8666-666666666666',
    });

    expect(session.profile).toMatchObject({ id: staffId, roles: ['CHECKIN_STAFF'] });
    expect(assignments).toHaveLength(1);
    expect(result).toEqual({
      status: 'accepted',
      message: 'Accepted',
      ticketId,
      checkedInAt: timestamp,
    });
    expect(onlineCheckin.execute).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: '66666666-6666-4666-8666-666666666666' }),
    );
  });

  it.each([
    ['invalid', 'INVALID_TICKET'],
    ['unassigned', 'ASSIGNMENT_MISMATCH'],
  ])('preserves status-specific reason contracts for %s', async (qrPayload, reasonCode) => {
    const result = await client.submitOnlineScan('staff-token', {
      assignmentId,
      concertId,
      qrPayload,
      scannedAt: timestamp,
      deviceId: '66666666-6666-4666-8666-666666666666',
    });
    expect(result).toMatchObject({ status: qrPayload, reasonCode });
  });

  it('keeps duplicate metadata optional', async () => {
    await expect(
      client.submitOnlineScan('staff-token', {
        assignmentId,
        concertId,
        qrPayload: 'duplicate',
        scannedAt: timestamp,
        deviceId: '66666666-6666-4666-8666-666666666666',
      }),
    ).resolves.toMatchObject({ status: 'duplicate', ticketId });
  });

  it('maps real route 401/403 statuses before business parsing', async () => {
    const request = {
      assignmentId,
      concertId,
      qrPayload: 'accepted',
      scannedAt: timestamp,
      deviceId: staffId,
    };
    await expect(client.submitOnlineScan('', request)).resolves.toMatchObject({
      status: 'unauthorized',
    });
    await expect(client.submitOnlineScan('audience-token', request)).resolves.toMatchObject({
      status: 'unauthorized',
    });
  });

  it('enforces assignment route 401/403 and never accepts a client staff id', async () => {
    await expect(client.listStaffAssignments('')).rejects.toMatchObject({ status: 401 });
    await expect(client.listStaffAssignments('audience-token')).rejects.toMatchObject({
      status: 403,
    });
  });

  it.each([
    ['missing', undefined],
    ['blank', '   '],
    ['oversized', 'x'.repeat(161)],
  ])('rejects %s deviceId before invoking check-in processing', async (_name, deviceId) => {
    const before = onlineCheckin.execute.mock.calls.length;
    const body: Record<string, unknown> = {
      assignmentId,
      concertId,
      qrPayload: 'accepted',
      scannedAt: timestamp,
      ...(deviceId === undefined ? {} : { deviceId }),
    };
    const response = await fetch(
      `${(client as unknown as { baseUrl: string }).baseUrl}/checkin/scan`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer staff-token' },
        body: JSON.stringify(body),
      },
    );
    expect(response.status).toBe(400);
    expect(onlineCheckin.execute).toHaveBeenCalledTimes(before);
  });

  it('trims a valid deviceId before the online scan command', async () => {
    const response = await client.submitOnlineScan('staff-token', {
      assignmentId,
      concertId,
      qrPayload: 'accepted',
      scannedAt: timestamp,
      deviceId: '  66666666-6666-4666-8666-666666666666  ',
    });
    expect(response.status).toBe('accepted');
    expect(onlineCheckin.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({ deviceId: '66666666-6666-4666-8666-666666666666' }),
    );
  });
});
