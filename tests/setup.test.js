import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('index.html이 main.js를 모듈로 불러온다', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<title>Habit Tracker<\/title>/);
  assert.match(html, /<script type="module" src="\.\/src\/main\.js"><\/script>/);
});
