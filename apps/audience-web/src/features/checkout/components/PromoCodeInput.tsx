import { useState } from 'react';
import { Button, Input, Alert, Spin } from 'antd';
import { TagIcon, CheckCircleIcon, X } from 'lucide-react';
import { PromoErrorCode } from '@ticketbox/api-types';

export interface PromoPreview {
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxDiscountVnd: number | null;
}

interface PromoCodeInputProps {
  onApply: (code: string) => Promise<PromoPreview | void>;
  onRemove: () => void;
  appliedPromoCode: string | null;
  appliedPromoPreview: PromoPreview | null;
  loading?: boolean;
}

export function PromoCodeInput({
  onApply,
  onRemove,
  appliedPromoCode,
  appliedPromoPreview,
  loading = false,
}: PromoCodeInputProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;
    setError(null);
    try {
      await onApply(code.trim());
    } catch (err: any) {
      // Very basic error mapping (will be improved with proper error codes later)
      setError(err.message || 'Mã khuyến mãi không hợp lệ');
    }
  };

  const handleRemove = () => {
    setCode('');
    setError(null);
    onRemove();
  };

  if (appliedPromoCode && appliedPromoPreview) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Đã áp dụng mã: <span className="font-bold">{appliedPromoCode.toUpperCase()}</span>
              </p>
              <p className="text-xs text-green-600">
                {appliedPromoPreview.discountType === 'FIXED_AMOUNT'
                  ? `Giảm ${appliedPromoPreview.discountValue.toLocaleString('vi-VN')}đ`
                  : `Giảm ${appliedPromoPreview.discountValue}%`}
              </p>
            </div>
          </div>
          <Button type="text" danger onClick={handleRemove} icon={<X className="h-4 w-4" />}>
            Huỷ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex space-x-2">
        <Input
          prefix={<TagIcon className="h-4 w-4 text-gray-400" />}
          placeholder="Nhập mã khuyến mãi"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onPressEnter={handleApply}
          disabled={loading}
          className="uppercase"
        />
        <Button 
          type="primary" 
          onClick={handleApply} 
          loading={loading}
          disabled={!code.trim() || loading}
        >
          Áp dụng
        </Button>
      </div>
      {error && (
        <Alert message={error} type="error" showIcon className="py-1.5 text-sm" />
      )}
    </div>
  );
}
