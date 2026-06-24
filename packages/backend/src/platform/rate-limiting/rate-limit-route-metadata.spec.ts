import { describe, expect, it } from 'vitest';

import { AdminCheckinStaffAssignmentsController } from '../../identity/adapters/http/admin-checkin-staff-assignments.controller';
import { OrderController } from '../../ordering/adapters/http/order.controller';
import { PaymentController } from '../../payment/adapters/http/payment.controller';
import { RATE_LIMIT_POLICY_KEY } from './rate-limit.decorator';
import { RateLimitPolicy } from './rate-limit-policy';

describe('rate limit route metadata', () => {
  it('marks checkout order creation with the checkout policy', () => {
    expect(
      Reflect.getMetadata(RATE_LIMIT_POLICY_KEY, OrderController.prototype.createOrder),
    ).toBe(RateLimitPolicy.CHECKOUT);
  });

  it('marks payment initiation with the payment initiation policy', () => {
    expect(
      Reflect.getMetadata(RATE_LIMIT_POLICY_KEY, PaymentController.prototype.initiatePayment),
    ).toBe(RateLimitPolicy.PAYMENT_INITIATION);
  });

  it('marks admin assignment writes but leaves read-only listing unclassified', () => {
    expect(
      Reflect.getMetadata(RATE_LIMIT_POLICY_KEY, AdminCheckinStaffAssignmentsController.prototype.assign),
    ).toBe(RateLimitPolicy.ADMIN_WRITE);
    expect(
      Reflect.getMetadata(RATE_LIMIT_POLICY_KEY, AdminCheckinStaffAssignmentsController.prototype.revoke),
    ).toBe(RateLimitPolicy.ADMIN_WRITE);
    expect(
      Reflect.getMetadata(RATE_LIMIT_POLICY_KEY, AdminCheckinStaffAssignmentsController.prototype.list),
    ).toBeUndefined();
  });
});
