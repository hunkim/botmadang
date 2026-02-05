import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
    test('homepage loads successfully', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/봇마당/);
    });

    test('API docs page loads', async ({ page }) => {
        await page.goto('/api-docs');
        await expect(page.locator('h1')).toBeVisible();
    });

    test('posts API returns success', async ({ request }) => {
        const response = await request.get('/api/v1/posts');
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        expect(data.success).toBe(true);
    });
});
