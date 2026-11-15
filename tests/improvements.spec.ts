import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const canvasSelector = '.active-viewer-container .annotation-drawing-canvas';
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/(accounts\.google\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/, route => route.abort());
});
async function sample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Tải bộ tài liệu mẫu/ }).click();
  await expect(page.locator(canvasSelector)).toBeVisible();
}
async function records(page: Page, store = 'annotations'): Promise<any[]> {
  return page.evaluate(store => new Promise((resolve, reject) => {
    const request = indexedDB.open('HoloTutor_Workspace_DB');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction(store);
      const read = tx.objectStore(store).getAll();
      tx.oncomplete = () => { db.close(); resolve(read.result); };
      tx.onabort = () => reject(tx.error);
    };
  }), store);
}
async function draw(page: Page, selector = canvasSelector, from = { x: 120, y: 190 }, to = { x: 210, y: 230 }) {
  await page.getByRole('button', { name: 'Bút viết', exact: true }).click();
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error('Canvas is missing');
  await page.mouse.move(box.x + from.x, box.y + from.y); await page.mouse.down();
  await page.mouse.move(box.x + to.x, box.y + to.y, { steps: 12 }); await page.mouse.up();
  await expect(page.locator('.workspace-save-status')).toContainText('Nét vẽ được lưu');
}
async function redBounds(page: Page) {
  return page.locator(canvasSelector).evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let left = canvas.width, top = canvas.height, right = 0, bottom = 0, count = 0;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      if (data[i] > 180 && data[i + 1] < 120 && data[i + 3] > 100) {
        count++; left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
    return { left: left / canvas.width, top: top / canvas.height, right: right / canvas.width, bottom: bottom / canvas.height, count };
  });
}

test('closing every tab preserves drawings and files through reload and reopening', async ({ page }) => {
  await sample(page); await draw(page);
  const strokes = (await records(page))[0].strokes;
  await page.getByRole('button', { name: 'Đóng Toan_12_HinhHoc.pdf', exact: true }).click();
  await page.getByRole('button', { name: 'Đóng BaiTap_Toan_Oxy.png', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('tab')).toHaveCount(0);
  expect(await records(page, 'teaching_documents')).toHaveLength(2);
  expect(await records(page, 'document_contents')).toHaveLength(2);
  expect((await records(page))[0].strokes).toEqual(strokes);
  await page.getByRole('button', { name: 'Quản lý tài liệu', exact: true }).click();
  await page.locator('.sidebar-file-row').filter({ hasText: 'Toan_12_HinhHoc.pdf' }).click();
  await expect(page.locator(canvasSelector)).toBeVisible();
  expect((await redBounds(page)).count).toBeGreaterThan(50);
});

for (const type of ['pdf', 'image', 'word']) {
  test(`${type}: drawing coordinates remain stable across zoom and reload`, async ({ page }) => {
    if (type === 'word') {
      await page.goto('/');
      await page.getByLabel('Chọn tài liệu', { exact: true }).setInputFiles('tests/fixtures/lesson.docx');
      await expect(page.locator(canvasSelector)).toBeVisible();
    } else {
      await sample(page);
      if (type === 'image') await page.getByRole('tab', { name: /BaiTap_Toan_Oxy/ }).click();
      await expect(page.locator(canvasSelector)).toBeVisible();
    }
    await page.getByRole('button', { name: 'Đặt lại tỉ lệ 100%', exact: true }).click();
    await expect(page.locator(canvasSelector)).toBeVisible();
    await draw(page);
    const original = await redBounds(page), strokes = (await records(page))[0].strokes;
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Phóng to', exact: true }).click();
    await expect(page.locator(canvasSelector)).toBeVisible();
    const zoomed = await redBounds(page);
    expect(zoomed.left).toBeCloseTo(original.left, 2); expect(zoomed.top).toBeCloseTo(original.top, 2);
    expect(zoomed.right).toBeCloseTo(original.right, 2);
    await draw(page, canvasSelector, { x: 140, y: 140 }, { x: 180, y: 160 });
    const second = (await records(page))[0].strokes[1];
    expect(second.points[0].x).toBeCloseTo(140 / 1.45, 0);
    expect(second.points[0].y).toBeCloseTo(140 / 1.45, 0);
    await page.reload(); await expect(page.locator(canvasSelector)).toBeVisible();
    expect((await records(page))[0].strokes[0]).toEqual(strokes[0]);
    expect((await redBounds(page)).count).toBeGreaterThan(50);
  });
}

test('rotation transforms the page and new drawing input together; export includes ink', async ({ page }) => {
  await sample(page);
  await page.getByRole('button', { name: 'Đặt lại tỉ lệ 100%', exact: true }).click();
  await page.getByRole('button', { name: 'Xoay 90 độ', exact: true }).click();
  await expect(page.locator(canvasSelector)).toBeVisible();
  const width = await page.locator('.document-plane').evaluate(el => (el as HTMLElement).offsetWidth);
  const height = await page.locator('.document-plane').evaluate(el => (el as HTMLElement).offsetHeight);
  await draw(page, canvasSelector, { x: 100, y: 150 }, { x: 140, y: 170 });
  const first = (await records(page))[0].strokes[0].points[0];
  expect(first.x).toBeCloseTo(150, 0); expect(first.y).toBeCloseTo(height - 100, 0);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất trang có ghi chú (PNG)', exact: true }).click();
  const download = await downloadPromise;
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  const result = await page.evaluate(async encoded => {
    const image = new Image(); image.src = `data:image/png;base64,${encoded}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(195, 295, 100, 70).data;
    let red = 0; for (let i = 0; i < data.length; i += 4) if (data[i] > 180 && data[i + 1] < 120) red++;
    return { width: image.width, height: image.height, red };
  }, bytes.toString('base64'));
  expect(result.width).toBe(height * 2); expect(result.height).toBe(width * 2); expect(result.red).toBeGreaterThan(20);
});

test('workspace backup restores files, page ink and scratchpad without replacing existing data', async ({ page }) => {
  await sample(page); await draw(page);
  await page.getByRole('button', { name: 'Lề nháp giải toán', exact: true }).click();
  await expect(page.locator('.math-scratchpad-panel')).toBeVisible();
  await page.locator('.math-scratchpad-panel').evaluate(async el => { await Promise.all(el.getAnimations().map(animation => animation.finished)); });
  await draw(page, '.math-scratchpad-panel .annotation-drawing-canvas', { x: 100, y: 80 }, { x: 180, y: 120 });
  await expect.poll(async () => (await records(page)).find(record => record.key === 'scratchpad')?.strokes.length).toBe(1);
  const original = await records(page), originalDocs = await records(page, 'teaching_documents');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sao lưu workspace', exact: true }).click();
  const backup = await downloadPromise;
  const path = (await backup.path())!, content = JSON.parse(await readFile(path, 'utf8'));
  expect(content.documents).toHaveLength(2); expect(content.annotations).toHaveLength(2);
  expect(typeof content.documents[0].data).toBe('string');
  await page.getByLabel('Chọn bản sao lưu', { exact: true }).setInputFiles(path);
  await expect(page.getByRole('alert')).toContainText('Đã nhập 2 tài liệu');
  const docs = await records(page, 'teaching_documents'), ink = await records(page);
  expect(docs).toHaveLength(4);
  expect(docs.filter(doc => originalDocs.some(original => original.id === doc.id))).toHaveLength(2);
  expect(docs.every(doc => !('data' in doc))).toBe(true);
  expect(await records(page, 'document_contents')).toHaveLength(4);
  expect(ink.find(record => record.key === original.find(record => record.documentId)?.key)?.strokes).toEqual(original.find(record => record.documentId)?.strokes);
  expect(ink.find(record => record.key === 'scratchpad').strokes).toHaveLength(2);
  expect(ink.filter(record => record.documentId)).toHaveLength(2);
  const invalid = { ...content, annotations: [{ ...content.annotations[0], documentId: 'missing' }] };
  await page.getByLabel('Chọn bản sao lưu', { exact: true }).setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid)) });
  await expect(page.getByRole('alert')).toContainText('không hợp lệ');
  expect(await records(page, 'teaching_documents')).toHaveLength(4);
});

test('invalid uploads are rejected and corrupt PDF shows a reader error', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Chọn tài liệu', { exact: true }).setInputFiles({ name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a pdf') });
  await expect(page.getByRole('alert')).toContainText('không khớp định dạng');
  expect(await records(page, 'teaching_documents')).toHaveLength(0);
  await page.getByLabel('Chọn tài liệu', { exact: true }).setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nbroken') });
  await expect(page.locator('.viewer-error-box')).toContainText('Không thể đọc file PDF');
});

test('Drive failure keeps local file usable, supports retry and reports expired login', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('holotutor_google_client_id', 'test-client');
    (window as any).google = { accounts: { oauth2: { initTokenClient: (config: any) => ({
      requestAccessToken: () => config.callback({ access_token: 'test-token' }),
    }) } } };
  });
  await page.route('https://www.googleapis.com/oauth2/v3/userinfo', route => route.fulfill({ json: { email: 'teacher@example.test' } }));
  let releaseFolders!: () => void;
  const folderGate = new Promise<void>(resolve => { releaseFolders = resolve; });
  await page.route('https://www.googleapis.com/drive/v3/files?*', async route => {
    await folderGate; await route.fulfill({ json: { files: [{ id: 'folder', name: 'Lesson' }] } });
  });
  let uploadStatus = 500;
  await page.route('https://www.googleapis.com/upload/drive/v3/files?*', route => route.fulfill({ status: uploadStatus,
    json: uploadStatus === 200 ? { id: 'remote', name: 'lesson.docx' } : { error: 'Upload unavailable' } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Kết nối Google Drive', exact: true }).click();
  await page.getByRole('button', { name: 'Kết nối Drive', exact: true }).click();
  await expect(page.getByText('teacher@example.test', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByLabel('Chọn tài liệu', { exact: true }).setInputFiles('tests/fixtures/lesson.docx');
  await expect(page.locator('.docx-render-target')).toContainText('Bài học kiểm thử Kim Ngân');
  expect(await records(page, 'teaching_documents')).toHaveLength(1);
  releaseFolders();
  await expect(page.getByRole('button', { name: 'Thử tải lại', exact: true })).toBeVisible();
  uploadStatus = 401;
  await page.getByRole('button', { name: 'Thử tải lại', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đăng nhập lại Google', exact: true })).toBeVisible();
  expect((await records(page, 'teaching_documents'))[0].driveStatus).toBe('auth-required');
  await page.getByRole('button', { name: 'Đăng nhập lại Google', exact: true }).click();
  await page.getByRole('button', { name: 'Kết nối Drive', exact: true }).click();
  await expect(page.getByText('teacher@example.test', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  uploadStatus = 200;
  await page.getByRole('button', { name: 'Thử tải lại', exact: true }).click();
  await expect.poll(async () => (await records(page, 'teaching_documents'))[0].driveStatus).toBe('synced');
  expect(await records(page, 'document_contents')).toHaveLength(1);
});

test('touch pointer draws in the transformed document plane', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Native touch stream uses Chromium CDP.');
  await sample(page);
  await page.getByRole('button', { name: 'Phóng to', exact: true }).click();
  await page.getByRole('button', { name: 'Bút viết', exact: true }).click();
  const canvas = page.locator(canvasSelector);
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 130, y: box.y + 130 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + 195, y: box.y + 156 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => (await records(page))[0]?.strokes.length).toBe(1);
  const point = (await records(page))[0].strokes[0].points[0];
  expect(point.x).toBeCloseTo(100, 0); expect(point.y).toBeCloseTo(100, 0);
  await session.detach();
});

test('legacy v2 drawings retain their saved coordinate basis after migration', async ({ page }) => {
  await sample(page); await draw(page);
  await page.evaluate(async () => {
    const read = (store: string) => new Promise<any[]>(resolve => {
      const q = indexedDB.open('HoloTutor_Workspace_DB');
      q.onsuccess = () => { const db = q.result, tx = db.transaction(store), r = tx.objectStore(store).getAll();
        tx.oncomplete = () => { db.close(); resolve(r.result); }; };
    });
    const [docs, contents, drawings] = await Promise.all([read('teaching_documents'), read('document_contents'), read('annotations')]);
    await new Promise<void>(resolve => { const q = indexedDB.deleteDatabase('HoloTutor_Workspace_DB'); q.onsuccess = () => resolve(); });
    await new Promise<void>((resolve, reject) => {
      const q = indexedDB.open('HoloTutor_Workspace_DB', 2);
      q.onupgradeneeded = () => {
        const documents = q.result.createObjectStore('teaching_documents', { keyPath: 'id' });
        documents.createIndex('lastOpenedAt', 'lastOpenedAt'); documents.createIndex('createdAt', 'createdAt');
        const annotations = q.result.createObjectStore('annotations', { keyPath: 'key' }); annotations.createIndex('documentId', 'documentId');
        docs.forEach(doc => documents.put({ ...doc, data: contents.find(item => item.id === doc.id).data }));
        drawings.forEach(record => annotations.put({ key: record.key, documentId: record.documentId,
          strokes: record.strokes.map((stroke: any) => ({ ...stroke, points: stroke.points.map((point: any) => ({ x: point.x * 1.15, y: point.y * 1.15 })) })) }));
      };
      q.onsuccess = () => { q.result.close(); resolve(); }; q.onerror = () => reject(q.error);
    });
  });
  await page.reload(); await expect(page.locator(canvasSelector)).toBeVisible();
  const migrated = (await records(page))[0]; expect(migrated.basis).toEqual({ zoom: 1.15, rotation: 0 });
  const before = await redBounds(page);
  await page.getByRole('button', { name: 'Phóng to', exact: true }).click();
  await expect(page.locator(canvasSelector)).toBeVisible();
  const after = await redBounds(page);
  expect(after.left).toBeCloseTo(before.left, 2); expect(after.top).toBeCloseTo(before.top, 2);
  expect(await records(page, 'document_contents')).toHaveLength(2);
  expect((await records(page, 'teaching_documents')).every(doc => !('data' in doc))).toBe(true);
});

test('restoring a backup rolls back every store if a contents transaction fails', async ({ page }) => {
  await sample(page); await draw(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sao lưu workspace', exact: true }).click();
  const file = await downloadPromise;
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (...args) {
      const request = original.apply(this, args);
      if (this.name === 'document_contents') request.addEventListener('success', () => this.transaction.abort());
      return request;
    };
  });
  await page.getByLabel('Chọn bản sao lưu', { exact: true }).setInputFiles((await file.path())!);
  await expect(page.getByRole('alert')).toContainText('Giao dịch lưu trữ đã bị hủy');
  expect(await records(page, 'teaching_documents')).toHaveLength(2);
  expect(await records(page, 'document_contents')).toHaveLength(2);
  expect(await records(page)).toHaveLength(1);
});

test('print preparation retains page content and annotation image without editing the workspace', async ({ page }) => {
  await sample(page); await draw(page);
  await page.evaluate(() => {
    const append = document.body.append.bind(document.body);
    document.body.append = (...nodes) => {
      append(...nodes);
      for (const node of nodes) if (node instanceof HTMLIFrameElement && node.contentWindow) {
        node.contentWindow.print = () => { node.dataset.printRequested = 'true'; };
      }
    };
  });
  await page.getByRole('button', { name: 'In / Lưu PDF trang này', exact: true }).click();
  await expect(page.locator('iframe[title="Bản in bài giảng"]')).toHaveAttribute('data-print-requested', 'true');
  await expect(page.frameLocator('iframe[title="Bản in bài giảng"]').locator('img.lesson-print')).toHaveJSProperty('complete', true);
  expect((await records(page))[0].strokes).toHaveLength(1);
});

for (const type of ['pdf', 'image']) {
  test(`${type}: all quarter turns preserve input and ink when returning to the original rotation`, async ({ page }) => {
    await sample(page);
    if (type === 'image') await page.getByRole('tab', { name: /BaiTap_Toan_Oxy/ }).click();
    await page.getByRole('button', { name: 'Đặt lại tỉ lệ 100%', exact: true }).click();
    await expect(page.locator(canvasSelector)).toBeVisible();
    const dims = await page.locator('.document-plane').evaluate(el => ({ width: (el as HTMLElement).offsetWidth, height: (el as HTMLElement).offsetHeight }));
    for (const angle of [90, 180, 270]) {
      await page.getByRole('button', { name: 'Xoay 90 độ', exact: true }).click();
      await expect(page.locator('.document-surface')).toHaveAttribute('data-rotation', String(angle));
      await expect(page.locator(canvasSelector)).toBeVisible();
      await draw(page, canvasSelector, { x: 100, y: 120 }, { x: 130, y: 150 });
      const point = (await records(page))[0].strokes.at(-1).points[0];
      const expected = angle === 90 ? { x: 120, y: dims.height - 100 }
        : angle === 180 ? { x: dims.width - 100, y: dims.height - 120 } : { x: dims.width - 120, y: 100 };
      // Native mouse coordinates can be rounded to whole CSS pixels (Firefox).
      expect(Math.abs(point.x - expected.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(point.y - expected.y)).toBeLessThanOrEqual(1);
    }
    await page.getByRole('button', { name: 'Xoay 90 độ', exact: true }).click();
    await expect(page.locator(canvasSelector)).toBeVisible();
    expect((await records(page))[0].strokes).toHaveLength(3);
  });
}

test('Word print includes one copy of the document and its ink', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Chọn tài liệu', { exact: true }).setInputFiles('tests/fixtures/lesson.docx');
  await expect(page.locator(canvasSelector)).toBeVisible();
  await expect(page.locator('.docx-render-target section')).toHaveCount(1);
  await draw(page);
  await page.evaluate(() => {
    const append = document.body.append.bind(document.body);
    document.body.append = (...nodes) => {
      append(...nodes);
      for (const node of nodes) if (node instanceof HTMLIFrameElement && node.contentWindow) node.contentWindow.print = () => { node.dataset.printRequested = 'true'; };
    };
  });
  await page.getByRole('button', { name: 'In / Lưu PDF tài liệu', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Bản in bài giảng"]');
  await expect(page.locator('iframe[title="Bản in bài giảng"]')).toHaveAttribute('data-print-requested', 'true');
  await expect(frame.locator('.docx-render-target')).toContainText('Bài học kiểm thử Kim Ngân');
  await expect(frame.locator('.annotation-canvas-container img')).toHaveJSProperty('complete', true);
});
