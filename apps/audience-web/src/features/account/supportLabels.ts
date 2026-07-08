import type {
  AudienceNotificationResourceType,
  AudienceNotificationType,
  RefundRequestReason,
  RefundRequestStatus,
  SupportRequestCategory,
  SupportRequestStatus,
} from '@ticketbox/api-types';

export const supportCategoryLabels: Record<SupportRequestCategory, string> = {
  ORDER_HELP: 'Hỗ trợ đơn hàng',
  TICKET_HELP: 'Hỗ trợ vé',
  PAYMENT_HELP: 'Hỗ trợ thanh toán',
  REFUND_HELP: 'Hỗ trợ hoàn tiền',
  ACCOUNT_HELP: 'Hỗ trợ tài khoản',
  OTHER: 'Khác',
};

export const supportStatusLabels: Record<SupportRequestStatus, string> = {
  OPEN: 'Đã tiếp nhận',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã xử lý',
  CLOSED: 'Đã đóng',
  CANCELLED: 'Đã hủy',
};

export const refundReasonLabels: Record<RefundRequestReason, string> = {
  CANNOT_ATTEND: 'Không thể tham dự',
  EVENT_CHANGED: 'Sự kiện thay đổi',
  DUPLICATE_PURCHASE: 'Mua trùng vé',
  PAYMENT_ISSUE: 'Sự cố thanh toán',
  OTHER: 'Lý do khác',
};

export const refundStatusLabels: Record<RefundRequestStatus, string> = {
  REQUESTED: 'Đã gửi yêu cầu',
  UNDER_REVIEW: 'Đang xem xét',
  APPROVED: 'Yêu cầu được duyệt',
  REJECTED: 'Yêu cầu bị từ chối',
  CANCELLED: 'Đã hủy',
};

export const notificationTypeLabels: Record<AudienceNotificationType, string> = {
  GENERAL: 'Thông báo',
  PURCHASE_CONFIRMATION: 'Xác nhận mua vé',
  CONCERT_REMINDER: 'Nhắc lịch',
  PAYMENT_FAILED: 'Thanh toán lỗi',
  SUPPORT_UPDATE: 'Hỗ trợ',
  REFUND_UPDATE: 'Hoàn tiền',
  TICKET_UPDATE: 'Vé',
  TICKET_RESEND: 'Gửi lại vé',
};

export const notificationResourceLabels: Record<AudienceNotificationResourceType, string> = {
  ORDER: 'Đơn hàng',
  TICKET: 'Vé',
  SUPPORT_REQUEST: 'Yêu cầu hỗ trợ',
  REFUND_REQUEST: 'Yêu cầu hoàn tiền',
  CONCERT: 'Sự kiện',
};

export function formatVnd(value?: number | null): string {
  return typeof value === 'number' ? `${value.toLocaleString('vi-VN')} đ` : 'Đang cập nhật';
}

export function formatDateTime(value?: string | null): string {
  if (!value) return 'Chưa có';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function notificationActionPath(resourceType?: string | null, resourceId?: string | null, actionUrl?: string | null): string | null {
  if (actionUrl) return actionUrl;
  if (!resourceType || !resourceId) return null;
  if (resourceType === 'ORDER') return `/account/orders/${resourceId}`;
  if (resourceType === 'TICKET') return `/account/tickets/${resourceId}`;
  if (resourceType === 'SUPPORT_REQUEST') return `/account/support/requests/${resourceId}`;
  if (resourceType === 'REFUND_REQUEST') return `/account/support/refunds/${resourceId}`;
  return null;
}
