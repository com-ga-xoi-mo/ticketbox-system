import { PromotionDiscountType } from './promotion-discount-type.enum';

export interface PromotionProps {
  id: string;
  code: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  maxDiscountVnd: number | null;
  maxUsageCount: number | null;
  maxUsagePerUser: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
  applicableEventIds: string[];
  applicableCategoryIds: string[];
  applicableTicketTypeIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class Promotion {
  readonly id: string;
  readonly code: string;
  readonly discountType: PromotionDiscountType;
  readonly discountValue: number;
  readonly maxDiscountVnd: number | null;
  readonly maxUsageCount: number | null;
  readonly maxUsagePerUser: number | null;
  readonly validFrom: Date | null;
  readonly validUntil: Date | null;
  readonly isActive: boolean;
  readonly applicableEventIds: string[];
  readonly applicableCategoryIds: string[];
  readonly applicableTicketTypeIds: string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: PromotionProps) {
    this.id = props.id;
    this.code = props.code;
    this.discountType = props.discountType;
    this.discountValue = props.discountValue;
    this.maxDiscountVnd = props.maxDiscountVnd;
    this.maxUsageCount = props.maxUsageCount;
    this.maxUsagePerUser = props.maxUsagePerUser;
    this.validFrom = props.validFrom;
    this.validUntil = props.validUntil;
    this.isActive = props.isActive;
    this.applicableEventIds = props.applicableEventIds ?? [];
    this.applicableCategoryIds = props.applicableCategoryIds ?? [];
    this.applicableTicketTypeIds = props.applicableTicketTypeIds ?? [];
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  calculateDiscount(subtotalVnd: number): number {
    let discount = 0;

    if (this.discountType === PromotionDiscountType.FIXED_AMOUNT) {
      discount = this.discountValue;
    } else if (this.discountType === PromotionDiscountType.PERCENTAGE) {
      discount = Math.floor((subtotalVnd * this.discountValue) / 100);
      if (this.maxDiscountVnd !== null && discount > this.maxDiscountVnd) {
        discount = this.maxDiscountVnd;
      }
    }

    if (discount > subtotalVnd) {
      discount = subtotalVnd;
    }

    return discount > 0 ? discount : 0;
  }
}
