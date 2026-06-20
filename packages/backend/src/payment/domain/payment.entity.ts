import { PaymentStatus } from './payment-status.enum';

export interface PaymentProps {
  id: string;
  orderId: string;
  userId: string;
  provider: string;
  providerTransactionId: string | null;
  status: PaymentStatus;
  amountVnd: number;
  redirectUrl: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export class Payment {
  readonly id: string;
  readonly orderId: string;
  readonly userId: string;
  readonly provider: string;
  readonly providerTransactionId: string | null;
  readonly status: PaymentStatus;
  readonly amountVnd: number;
  readonly redirectUrl: string | null;
  readonly failureCode: string | null;
  readonly failureMessage: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly completedAt: Date | null;

  constructor(props: PaymentProps) {
    this.id = props.id;
    this.orderId = props.orderId;
    this.userId = props.userId;
    this.provider = props.provider;
    this.providerTransactionId = props.providerTransactionId;
    this.status = props.status;
    this.amountVnd = props.amountVnd;
    this.redirectUrl = props.redirectUrl;
    this.failureCode = props.failureCode;
    this.failureMessage = props.failureMessage;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.completedAt = props.completedAt;
  }
}
