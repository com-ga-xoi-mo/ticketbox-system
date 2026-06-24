export interface OrderItemProps {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  unitPriceVnd: number;
  totalPriceVnd: number;
}

export class OrderItem {
  readonly id: string;
  readonly ticketTypeId: string;
  readonly ticketTypeName: string;
  readonly quantity: number;
  readonly unitPriceVnd: number;
  readonly totalPriceVnd: number;

  constructor(props: OrderItemProps) {
    this.id = props.id;
    this.ticketTypeId = props.ticketTypeId;
    this.ticketTypeName = props.ticketTypeName;
    this.quantity = props.quantity;
    this.unitPriceVnd = props.unitPriceVnd;
    this.totalPriceVnd = props.totalPriceVnd;
  }
}
