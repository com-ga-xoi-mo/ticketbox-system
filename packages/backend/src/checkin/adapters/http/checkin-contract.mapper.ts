import type { OnlineScanResponse } from '@ticketbox/api-types';

import type { OnlineScanResult } from '../../domain/checkin-scan.types';

export function toOnlineScanResponse(result: OnlineScanResult): OnlineScanResponse {
  switch (result.status) {
    case 'accepted':
      return compact({
        status: result.status,
        message: result.message,
        ticketId: result.ticketId,
        checkedInAt: result.checkedInAt.toISOString(),
        checkinEventId: result.checkinEventId,
      });
    case 'duplicate':
      return compact({
        status: result.status,
        message: result.message,
        ticketId: result.ticketId,
        checkedInAt: result.checkedInAt?.toISOString(),
        checkinEventId: result.checkinEventId,
      });
    case 'invalid':
      return compact({
        status: result.status,
        message: result.message,
        reasonCode: result.reasonCode,
        ticketId: result.ticketId,
        checkinEventId: result.checkinEventId,
      });
    case 'unassigned':
      return compact({
        status: result.status,
        message: result.message,
        reasonCode: result.reasonCode,
        checkinEventId: result.checkinEventId,
      });
  }
}

function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}
