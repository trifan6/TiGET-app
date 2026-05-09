// @ts-check
import { test, expect } from '@playwright/test';

const LOCALHOST = 'http://localhost:5173';

/**
 * SCENARIO 1: The User Journey
 */
test('Scenario 1: User Journey and Detail View', async ({ page }) => {
  await page.goto(LOCALHOST);

  // 1. Landing to Login
  await page.getByRole('button', { name: /GET STARTED/i }).click();
  await page.getByRole('button', { name: /LOG.*N/i }).click();
  
  // 2. Perform Login
  await page.getByPlaceholder('username').fill('stefan@user.com');
  await page.getByPlaceholder('password').fill('password123');
  await page.getByRole('button', { name: /continue/i }).click();

  // 3. Test Cart Alert
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('Added');
    await dialog.accept();
  });
  
  // Wait for the dynamic GraphQL data to load!
  await page.waitForSelector('button:has-text("ADD TO CART")');
  await page.getByRole('button', { name: /ADD TO CART/i }).first().click();

  // 4. Detail View Check (Click the first event title, whatever it is)
  // We use .first() on whatever heading represents the event
  await page.locator('h3').first().click(); 
});


/**
 * SCENARIO 3: Authentication Error Handling
 */
test('Scenario 3: Auth Validation Check', async ({ page }) => {
  await page.goto(LOCALHOST);
  await page.getByRole('button', { name: /GET STARTED/i }).click();
  await page.getByRole('button', { name: /REG.*STER/i }).click();

  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('Error');
    await dialog.accept();
  });

  await page.getByPlaceholder('email').fill('test@example.com');
  await page.locator('input[type="password"]').fill('123');
  await page.getByRole('button', { name: /create/i }).click();
});