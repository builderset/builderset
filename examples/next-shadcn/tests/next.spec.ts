import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

/** Every computed style of the project's own button. */
const buttonStyle = async (page: Page, path: string) => {
  await page.goto(path);
  return page
    .locator('[data-shadcn-button]')
    .first()
    .evaluate((el) => {
      const style = getComputedStyle(el);
      return Object.fromEntries(Array.from(style, (name) => [name, style.getPropertyValue(name)]));
    });
};

test("the project's own pages are not disturbed by the editor's stylesheet", async ({ page }) => {
  const without = await buttonStyle(page, '/');
  const withSheet = await buttonStyle(page, '/styled');
  // Tailwind registers its --tw-* variables with @property, which CSS cannot
  // scope: they appear on every element, at Tailwind's own initial values.
  // Nothing else may differ.
  const own = (style: Record<string, string>) =>
    Object.fromEntries(Object.entries(style).filter(([name]) => !name.startsWith('--tw-')));
  expect(own(withSheet)).toEqual(own(without));
});

test.describe('the blog, a Server Component', () => {
  test.use({ javaScriptEnabled: false });

  test('the article is in the HTML, with JavaScript off', async ({ page }) => {
    // The HTML is what is tested; the pictures need not have finished loading.
    await page.goto('/blog/kitchen-sink', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Why buy a used car now' })).toBeVisible();
  });
});

test('the editor is not in the blog’s JavaScript', async ({ page }) => {
  const scripts: Promise<string>[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'script') scripts.push(response.text());
  });
  // Every script the page asks for; the pictures are local, so load comes quickly.
  await page.goto('/blog/kitchen-sink', { waitUntil: 'load' });
  await page.waitForTimeout(1_000);
  const bodies = await Promise.all(scripts);
  expect(bodies.length).toBeGreaterThan(0);
  // Words only the editor has.
  for (const body of bodies) {
    expect(body).not.toContain('Keyboard shortcuts');
    expect(body).not.toContain('Someone else saved this');
  }
});

/** Opens an email in the editor, on its own id, and clicks into its text. */
async function editEmail(page: Page, id: string) {
  await page.goto(`/emails/${id}/edit`);
  const text = page.locator('[data-node] [contenteditable]').first();
  await text.click();
  await page.keyboard.press('End');
  return text;
}

test('the REST host: a change is still there after a reload', async ({ page }) => {
  const id = `rest-${Date.now().toString(36)}`;
  await editEmail(page, id);
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith('/draft') && response.request().method() === 'PUT' && response.ok(),
  );
  await page.keyboard.type(' persisted words');
  await expect(page.getByText('persisted words').first()).toBeVisible();
  await saved;
  await page.reload();
  await expect(page.getByText('persisted words').first()).toBeVisible();
});

test('a conflict: someone else saved behind the editor’s back', async ({ page }) => {
  const id = `conflict-${Date.now().toString(36)}`;
  await editEmail(page, id);
  // Another tab, another person: the stored copy moves on.
  const file = join(process.cwd(), '.data', 'emails', `${id}.json`);
  const stored = JSON.parse(readFileSync(file, 'utf8')) as { saved_at: string };
  writeFileSync(
    file,
    JSON.stringify({ ...stored, saved_at: new Date(Date.now() + 60_000).toISOString() }),
  );
  await page.keyboard.type(' my words');
  await expect(page.getByText('Someone else saved this')).toBeVisible({ timeout: 10_000 });
});
