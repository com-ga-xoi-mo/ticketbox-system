## ADDED Requirements

### Requirement: Promo code entry in checkout
The audience-web app SHALL display a promo code input field in the checkout flow before payment initiation. The field SHALL accept alphanumeric codes, have a "Áp dụng" (Apply) button, and submit the code to `POST /checkout/promo/validate` for preview.

#### Scenario: User enters a valid promo code
- **WHEN** an authenticated AUDIENCE user enters a valid promo code and clicks "Áp dụng"
- **THEN** the app SHALL display a success state showing the promo code, discount description (e.g., "Giảm 20%, tối đa 150,000₫"), and update the order total preview

#### Scenario: User enters an invalid promo code
- **WHEN** the user enters a code that returns `PROMO_CODE_NOT_FOUND`
- **THEN** the app SHALL display an inline error "Mã khuyến mãi không hợp lệ" below the input field

#### Scenario: User enters an expired promo code
- **WHEN** the user enters a code that returns `PROMO_CODE_EXPIRED`
- **THEN** the app SHALL display an inline error "Mã khuyến mãi đã hết hạn"

#### Scenario: User enters an already-used promo code
- **WHEN** the user enters a code that returns `PROMO_USER_LIMIT_EXCEEDED`
- **THEN** the app SHALL display an inline error "Bạn đã sử dụng mã khuyến mãi này"

#### Scenario: User enters a promo code with global usage exhausted
- **WHEN** the user enters a code that returns `PROMO_USAGE_LIMIT_EXCEEDED`
- **THEN** the app SHALL display an inline error "Mã khuyến mãi đã hết lượt sử dụng"

#### Scenario: User enters a promo code not applicable to this event
- **WHEN** the user enters a code that returns `PROMO_NOT_APPLICABLE`
- **THEN** the app SHALL display an inline error "Mã khuyến mãi không áp dụng cho sự kiện này"

#### Scenario: User removes applied promo code
- **WHEN** the user clicks a remove/clear button on an applied promo code
- **THEN** the app SHALL clear the promo code, revert the order total preview to the original subtotal plus service fee, and re-enable the promo input field

#### Scenario: Promo validation is loading
- **WHEN** the promo validation request is in flight
- **THEN** the app SHALL disable the "Áp dụng" button and show a loading indicator

### Requirement: Order total breakdown display in checkout
The audience-web app SHALL display a pricing breakdown in the checkout order summary showing subtotal, discount amount (if applicable), service fee, and final total.

#### Scenario: Checkout with promo applied
- **WHEN** the checkout page displays an order summary with a promo code applied
- **THEN** the app SHALL show: "Tạm tính" (subtotal), "Giảm giá" (discount) with the promo code label, "Phí dịch vụ" (service fee), and "Tổng thanh toán" (total payable)

#### Scenario: Checkout without promo
- **WHEN** the checkout page displays an order summary without a promo code
- **THEN** the app SHALL show: "Tạm tính" (subtotal), "Phí dịch vụ" (service fee), and "Tổng thanh toán" (total payable). The discount line SHALL be hidden.

#### Scenario: Zero service fee is hidden
- **WHEN** the service fee is 0 VND
- **THEN** the app SHALL hide the "Phí dịch vụ" line from the breakdown

### Requirement: Order total breakdown in order detail and history
The audience-web app SHALL display the pricing breakdown on the order detail page (`/orders/:id`) and in the order list (`/orders`) for orders that have discount or fee data.

#### Scenario: Order detail shows breakdown
- **WHEN** an authenticated user views `/orders/:id` for an order with a promo code applied
- **THEN** the app SHALL display the subtotal, discount amount with promo code, service fee, and total in the order summary section

#### Scenario: Order history shows total only
- **WHEN** an authenticated user views `/orders` listing
- **THEN** each order card SHALL display `totalAmountVnd` as the primary amount. The breakdown is visible only on the detail page.

### Requirement: Promo rejection at order creation time
The audience-web app SHALL handle the case where a previewed promo code is rejected at order creation time (e.g., usage limit hit between preview and submit).

#### Scenario: Promo rejected at order creation
- **WHEN** the user submits checkout with a promo code that was valid during preview but is rejected at order creation
- **THEN** the app SHALL display an Alert with the rejection reason (e.g., "Mã khuyến mãi đã hết lượt sử dụng") and allow the user to remove the promo code and retry checkout without it

#### Scenario: Promo code not yet valid at order creation
- **WHEN** the user submits checkout with a promo code that returns `PROMO_CODE_NOT_YET_VALID`
- **THEN** the app SHALL display "Mã khuyến mãi chưa có hiệu lực"
