import { expect, test } from '@playwright/test';

test('plan dnia pokazuje rotację i 7 dni', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Dzień 1 z 7/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nowa nauka: francuski' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Powtórka: arabski/ })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(7);
});

test('widok języka pokazuje liczbę fraz i luk', async ({ page }) => {
  await page.goto('./#/jezyki/aii');
  await expect(page.getByRole('heading', { name: /Suret/ })).toBeVisible();
  await expect(page.getByText(/Fraz: \d+, zweryfikowanych: \d+, luk: \d+/)).toBeVisible();
});

test('mandaryński: zmiana dnia, gra w tony, shadowing z nagraniem z mikrofonu', async ({ page }) => {
  await page.goto('./#/ustawienia');
  await page.getByRole('combobox').first().selectOption('zh');
  await page.getByRole('button', { name: 'Ustaw' }).click();
  await page.goto('./#/');
  await expect(page.getByRole('heading', { name: 'Nowa nauka: mandaryński' })).toBeVisible();
  await page.getByRole('button', { name: /Start: 20 min/ }).click();

  // Pierwszy krok: gra w tony.
  await expect(page.getByText('Gra: tony')).toBeVisible();
  await page.getByRole('button', { name: 'Dalej →' }).click();

  // Shadowing pierwszej frazy.
  await expect(page.getByText('Powtórz za mną')).toBeVisible();
  await expect(page.getByText(/zweryfikowane/).first()).toBeVisible();
  await page.getByRole('button', { name: /Nagraj siebie/ }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Zatrzymaj nagrywanie' }).click();
  await expect(page.getByRole('button', { name: '▶ Ja' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Dalej →' }).click();
  await expect(page.getByText('Powtórz za mną')).toBeVisible();
});
