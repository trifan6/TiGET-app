import { test, expect } from '@playwright/test';

const LOCALHOST = 'http://localhost:5173';
test('Scenario 1: User Journey and Detail View', async ({ page }) => {
  await page.goto(LOCALHOST);

  await page.getByRole('button', { name: /GET STARTED/i }).click();
  await page.getByRole('button', { name: /LOG.*N/i }).click();
  
  await page.getByPlaceholder('username').fill('stefan@user.com');
  await page.getByPlaceholder('password').fill('password123');
  await page.getByRole('button', { name: /continue/i }).click();

  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('Added');
    await dialog.accept();
  });
  
  await page.waitForSelector('button:has-text("ADD TO CART")');
  await page.getByRole('button', { name: /ADD TO CART/i }).first().click();

  await page.locator('h3').first().click(); 
});

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