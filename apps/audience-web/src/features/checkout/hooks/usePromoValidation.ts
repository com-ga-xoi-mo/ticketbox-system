import { useState } from 'react';
import { PromoErrorCode } from '@ticketbox/api-types';

export interface PromoPreview {
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxDiscountVnd: number | null;
}

export interface UsePromoValidationProps {
  validatePromoCode: (params: { code: string; concertId: string; ticketTypeIds: string[] }) => Promise<{
    valid: boolean;
    discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue?: number;
    maxDiscountVnd?: number | null;
    errorCode?: string;
    message?: string;
  }>;
  concertId: string;
  ticketTypeIds: string[];
}

export function usePromoValidation({ validatePromoCode, concertId, ticketTypeIds }: UsePromoValidationProps) {
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [promoPreview, setPromoPreview] = useState<PromoPreview | null>(null);
  const [loading, setLoading] = useState(false);

  const getErrorMessage = (code?: string): string => {
    switch (code) {
      case 'PROMO_CODE_NOT_FOUND': return 'Mã khuyến mãi không hợp lệ';
      case 'PROMO_CODE_EXPIRED': return 'Mã khuyến mãi đã hết hạn';
      case 'PROMO_USER_LIMIT_EXCEEDED': return 'Bạn đã sử dụng mã khuyến mãi này';
      case 'PROMO_USAGE_LIMIT_EXCEEDED': return 'Mã khuyến mãi đã hết lượt sử dụng';
      case 'PROMO_NOT_APPLICABLE': return 'Mã khuyến mãi không áp dụng cho sự kiện này';
      case 'PROMO_CODE_NOT_YET_VALID': return 'Mã khuyến mãi chưa có hiệu lực';
      case 'PROMO_CODE_INACTIVE': return 'Mã khuyến mãi không hợp lệ';
      default: return 'Có lỗi xảy ra khi áp dụng mã';
    }
  };

  const applyPromo = async (code: string): Promise<PromoPreview | void> => {
    setLoading(true);
    try {
      const response = await validatePromoCode({
        code,
        concertId,
        ticketTypeIds,
      });

      if (!response.valid) {
        throw new Error(getErrorMessage(response.errorCode));
      }

      const preview: PromoPreview = {
        discountType: response.discountType!,
        discountValue: response.discountValue!,
        maxDiscountVnd: response.maxDiscountVnd ?? null,
      };

      setPromoCode(code);
      setPromoPreview(preview);
      return preview;
    } finally {
      setLoading(false);
    }
  };

  const removePromo = () => {
    setPromoCode(null);
    setPromoPreview(null);
  };

  return {
    applyPromo,
    removePromo,
    promoCode,
    promoPreview,
    loading,
  };
}
