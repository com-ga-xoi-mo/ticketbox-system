import { Divider } from 'antd';

interface OrderPricingBreakdownProps {
  subtotalVnd: number;
  discountAmountVnd?: number;
  serviceFeeVnd?: number;
  totalAmountVnd: number;
  promoCode?: string | null;
}

export function OrderPricingBreakdown({
  subtotalVnd,
  discountAmountVnd = 0,
  serviceFeeVnd = 0,
  totalAmountVnd,
  promoCode,
}: OrderPricingBreakdownProps) {
  return (
    <div className="space-y-3 pt-4">
      <div className="flex justify-between text-gray-600">
        <span>Tạm tính</span>
        <span>{subtotalVnd.toLocaleString('vi-VN')}đ</span>
      </div>

      {discountAmountVnd > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Khuyến mãi {promoCode ? `(${promoCode})` : ''}</span>
          <span>-{discountAmountVnd.toLocaleString('vi-VN')}đ</span>
        </div>
      )}

      {serviceFeeVnd > 0 && (
        <div className="flex justify-between text-gray-600">
          <span>Phí dịch vụ</span>
          <span>{serviceFeeVnd.toLocaleString('vi-VN')}đ</span>
        </div>
      )}

      <Divider className="my-2" />

      <div className="flex justify-between text-lg font-bold text-gray-900">
        <span>Tổng cộng</span>
        <span>{totalAmountVnd.toLocaleString('vi-VN')}đ</span>
      </div>
    </div>
  );
}
