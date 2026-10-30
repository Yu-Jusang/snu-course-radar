import { chromium } from 'playwright';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';

const output = new URL('../docs/data/', import.meta.url);
await mkdir(output, { recursive: true });
const startedAt = new Date().toISOString();
let browser;
try {
  browser = await chromium.launch(process.platform === 'win32' ? { channel: 'chrome', headless: true } : { headless: true });
  // A fresh anonymous session follows the site's own queue. No login or queue bypass.
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'ko-KR' });
  page.setDefaultTimeout(45000);
  await page.goto('https://sugang.snu.ac.kr/', { waitUntil: 'domcontentloaded' });
  await page.locator('#hTotalSearch').waitFor({ state: 'visible', timeout: 90000 });
  const term = (await page.locator('h1').first().innerText()).replace(/홈 바로가기/g, '').replace(/\s+/g, ' ').trim();
  await page.getByRole('link', { name: '강좌 검색 버튼', exact: true }).click();
  await page.locator('a.course-info-detail').first().waitFor();
  const body = await page.locator('body').innerText();
  const expected = Number(body.match(/검색 결과\s*([\d,]+)\s*건/)?.[1].replaceAll(',', ''));
  if (!expected || expected > 20000) throw new Error('검색 결과 건수를 확인할 수 없습니다.');
  const courses = [];
  const seen = new Set();
  let index = 1;
  while (courses.length < expected) {
    const rows = await page.locator('a.course-info-detail').evaluateAll(cards => cards.map(card => {
      const clean = s => s?.replace(/\s+/g, ' ').trim() || '';
      const name = clean(card.querySelector('.course-name strong')?.textContent);
      const labels = [...clean(card.querySelector('.course-name')?.textContent).matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
      const info = card.querySelectorAll('.course-info > li.txt');
      const meta = [...(info[0]?.querySelectorAll(':scope > span') || [])].map(el => clean(el.textContent));
      const values = [...(info[1]?.querySelectorAll(':scope > span') || [])].map(el => clean(el.textContent));
      const seats = values[0]?.match(/([\d,]+)\s*\/\s*([\d,]+)\s*\(([\d,]+)\)/);
      const n = s => s && /^[\d,]+$/.test(s) ? Number(s.replaceAll(',', '')) : null;
      return { id: meta[2], name, instructor: meta[0], department: meta[1], level: labels[0], category: labels[1],
        enrolled: seats ? n(seats[1]) : null, capacity: seats ? n(seats[2]) : null, currentStudentCapacity: seats ? n(seats[3]) : null,
        totalEnrolled: n(values[1]?.match(/[\d,]+/)?.[0]), credits: Number(values[2]?.match(/[\d.]+/)?.[0]) || null,
        schedule: values.slice(3).join(' '), basket: n(clean(card.querySelector('.carts')?.textContent)),
        flags: clean(card.querySelector('.state')?.textContent),
      };
    }));
    if (!rows.length) throw new Error('강좌 목록이 비어 있습니다.');
    for (const row of rows) {
      if (!row.id || !row.name || seen.has(row.id) || row.capacity === null || row.enrolled === null) throw new Error('강좌 중복 또는 필수 항목 누락: 전체 갱신을 중단합니다.');
      seen.add(row.id); courses.push(row);
    }
    console.log(`Collected ${courses.length}/${expected}`);
    if (courses.length >= expected) break;
    index++;
    if (index > 2000) throw new Error('페이지 수 제한');
    // One sequential request per page, with spacing; never submit registration forms.
    await new Promise(resolve => setTimeout(resolve, 1600));
    await page.locator(`a[href="javascript:fnGotoPage(${index});"]`).first().click();
    await page.waitForFunction(previous => {
      const first = document.querySelector('a.course-info-detail .course-info > li.txt');
      return first && !first.textContent.includes(previous);
    }, rows[0].id);
  }
  if (courses.length !== expected) throw new Error('전체 강좌 수 불일치');
  const data = { schemaVersion: 1, term, source: 'https://sugang.snu.ac.kr/', startedAt, updatedAt: new Date().toISOString(), total: expected, courses };
  const temporary = new URL('courses.tmp.json', output);
  await writeFile(temporary, JSON.stringify(data, null, 2) + '\n');
  await rename(temporary, new URL('courses.json', output));
  await writeFile(new URL('status.json', output), JSON.stringify({ ok: true, attemptedAt: startedAt, message: '전체 공개 강좌 수집 완료' }, null, 2) + '\n');
} catch (error) {
  // Keep the last complete snapshot; report failed refresh separately.
  await writeFile(new URL('status.json', output), JSON.stringify({ ok: false, attemptedAt: startedAt, message: '공개 강좌 수집 실패. 마지막 성공 자료를 유지합니다.' }, null, 2) + '\n');
  console.error(error.message);
  process.exitCode = 1;
} finally { await browser?.close(); }
