import { test, expect } from '@playwright/test';

test.use({ timezoneId: 'America/Los_Angeles' });

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/(accounts\.google\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/, route => route.abort());
  await page.goto('/#/teacher/schedule');
  await expect(page.getByLabel('Lọc theo lớp')).toBeVisible();
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('KimNgan_Learning_DB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('learning', 'readwrite');
      tx.objectStore('learning').put({
        version: 1,
        classes: ['Toán 9A', 'Tiếng Anh 8', 'Ngữ văn 9'].map((name, i) => ({ id: `c${i}`, name, subject: name, description: '', studentIds: [i === 1 ? 's1' : 's0'], archived: false })),
        students: [{ id: 's0', name: 'Nguyễn Minh Anh', email: '' }, { id: 's1', name: 'Trần Bảo An', email: '' }],
        sessions: Array.from({ length: 6 }, (_, i) => ({
          id: `lesson${i}`, classId: `c${i % 3}`, title: ['Phương trình bậc hai', 'Reading & vocabulary', 'Ôn tập văn nghị luận'][i % 3],
          startsAt: new Date(Date.UTC(2030, 11, 30 + i, 11)).toISOString(), duration: 90,
          objectives: 'Ôn lại bài cũ và chuẩn bị vở bài tập.', meetingUrl: 'https://meet.google.com/abc-defg-hij', attendance: {},
        })),
        assignments: [], submissions: [], resources: [], announcements: [],
      }, 'state');
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  }));
  await page.reload();
  await page.getByLabel('Chọn ngày xem lịch').fill('2030-12-30');
});

test('week/day navigation, class filter and schedule changes keep the selected Vietnam date', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await expect(page.locator('.schedule-day')).toHaveCount(7);
  await expect(page.locator('.calendar-lesson')).toHaveCount(6);
  await expect(page.locator('.calendar-time').first()).toHaveText('18:00 – 19:30');
  await expect(page.locator('.schedule-day').last().locator('time')).toHaveAttribute('datetime', '2031-01-05');
  await page.screenshot({ path: 'artifacts/schedule-week.png', fullPage: true });
  await page.getByLabel('Lọc theo lớp').selectOption('c1');
  await expect(page.getByLabel('Chọn ngày xem lịch')).toHaveValue('2030-12-30');
  await expect(page.locator('.calendar-lesson')).toHaveCount(2);
  await page.getByLabel('Lọc theo lớp').selectOption('');
  await page.getByRole('button', { name: 'Tuần sau', exact: true }).click();
  await expect(page.getByLabel('Chọn ngày xem lịch')).toHaveValue('2031-01-06');
  await expect(page.locator('.calendar-lesson')).toHaveCount(0);
  await page.getByRole('button', { name: 'Tuần trước', exact: true }).click();
  await page.getByRole('button', { name: 'Ngày', exact: true }).click();
  await expect(page.locator('.schedule-day')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ngày sau', exact: true }).click();
  await expect(page.getByLabel('Chọn ngày xem lịch')).toHaveValue('2030-12-31');
  await expect(page.locator('.calendar-lesson')).toContainText('Reading & vocabulary');
  await page.getByRole('button', { name: 'Sửa lịch Reading & vocabulary', exact: true }).click();
  await expect(page.getByLabel('Bắt đầu lúc')).toHaveValue('2030-12-31T18:00');
  await page.getByLabel('Bắt đầu lúc').fill('2031-01-08T19:00');
  await page.getByRole('button', { name: 'Lưu lịch học', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByLabel('Chọn ngày xem lịch')).toHaveValue('2031-01-08');
  await expect(page.locator('.calendar-time')).toHaveText('19:00 – 20:30');
  await page.getByRole('button', { name: /^Thêm buổi học/ }).click();
  await expect(page.getByLabel('Bắt đầu lúc')).toHaveValue('2031-01-08T18:00');
  await page.getByLabel('Tên buổi học').fill('Buổi bổ sung');
  await page.getByLabel('Bắt đầu lúc').fill('2031-01-08T16:00');
  await page.getByRole('button', { name: 'Lưu lịch học', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.calendar-topic').first()).toHaveText('Buổi bổ sung');
  await page.reload();
  await page.getByLabel('Chọn ngày xem lịch').fill('2031-01-08');
  await expect(page.locator('.calendar-lesson')).toHaveCount(2);
  await page.getByRole('button', { name: 'Hôm nay', exact: true }).click();
  await expect(page.getByLabel('Chọn ngày xem lịch')).toHaveValue(await page.evaluate(() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())));
  expect(errors).toEqual([]);
});

test('responsive board, dark theme and student schedule remain usable', async ({ page }) => {
  await page.getByRole('button', { name: 'Đổi giao diện' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: 'artifacts/schedule-dark.png', fullPage: true });
  await page.getByRole('button', { name: 'Đổi giao diện' }).click();
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.schedule-board').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  await page.screenshot({ path: 'artifacts/schedule-mobile.png', fullPage: true });
  await page.goto('/#/student/schedule');
  await expect(page.locator('.student-session-card')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Điểm danh', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lên lịch buổi học', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Vào phòng học' }).first()).toHaveAttribute('href', 'https://meet.google.com/abc-defg-hij');
  await page.getByLabel('Hồ sơ học sinh', { exact: true }).selectOption('s1');
  await expect(page.locator('.student-session-card')).toHaveCount(2);
  await expect(page.locator('.student-session-card').first()).toContainText('Tiếng Anh 8');
  await expect(page.locator('.student-session-card').first()).toContainText('18:00 – 19:30');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/schedule-student-mobile.png', fullPage: true });
  await page.getByLabel('Hiển thị', { exact: true }).selectOption('past');
  await expect(page.getByRole('heading', { name: 'Chưa có buổi học trong khoảng này' })).toBeVisible();
});
