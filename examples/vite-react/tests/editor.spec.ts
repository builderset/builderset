import { expect, test, type Page } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

/** Opens a route and waits for the editor's document. Fails on any console error. */
async function open(page: Page, path: string) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(path);
  await expect(page.locator('[data-node]').first()).toBeVisible();
  return errors;
}

const nodes = (page: Page) => page.locator('[data-node]').count();
/** The editor's top bar: the first full-width row of the workspace. */
const topBar = (page: Page) => page.locator('.builderset header').first();

test('the editor mounts: top bar, add panel and canvas, no console error', async ({ page }) => {
  const errors = await open(page, '/email');
  await expect(topBar(page)).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Add' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Heading/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('insert, type, undo', async ({ page }) => {
  await open(page, '/email');
  const before = await nodes(page);
  await page.getByRole('button', { name: /^Heading/ }).click();
  await expect.poll(() => nodes(page)).toBeGreaterThan(before);
  // The new heading is the last one on the canvas; click into its text.
  const heading = page.locator('[data-node] [contenteditable]').last();
  await heading.click();
  await page.keyboard.type('Hello from a test');
  // On the canvas, and echoed in the panel that names the block.
  await expect(page.getByText('Hello from a test').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(async () => {
    await page.keyboard.press('ControlOrMeta+z');
    expect(await nodes(page)).toBe(before);
  }).toPass({ timeout: 10_000 });
  await expect(page.getByText('Hello from a test')).toHaveCount(0);
});

test('a change is saved to the host', async ({ page }) => {
  await open(page, '/email');
  await page.getByRole('button', { name: /^Divider/ }).click();
  await expect(page.locator('[data-example-bar]')).not.toHaveAttribute('data-saves', '0', {
    timeout: 8_000,
  });
  await expect(topBar(page).getByText(/saved/i)).toBeVisible();
});

test('a menu opens styled, inside the viewport', async ({ page }) => {
  await open(page, '/email');
  await topBar(page).locator('button[aria-haspopup="menu"]').last().click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  const box = await menu.boundingBox();
  const viewport = page.viewportSize();
  expect(box && viewport && box.x >= 0 && box.y >= 0).toBe(true);
  expect(box && viewport && box.x + box.width <= viewport.width).toBe(true);
  // The surface colour, and inside the editor's root, so it carries the theme.
  const surface = await page
    .locator('.builderset [class~="bst:bg-card"]')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  await expect(menu).toHaveCSS('background-color', surface);
  expect(await menu.evaluate((el) => Boolean(el.closest('.builderset')))).toBe(true);
});

test('theme="dark": the top bar is the dark default', async ({ page }) => {
  await open(page, '/email?theme=dark');
  await expect(page.locator('.builderset > div').first()).toHaveCSS(
    'background-color',
    'rgb(11, 12, 14)',
  );
});

test('theme="auto" follows the page’s own dark class', async ({ page }) => {
  await open(page, '/email?theme=auto&pageDark=1');
  await expect(page.locator('.builderset > div').first()).toHaveCSS(
    'background-color',
    'rgb(11, 12, 14)',
  );
});

test('a token applies: the selection outline turns orange', async ({ page }) => {
  await open(page, '/email?primary=%23da6c1e');
  await page.locator('[data-node] [contenteditable]').first().click();
  const outline = page
    .locator('.builderset [class~="bst:border-2"][class~="bst:border-primary"]')
    .first();
  await expect(outline).toHaveCSS('border-top-color', 'rgb(218, 108, 30)');
});

test('the editor speaks the language it is given', async ({ page }) => {
  await open(page, '/email?lang=sq');
  await expect(page.getByRole('tab', { name: 'Shto' })).toBeVisible();
  await expect(topBar(page).getByRole('button', { name: 'Aktivizo' })).toBeVisible();
});

test('one content language: no language switch in the top bar', async ({ page }) => {
  await open(page, '/email');
  await expect(topBar(page).getByRole('radio', { name: /^(SQ|EN|DE)$/i })).toHaveCount(0);
  await expect(topBar(page).getByText(/^EN$/)).toHaveCount(0);
});

test('a hostile page stylesheet does not change the editor', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const shot = async (path: string) => {
    await open(page, path);
    await page.locator('[data-example-bar]').evaluate((bar) => bar.remove());
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    return page.screenshot({ animations: 'disabled', caret: 'hide' });
  };
  const plain = await shot('/email');
  const hostile = await shot('/hostile');
  // The hostile sheet did load: it reaches the page's own body.
  expect(await page.evaluate(() => getComputedStyle(document.body).boxSizing)).toBe('content-box');
  // Pixels, not PNG bytes (the encoder does not write identical pictures
  // identically), and pixelmatch's usual tolerance for anti-aliasing noise.
  const one = PNG.sync.read(plain);
  const two = PNG.sync.read(hostile);
  expect(pixelmatch(one.data, two.data, undefined, one.width, one.height, { threshold: 0.1 })).toBe(
    0,
  );
});
