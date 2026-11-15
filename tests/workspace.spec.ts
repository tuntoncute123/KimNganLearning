import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // External identity/fonts aren't part of local document and drawing tests.
  await page.route(/^https:\/\/(accounts\.google\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/, route => route.abort());
});

async function sample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Tải bộ tài liệu mẫu/ }).click();
  await expect(page.locator('.pdf-viewport-container .annotation-drawing-canvas')).toBeVisible();
}

async function records(page: Page, store = 'annotations'): Promise<any[]> {
  return page.evaluate((store) => new Promise<any[]>((resolve, reject) => {
    const request = indexedDB.open('HoloTutor_Workspace_DB');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(store, 'readonly');
      const read = tx.objectStore(store).getAll();
      read.onsuccess = () => resolve(read.result);
      tx.oncomplete = () => db.close();
    };
  }), store);
}

async function draw(page: Page, selector = '.pdf-viewport-container .annotation-drawing-canvas') {
  await page.getByRole('button', { name: 'Bút viết', exact: true }).click();
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error('Missing annotation canvas');
  await page.mouse.move(box.x + 120, box.y + 190);
  await page.mouse.down();
  await page.mouse.move(box.x + 210, box.y + 230, { steps: 12 });
  await page.mouse.up();
}

test('home defers document readers and sidebar opens repeatedly', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 900 });
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Tải bộ tài liệu mẫu/ })).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Cây thư mục', exact: true }).click();
    await expect(page.getByRole('complementary', { name: 'Kho tài liệu bài giảng' })).toBeVisible();
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  }
  expect(requests.filter(url => /pdf-vendor|docx-vendor|PDFViewer-|WordViewer-|pdf\.worker/.test(url))).toEqual([]);
  expect(errors).toEqual([]);
});

test('drawings persist per page, undo/redo persist, deletion removes associated drawings', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await sample(page);
  await draw(page);
  await expect.poll(async () => (await records(page)).find(record => record.key.endsWith('_1'))?.strokes.length).toBe(1);
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  await expect.poll(async () => (await records(page))[0]?.strokes.length).toBe(0);
  await page.getByRole('button', { name: 'Làm lại', exact: true }).click();
  await expect.poll(async () => (await records(page))[0]?.strokes.length).toBe(1);
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Số trang hiện tại' })).toHaveValue('2');
  await expect(page.getByRole('button', { name: 'Xóa nét vẽ', exact: true })).toBeDisabled();
  await draw(page);
  await expect.poll(async () => (await records(page)).length).toBe(2);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Số trang hiện tại' })).toHaveValue('2');
  await expect(page.getByRole('button', { name: 'Xóa nét vẽ', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Trang trước', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xóa nét vẽ', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Đóng Toan_12_HinhHoc.pdf', exact: true }).click();
  await expect.poll(async () => (await records(page)).length).toBe(2);
  await expect.poll(async () => (await records(page, 'teaching_documents')).length).toBe(2);
  await page.getByRole('button', { name: 'Quản lý tài liệu', exact: true }).click();
  await page.locator('.sidebar-file-row').filter({ hasText: 'Toan_12_HinhHoc.pdf' }).hover();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Xóa Toan_12_HinhHoc.pdf', exact: true }).click();
  await expect.poll(async () => (await records(page)).length).toBe(0);
  await expect.poll(async () => (await records(page, 'teaching_documents')).length).toBe(1);
  await expect.poll(async () => (await records(page, 'document_contents')).length).toBe(1);
  expect(errors).toEqual([]);
});

test('home tab navigation, sample append and rapid PDF navigation remain usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await sample(page);
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
    await page.getByRole('button', { name: 'Phóng to', exact: true }).click();
    await page.getByRole('button', { name: 'Trang trước', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Quản lý tài liệu', exact: true }).click();
  await page.getByRole('button', { name: 'Màn hình chính', exact: true }).click();
  await expect(page.getByRole('button', { name: /Tải bộ tài liệu mẫu/ })).toBeVisible();
  await page.getByRole('tab', { name: /Toan_12_HinhHoc/ }).click();
  await expect(page.locator('.pdf-viewport-container canvas').first()).toBeVisible();
  await page.getByRole('button', { name: 'Quản lý tài liệu', exact: true }).click();
  await page.getByRole('button', { name: 'Màn hình chính', exact: true }).click();
  await page.getByRole('button', { name: /Tải bộ tài liệu mẫu/ }).click();
  await expect(page.getByRole('tab')).toHaveCount(4);
  await expect.poll(async () => (await records(page, 'teaching_documents')).length).toBe(4);
  await expect(page.locator('.viewer-error-box')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('scratchpad survives reload and clearing workspace removes all annotations', async ({ page }) => {
  await sample(page);
  await page.getByRole('button', { name: 'Lề nháp giải toán', exact: true }).click();
  await draw(page, '.math-scratchpad-panel .annotation-drawing-canvas');
  await expect.poll(async () => (await records(page)).find(record => record.key === 'scratchpad')?.strokes.length).toBe(1);
  await page.reload();
  await page.getByRole('button', { name: 'Lề nháp giải toán', exact: true }).click();
  await expect(page.locator('.math-scratchpad-panel .annotation-drawing-canvas')).toBeVisible();
  await expect.poll(async () => (await records(page)).find(record => record.key === 'scratchpad')?.strokes.length).toBe(1);
  await page.getByRole('button', { name: 'Quản lý tài liệu', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: /Xóa hết Workspace/ }).click();
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect.poll(async () => (await records(page)).length).toBe(0);
  await expect.poll(async () => (await records(page, 'teaching_documents')).length).toBe(0);
});

test('version 1 database upgrades without losing document contents or reading progress', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Tải bộ tài liệu mẫu/ })).toBeVisible();
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const removal = indexedDB.deleteDatabase('HoloTutor_Workspace_DB');
      removal.onsuccess = () => resolve();
      removal.onerror = () => reject(removal.error);
    });
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('HoloTutor_Workspace_DB', 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('teaching_documents', { keyPath: 'id' });
        store.createIndex('lastOpenedAt', 'lastOpenedAt');
        store.createIndex('createdAt', 'createdAt');
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('teaching_documents', 'readwrite');
        const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFz0AAAAASUVORK5CYII='), character => character.charCodeAt(0));
        tx.objectStore('teaching_documents').put({
          id: 'legacy', name: 'Tài liệu cũ.png', type: 'image', mimeType: 'image/png',
          data: bytes.buffer, size: bytes.byteLength, createdAt: 1, lastOpenedAt: 1,
          zoom: 1.45, rotation: 90, currentPage: 1, totalPages: 1,
          studentName: '__proto__', lessonName: 'constructor',
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onabort = () => reject(tx.error);
      };
    });
  });
  await page.reload();
  await expect(page.getByRole('tab', { name: /Tài liệu cũ/ })).toBeVisible();
  const docs = await records(page, 'teaching_documents');
  expect(docs[0].zoom).toBe(1.45);
  expect(docs[0].rotation).toBe(90);
  expect(docs[0].data).toBeUndefined();
  expect(await page.evaluate(() => new Promise(resolve => {
    const request = indexedDB.open('HoloTutor_Workspace_DB');
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('document_contents');
      const read = tx.objectStore('document_contents').get('legacy');
      read.onsuccess = () => resolve(Array.from(new Uint8Array(read.result.data)).slice(0, 4));
      tx.oncomplete = () => db.close();
    };
  }))).toEqual([137, 80, 78, 71]);
  await page.getByRole('button', { name: 'Quản lý tài liệu', exact: true }).click();
  await expect(page.locator('.tree-student-name')).toHaveText('__proto__');
  await expect(page.locator('.tree-lesson-name')).toHaveText('constructor');
  expect(await records(page)).toEqual([]);
});

test('failed drawing transaction shows an error instead of saved status', async ({ page }) => {
  await sample(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    (window as any).restorePut = () => { IDBObjectStore.prototype.put = original; };
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'annotations') {
        // Let the request succeed, then abort the transaction: commit must be awaited.
        const request = original.apply(this, args);
        request.addEventListener('success', () => this.transaction.abort());
        return request;
      }
      return original.apply(this, args);
    };
  });
  await draw(page);
  await expect(page.getByRole('status')).toContainText('Chưa lưu được nét vẽ');
  expect(await records(page)).toEqual([]);
  await expect(page.getByRole('button', { name: 'Hoàn tác', exact: true })).toBeEnabled();
  await page.evaluate(() => (window as any).restorePut());
  await page.getByRole('button', { name: 'Thử lưu lại', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Nét vẽ được lưu trên thiết bị này');
  await expect.poll(async () => (await records(page))[0]?.strokes.length).toBe(1);
});

test('Word reader loads on demand and renders an uploaded document', async ({ page }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  await page.getByLabel('Chọn tài liệu', { exact: true }).setInputFiles('tests/fixtures/lesson.docx');
  await expect(page.locator('.docx-render-target')).toContainText('Bài học kiểm thử Kim Ngân');
  expect(requests.some(url => url.includes('docx-vendor'))).toBe(true);
  expect(requests.some(url => url.includes('pdf-vendor'))).toBe(false);
  expect(errors).toEqual([]);
});
