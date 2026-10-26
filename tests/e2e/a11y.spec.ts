// Dostępność (axe): kontrast i podstawowe reguły w motywie Krem i Noc, dla każdego akcentu.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const accents = ['indygo', 'cynober', 'matcha', 'sakura', 'zloto'];

for (const theme of ['krem', 'noc']) {
  for (const accent of accents) {
    test(`axe: ${theme} / ${accent}`, async ({ page }) => {
      await page.addInitScript(
        ([t, a]) => localStorage.setItem('poliglota-look', JSON.stringify({ theme: t, accent: a, fx: false })),
        [theme, accent],
      );
      for (const path of ['./', './#/jezyki/zh', './#/ustawienia', './#/sesja/nauka/zh']) {
        await page.goto(path);
        await page.waitForTimeout(300);
        const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
        const msg = res.violations.map((v) => `${path} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
        expect(msg).toEqual([]);
      }
    });
  }
}
