import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/(accounts\.google\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/, route => route.abort());
});

async function section(page: Page, role: 'teacher' | 'student', name: string) {
  await page.goto(`/#/${role}/${name}`);
  await expect(page.getByLabel('Lọc theo lớp')).toBeVisible();
}
async function createClass(page: Page, name = 'Toán 9A') {
  await section(page, 'teacher', 'classes');
  await page.getByRole('button', { name: 'Tạo lớp học', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên lớp', { exact: true }).fill(name);
  await dialog.getByLabel('Môn học', { exact: true }).fill('Toán');
  await dialog.getByRole('button', { name: 'Lưu lớp học' }).click();
  await expect(dialog).not.toBeVisible();
  return page.locator('article').filter({ has: page.getByRole('heading', { name, exact: true }) });
}
async function addStudent(page: Page, className: string, name: string) {
  await page.locator('article').filter({ has: page.getByRole('heading', { name: className, exact: true }) }).getByRole('button', { name: 'Danh sách học sinh' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Họ tên học sinh', { exact: true }).fill(name);
  await dialog.getByRole('button', { name: 'Thêm học sinh', exact: true }).click();
  await expect(dialog.getByText(name, { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Đóng biểu mẫu' }).click();
}
async function assignment(page: Page, title = 'Phương trình bậc hai') {
  await section(page, 'teacher', 'assignments');
  await page.getByRole('button', { name: 'Giao bài tập', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên bài tập', { exact: true }).fill(title);
  await dialog.getByLabel('Yêu cầu bài tập').fill('Giải phương trình x² − 5x + 6 = 0 và trình bày cách làm.');
  await dialog.getByLabel('Hạn nộp', { exact: true }).fill('2030-12-20T20:00');
  await dialog.getByRole('button', { name: 'Lưu bài tập', exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
async function readLearning(page: Page) {
  return page.evaluate(() => new Promise<any>((resolve, reject) => {
    const request = indexedDB.open('KimNgan_Learning_DB');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('learning'), read = tx.objectStore('learning').get('state');
      tx.oncomplete = () => { db.close(); resolve(read.result); };
    };
  }));
}

test('teacher creates a class; student drafts, submits an attachment; teacher grades and student sees feedback', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await createClass(page);
  await addStudent(page, 'Toán 9A', 'Nguyễn Minh Anh');
  await assignment(page);
  await section(page, 'student', 'assignments');
  await page.getByRole('button', { name: 'Làm bài', exact: true }).click();
  await page.getByLabel('Bài làm của em').fill('Ta có (x − 2)(x − 3) = 0. Vậy x = 2 hoặc x = 3.');
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Bản nháp', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Làm bài', exact: true }).click();
  await expect(page.getByLabel('Bài làm của em')).toContainText('x = 2 hoặc x = 3');
  await page.getByLabel('Đính kèm bài làm', { exact: false }).setInputFiles('tests/fixtures/lesson.docx');
  await expect(page.getByRole('button', { name: 'lesson.docx', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await section(page, 'teacher', 'assignments');
  await page.getByRole('button', { name: 'Xem & chấm bài' }).click();
  await expect(page.getByRole('dialog')).toContainText('x = 2 hoặc x = 3');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải bài làm: lesson.docx' }).click();
  const file = await downloaded;
  expect(await readFile((await file.path())!)).toEqual(await readFile('tests/fixtures/lesson.docx'));
  await page.getByLabel('Điểm (tối đa 10)').fill('9');
  await page.getByLabel('Nhận xét của giáo viên').fill('Làm tốt, cần ghi đầy đủ kết luận.');
  await page.getByRole('button', { name: 'Lưu điểm & nhận xét' }).click();
  await expect(page.getByRole('dialog').getByText('Đã chấm: 9/10')).toBeVisible();
  await page.getByRole('button', { name: 'Đóng biểu mẫu' }).click();
  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất bảng điểm' }).click();
  const csv = await csvDownload;
  expect(await readFile((await csv.path())!, 'utf8')).toContain('Nguyễn Minh Anh');
  await section(page, 'student', 'results');
  await expect(page.getByText('9/10 điểm', { exact: true })).toBeVisible();
  await expect(page.getByText('Làm tốt, cần ghi đầy đủ kết luận.', { exact: true })).toBeVisible();
  await section(page, 'student', 'assignments');
  await page.getByRole('button', { name: 'Xem bài & nhận xét' }).click();
  await expect(page.getByLabel('Bài làm của em')).toHaveAttribute('readonly', '');
  await expect(page.getByRole('button', { name: 'Nộp lại bài' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Đóng biểu mẫu' }).click();
  expect((await readLearning(page)).submissions).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('schedule conflicts are rejected and attendance persists for the student', async ({ page }) => {
  await createClass(page); await addStudent(page, 'Toán 9A', 'Lan');
  await section(page, 'teacher', 'schedule');
  const create = async (title: string, time: string) => {
    await page.getByRole('button', { name: 'Lên lịch buổi học', exact: true }).click();
    await page.getByLabel('Tên buổi học').fill(title);
    await page.getByLabel('Bắt đầu lúc').fill(time);
    await page.getByLabel('Link phòng học').fill('https://meet.google.com/abc-defg-hij');
    await page.getByRole('button', { name: 'Lưu lịch học', exact: true }).click();
  };
  await create('Ôn tập chương 1', '2030-12-15T18:00');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await create('Buổi trùng giờ', '2030-12-15T18:30');
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Lịch bị trùng');
  await page.getByRole('button', { name: 'Đóng biểu mẫu' }).click();
  expect((await readLearning(page)).sessions).toHaveLength(1);
  await page.getByRole('button', { name: 'Điểm danh', exact: true }).click();
  await page.getByRole('button', { name: 'Đánh dấu tất cả có mặt' }).click();
  await page.getByRole('button', { name: 'Lưu điểm danh', exact: true }).click();
  await section(page, 'student', 'schedule');
  await expect(page.getByText('Điểm danh: Có mặt', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Vào phòng học' })).toHaveAttribute('href', 'https://meet.google.com/abc-defg-hij');
  await section(page, 'student', 'results');
  await expect(page.getByText('Có mặt', { exact: true })).toBeVisible();
});

test('student filters by membership, local drafts stay out of teacher review, archived classes can be restored', async ({ page }) => {
  await createClass(page); await addStudent(page, 'Toán 9A', 'Lan'); await assignment(page, 'Bài của lớp A');
  await section(page, 'student', 'assignments');
  await page.getByRole('button', { name: 'Làm bài' }).click(); await page.getByLabel('Bài làm của em').fill('Nháp riêng chưa nộp');
  await page.getByRole('button', { name: 'Lưu bản nháp' }).click();
  await section(page, 'teacher', 'assignments'); await page.getByRole('button', { name: 'Xem & chấm bài' }).click();
  await expect(page.getByRole('dialog')).not.toContainText('Nháp riêng chưa nộp');
  await page.getByRole('button', { name: 'Đóng biểu mẫu' }).click();
  await createClass(page, 'Toán 9B'); await addStudent(page, 'Toán 9B', 'Nam');
  await section(page, 'student', 'assignments');
  const data = await readLearning(page);
  await page.getByLabel('Hồ sơ học sinh', { exact: true }).selectOption(data.students.find((s: any) => s.name === 'Nam').id);
  await expect(page.getByRole('heading', { name: 'Bài của lớp A', exact: true })).toHaveCount(0);
  await page.getByLabel('Hồ sơ học sinh', { exact: true }).selectOption(data.students.find((s: any) => s.name === 'Lan').id);
  await expect(page.getByRole('heading', { name: 'Bài của lớp A', exact: true })).toBeVisible();
  await section(page, 'teacher', 'classes');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('article').filter({ has: page.getByRole('heading', { name: 'Toán 9A', exact: true }) }).getByRole('button', { name: 'Lưu trữ', exact: true }).click();
  await section(page, 'student', 'assignments');
  await expect(page.getByRole('heading', { name: 'Bài của lớp A', exact: true })).toHaveCount(0);
  await section(page, 'teacher', 'classes');
  await page.getByLabel('Lớp đã lưu trữ').check(); await page.getByRole('button', { name: 'Khôi phục lớp' }).click();
  await section(page, 'student', 'assignments'); await expect(page.getByRole('heading', { name: 'Bài của lớp A', exact: true })).toBeVisible();
});

test('shared documents open in the existing workspace and class notices reach the student', async ({ page }) => {
  await page.goto('/'); await page.getByLabel('Chọn tài liệu', { exact: true }).setInputFiles('tests/fixtures/lesson.docx');
  await expect(page.locator('.docx-render-target')).toContainText('Bài học kiểm thử Kim Ngân');
  await createClass(page); await addStudent(page, 'Toán 9A', 'Lan');
  await section(page, 'teacher', 'resources'); await page.getByRole('button', { name: 'Chia sẻ học liệu', exact: true }).click();
  await page.getByLabel('Tên học liệu').fill('Tài liệu ôn tập'); await page.getByLabel('Tài liệu trong kho').selectOption({ label: 'lesson.docx' });
  await page.getByRole('button', { name: 'Chia sẻ cho lớp' }).click();
  await section(page, 'teacher', 'announcements'); await page.getByRole('button', { name: 'Viết thông báo', exact: true }).click();
  await page.getByLabel('Tiêu đề thông báo').fill('Chuẩn bị buổi học'); await page.getByLabel('Nội dung thông báo').fill('Mang theo máy tính và vở bài tập.');
  await page.getByRole('button', { name: 'Đăng thông báo' }).click();
  await section(page, 'student', 'announcements'); await expect(page.getByText('Mang theo máy tính và vở bài tập.', { exact: true })).toBeVisible();
  await section(page, 'student', 'resources'); await page.getByRole('button', { name: 'Mở học liệu' }).click();
  await expect(page).toHaveURL(/#\/workspace$/); await expect(page.locator('.docx-render-target')).toContainText('Bài học kiểm thử Kim Ngân');
  await page.getByRole('link', { name: 'Giáo viên', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Hôm nay bạn sẽ dạy gì?' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/teacher-dashboard.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await section(page, 'student', 'overview');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/student-mobile.png', fullPage: true });
});

test('failed database write keeps the form and does not report success', async ({ page }) => {
  await createClass(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      const request = original.apply(this, args);
      if (this.name === 'learning') request.addEventListener('success', () => this.transaction.abort());
      return request;
    };
  });
  await page.getByRole('button', { name: 'Tạo lớp học', exact: true }).click();
  await page.getByLabel('Tên lớp', { exact: true }).fill('Không được ghi'); await page.getByLabel('Môn học', { exact: true }).fill('Toán');
  await page.getByRole('button', { name: 'Lưu lớp học', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Tên lớp', { exact: true })).toHaveValue('Không được ghi');
  expect((await readLearning(page)).classes).toHaveLength(1);
});

test('independent browser tabs preserve simultaneous writes and refresh class lists', async ({ page, context }) => {
  await section(page, 'teacher', 'classes');
  const second = await context.newPage();
  await section(second, 'teacher', 'classes');
  for (const [tab, name] of [[page, 'Lớp A'], [second, 'Lớp B']] as const) {
    await tab.getByRole('button', { name: 'Tạo lớp học', exact: true }).click();
    await tab.getByLabel('Tên lớp', { exact: true }).fill(name);
    await tab.getByLabel('Môn học', { exact: true }).fill('Toán');
  }
  await Promise.all([page.getByRole('button', { name: 'Lưu lớp học' }).click(), second.getByRole('button', { name: 'Lưu lớp học' }).click()]);
  for (const tab of [page, second]) {
    await expect(tab.getByRole('heading', { name: 'Lớp A', exact: true })).toBeVisible();
    await expect(tab.getByRole('heading', { name: 'Lớp B', exact: true })).toBeVisible();
  }
  expect((await readLearning(page)).classes).toHaveLength(2);
  await second.close();
});
