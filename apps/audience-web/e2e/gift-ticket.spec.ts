import { test, expect } from '@playwright/test';

// Group 12: Frontend UI Tests for Gift Ticket
test.describe('Gift Ticket Flow', () => {
  // NOTE: This assumes you have seeded the DB and have a valid user login

  test.beforeEach(async ({ page }) => {
    // 1. Log in (adjust to actual login flow of Ticketbox)
    await page.goto('/login');
    await page.fill('input[type="email"]', 'audience1@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/account/tickets');
  });

  test('12.1-12.6: Initiate and Cancel Gift Transfer', async ({ page }) => {
    // 12.1 Navigate to /account/tickets, pick an ISSUED ticket
    await page.goto('/account/tickets');

    // Find an ISSUED ticket (green badge) and click details
    const ticketCard = page.locator('text=Hợp lệ').first().locator('xpath=ancestor::a');
    await ticketCard.click();

    // Verify "Gift this ticket" button is visible
    const giftBtn = page.locator('text=Tặng vé cho bạn bè');
    await expect(giftBtn).toBeVisible();

    // 12.2 Click "Gift this ticket"
    await giftBtn.click();

    // Verify modal opens with email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await expect(page.locator('text=Người nhận có 48 giờ để chấp nhận vé này.')).toBeVisible();

    // 12.3 Submit with malformed email
    await emailInput.fill('notanemail');
    // Assuming native HTML5 validation or Zod validation kicks in
    const submitBtn = page.locator('button:has-text("Xác nhận tặng")');
    await submitBtn.click();
    // Modal should not close, network request should not be sent
    await expect(emailInput).toBeVisible();

    // 12.4 Submit with valid email
    await emailInput.fill('friend@example.com');

    // Listen to network request
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/transfer') && response.request().method() === 'POST',
    );
    await submitBtn.click();

    const response = await responsePromise;
    expect(response.status()).toBe(201); // Created

    // Modal closes, amber badge "Đang tặng" appears
    await expect(page.locator('text=Đang tặng')).toBeVisible();

    // 12.5 QR code is hidden, recipient email and expiry displayed
    await expect(page.locator('text=Mã QR bị ẩn')).toBeVisible();
    await expect(page.locator('text=friend@example.com')).toBeVisible();
    await expect(page.locator('text=Hết hạn sau')).toBeVisible();

    // Verify "Gift this ticket" is absent, "Cancel Transfer" is present
    await expect(giftBtn).not.toBeVisible();
    const cancelBtn = page.locator('text=Hủy tặng vé');
    await expect(cancelBtn).toBeVisible();

    // 12.6 Click Cancel Transfer
    await cancelBtn.click();
    // Verify confirmation dialog
    await expect(page.locator('text=Bạn có chắc chắn muốn hủy')).toBeVisible();

    const cancelResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/transfer') && response.request().method() === 'DELETE',
    );
    await page.locator('button:has-text("Đồng ý hủy")').click();

    const cancelResponse = await cancelResponsePromise;
    expect(cancelResponse.status()).toBe(200);

    // Verify ticket reverts to ISSUED state
    await expect(page.locator('text=Hợp lệ')).toBeVisible();
    await expect(giftBtn).toBeVisible();
  });

  test('12.7-12.9: Accept Gift Flow', async ({ page, request }) => {
    // Scaffold: We need a valid token to test the landing page.
    // In a real E2E test, we would create a transfer via API first to get the token.
    // Assuming we extracted `transferToken` from the backend setup:
    const transferToken = 'MOCK_TOKEN'; // Replace with real token setup

    // 12.7 Navigate to landing page
    await page.goto(`/transfers/${transferToken}`);
    await expect(page.locator('text=Lời mời nhận vé')).toBeVisible();
    await expect(page.locator('text=Accept Gift')).toBeVisible();
    await expect(page.locator('text=Decline')).toBeVisible();

    // 12.8 Click Accept
    const acceptResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/accept') && response.request().method() === 'POST',
    );
    await page.locator('text=Accept Gift').click();

    const acceptResponse = await acceptResponsePromise;
    expect(acceptResponse.status()).toBe(200);

    await expect(page.locator('text=Bạn đã nhận vé thành công!')).toBeVisible();
    await expect(page.locator('text=View in wallet')).toBeVisible();

    // 12.9 Navigate back to the same token
    await page.goto(`/transfers/${transferToken}`);
    await expect(page.locator('text=This gift link has already been resolved')).toBeVisible();
  });
});
