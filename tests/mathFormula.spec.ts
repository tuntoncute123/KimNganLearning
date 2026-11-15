import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/(accounts\.google\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/, route => route.abort());
});

async function openFormula(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Tải bộ tài liệu mẫu/ }).click();
  await expect(page.locator('.pdf-viewport-container .annotation-drawing-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Công thức Toán', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

async function mockMicrophone(page: Page) {
  await page.addInitScript(() => {
    class MockRecognition {
      onstart: (() => void) | null = null;
      onresult: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      onend: (() => void) | null = null;
      starts = 0;
      constructor() { (window as any).mathMicrophone = this; }
      start() { this.starts++; this.onstart?.(); }
      stop() { this.onend?.(); }
      emit(phrases: string[], final = true) {
        this.onresult?.({ results: phrases.map(transcript => ({ 0: { transcript }, isFinal: final })) });
      }
    }
    (window as any).SpeechRecognition = MockRecognition;
  });
}

async function emit(page: Page, phrases: string[], final = true) {
  await page.evaluate(({ phrases, final }) => (window as any).mathMicrophone.emit(phrases, final), { phrases, final });
}

test('typed speech previews, documents grouping, inserts and persists the formula', async ({ page }) => {
  await openFormula(page);
  const input = page.getByLabel('Nội dung công thức / lời giải:');
  await input.fill('A + b tất cả bình / 2 + 3');
  await page.getByRole('button', { name: 'Chuyển lời đọc thành công thức' }).click();
  await expect(input).toHaveValue('(A + b)² / 2 + 3');
  await expect(page.locator('.voice-transcript')).toContainText('A + b tất cả bình / 2 + 3');
  await expect(page.locator('.preview-rendered-math')).toHaveText('(A + b)² / 2 + 3');
  await page.getByRole('button', { name: 'Mẫu câu nói' }).click();
  await expect(page.locator('.voice-help-card')).toContainText('a + b²');
  await page.getByText('Bình phương & ngoặc', { exact: true }).click();
  await page.getByRole('button', { name: '“a bình / 2 + 3” ➔ a² / 2 + 3', exact: true }).click();
  await expect(input).toHaveValue('a bình / 2 + 3');
  await page.getByRole('button', { name: 'Chuyển lời đọc thành công thức' }).click();
  await expect(input).toHaveValue('a² / 2 + 3');
  await page.getByRole('button', { name: 'Chèn vào bài giảng', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const storedMath = () => page.evaluate(() => new Promise<string[]>((resolve, reject) => {
    const request = indexedDB.open('HoloTutor_Workspace_DB');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, transaction = db.transaction('annotations');
      const read = transaction.objectStore('annotations').getAll();
      transaction.oncomplete = () => {
        db.close(); resolve(read.result.flatMap(record => record.strokes.filter((stroke: any) => stroke.tool === 'math-text').map((stroke: any) => stroke.text)));
      };
    };
  }));
  await expect.poll(storedMath).toEqual(['a² / 2 + 3']);
  await page.reload();
  await expect(page.locator('.pdf-viewport-container .annotation-drawing-canvas')).toBeVisible();
  expect(await storedMath()).toEqual(['a² / 2 + 3']);
});

test('voice handles interim revisions, pauses and stale events without losing or duplicating speech', async ({ page }) => {
  await mockMicrophone(page);
  await openFormula(page);
  const input = page.getByLabel('Nội dung công thức / lời giải:');
  await input.fill('Ta có:');
  await page.getByRole('button', { name: 'Nói ra công thức', exact: true }).click();
  await emit(page, ['a cộng'], false);
  await expect(input).toHaveValue('Ta có: a +');
  await emit(page, ['a cộng bê']);
  await expect(input).toHaveValue('Ta có: a + b');
  await page.evaluate(() => (window as any).mathMicrophone.onend());
  await emit(page, ['tất cả bình chia hai cộng ba']);
  await expect(input).toHaveValue('Ta có: (a + b)² / 2 + 3');
  await emit(page, ['tất cả bình chia hai cộng ba']);
  await expect(input).toHaveValue('Ta có: (a + b)² / 2 + 3');
  await page.evaluate(() => { (window as any).staleMathResult = (window as any).mathMicrophone.onresult; });
  await page.getByRole('button', { name: 'Đang nghe... (Dừng)', exact: true }).click();
  await expect(page.locator('.voice-transcript')).toContainText('a cộng bê tất cả bình chia hai cộng ba');
  await input.fill('Đã sửa: x²');
  await page.evaluate(() => (window as any).staleMathResult({ results: [{ 0: { transcript: 'một trăm' }, isFinal: true }] }));
  await expect(input).toHaveValue('Đã sửa: x²');
  await page.getByRole('button', { name: 'Nói ra công thức', exact: true }).click();
  await emit(page, ['cộng hai']);
  await expect(input).toHaveValue('Đã sửa: x² + 2');
  await input.fill('Chỉnh trực tiếp');
  await expect(page.getByRole('button', { name: 'Nói ra công thức', exact: true })).toBeVisible();
  await emit(page, ['không được ghi đè']);
  await expect(input).toHaveValue('Chỉnh trực tiếp');
});

test('microphone errors retain text and typed conversion remains available', async ({ page }) => {
  await mockMicrophone(page);
  await openFormula(page);
  await page.getByRole('button', { name: 'Nói ra công thức', exact: true }).click();
  await emit(page, ['hai phần ba']);
  await page.evaluate(() => (window as any).mathMicrophone.onerror({ error: 'not-allowed' }));
  await expect(page.getByRole('alert')).toContainText('Micro chưa được cấp quyền');
  await expect(page.getByLabel('Nội dung công thức / lời giải:')).toHaveValue('2 / 3');
  await page.getByRole('button', { name: 'Xóa', exact: true }).click();
  await expect(page.locator('.voice-transcript')).toHaveCount(0);
  await page.getByLabel('Nội dung công thức / lời giải:').fill('hai phẩy năm');
  await page.getByRole('button', { name: 'Chuyển lời đọc thành công thức' }).click();
  await expect(page.getByLabel('Nội dung công thức / lời giải:')).toHaveValue('2,5');
});

test('help and insertion controls remain reachable on a narrow screen without speech support', async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });
  await openFormula(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Nói ra công thức', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Trình duyệt chưa hỗ trợ');
  await page.getByRole('button', { name: 'Mẫu câu nói' }).click();
  for (const summary of await page.locator('.voice-example-category summary').all()) await summary.click();
  const dialog = await page.getByRole('dialog').boundingBox();
  expect(dialog!.x).toBeGreaterThanOrEqual(0);
  expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(390);
  expect(dialog!.y + dialog!.height).toBeLessThanOrEqual(844);
  await page.getByLabel('Nội dung công thức / lời giải:').fill('a cộng bê tất cả bình');
  await page.getByRole('button', { name: 'Chuyển lời đọc thành công thức' }).click();
  await page.getByRole('button', { name: 'Chèn vào bài giảng', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
