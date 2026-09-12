import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();

test('phase 1-4 architecture artifacts exist', () => {
  for (const file of [
    'apps/web/src/app/App.tsx',
    'apps/mobile/src/app/AppInner.tsx',
    'apps/core/src/index.ts',
    'apps/core/src/types.ts',
    'docs/architecture.md',
    'docs/testing-strategy.md',
    'docs/security.md',
    'docs/adr/0001-monorepo-shared-core.md',
    'docs/adr/0002-platform-adapters.md',
    'docs/adr/0003-local-first-data.md',
  ])
    assert.ok(fs.existsSync(path.join(root, file)), file);
});

test('web and mobile consume the shared core', () => {
  const web = fs.readFileSync(path.join(root, 'apps/web/src/app/App.tsx'), 'utf8');
  const mobile = fs.readFileSync(path.join(root, 'apps/mobile/src/app/AppInner.tsx'), 'utf8');
  assert.match(web, /core\/src\/index\.js/);
  assert.match(mobile, /core\/src\/index\.js/);
});
