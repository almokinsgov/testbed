const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const target = 'file:///D:/dev2/workspacewithai/Projects/ReoRite_2/working_dir/index.html';
  const screenshotDir = 'D:/dev2/workspacewithai/Projects/ReoRite_2/working_dir';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
  const consoleErrors = [];
  const pageErrors = [];
  const results = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(String(err && err.stack ? err.stack : err));
  });

  async function step(name, fn) {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (err) {
      results.push({ name, ok: false, error: String(err && err.stack ? err.stack : err) });
    }
  }

  await step('load', async () => {
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    await page.locator('#pageRegression').waitFor({ state: 'visible' });
  });

  await step('run-regression', async () => {
    await page.getByRole('button', { name: 'Run Tests' }).click();
    await page.waitForTimeout(1500);
    await page.locator('text=pass').first().waitFor({ state: 'visible', timeout: 5000 });
  });

  await step('open-rules', async () => {
    await page.getByRole('button', { name: 'Rules' }).click();
    await page.waitForTimeout(700);
    await page.locator('#pageRules').waitFor({ state: 'visible' });
    await page.locator('#pageRules').screenshot({ path: path.join(screenshotDir, 'runtime_rules.png') });
  });

  await step('open-demo', async () => {
    await page.getByRole('button', { name: 'Demo' }).click();
    await page.waitForTimeout(700);
    await page.locator('#pageDemo').waitFor({ state: 'visible' });
  });

  await step('open-g2p', async () => {
    await page.getByRole('button', { name: 'G2P', exact: true }).click();
    await page.waitForTimeout(900);
    await page.locator('#pageG2P').waitFor({ state: 'visible' });
    await page.locator('#pageG2P').screenshot({ path: path.join(screenshotDir, 'runtime_g2p.png') });
  });

  await step('open-detect', async () => {
    await page.getByRole('button', { name: 'Te Reo Detect' }).click();
    await page.waitForTimeout(900);
    await page.locator('#pageDetect').waitFor({ state: 'visible' });
    await page.locator('#pageDetect').screenshot({ path: path.join(screenshotDir, 'runtime_detect.png') });
  });

  await page.screenshot({ path: path.join(screenshotDir, 'runtime_post_clicks.png'), fullPage: true });

  const summary = {
    ok: results.every((r) => r.ok) && consoleErrors.length === 0 && pageErrors.length === 0,
    results,
    consoleErrors,
    pageErrors,
  };

  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
  process.exit(summary.ok ? 0 : 1);
})().catch((err) => {
  console.error(String(err && err.stack ? err.stack : err));
  process.exit(1);
});
