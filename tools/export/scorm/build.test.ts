import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { parseXml, type XmlNode } from '../test-support/xml-tree.ts';
import { readZip } from '../unzip.ts';
import type { ZipEntry } from '../zip.ts';
import { PACKAGE_DATA_ELEMENT_ID, parsePackageData } from './app/data.ts';
import { SCORM_INDEX_FILE, buildScormPackages, type ScormPackagesIndex } from './build.ts';
import { APP_SCRIPT, APP_STYLES } from './html.ts';
import { LAUNCH_FILE, MANIFEST_FILE } from './manifest.ts';

/**
 * Справжня збірка всіх пакетів SCORM (Vite + content/): структура ZIP і маніфесту, валідний XML,
 * відсутність абсолютних шляхів і зовнішніх ресурсів, дані острова, відтворюваність. Перевірки по
 * пакетах ідуть за фактичним індексом збірки (id пакетів заздалегідь не відомі — вони залежать від
 * того, які практичні вже мають файл тренажера в content/practicals): доки їх немає, пакетів немає,
 * і цикли нижче просто не мають по чому пройтися.
 */

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const BUILD_TIMEOUT_MS = 180_000;

/** Ідентифікатори просторів імен і специфікацій, адреса декодера помилок React: рядки в коді, а не запити. */
const IDENTIFIER_URLS = [/^http:\/\/www\.w3\.org\//, /^https?:\/\/json-schema\.org\//, /^https:\/\/react\.dev\/errors\/$/, /^http:\/\/\[\$\{\w+\}\]$/];
const URL_IN_CODE = /https?:\/\/[^"'`\s)<>\\]+/g;
const NETWORK_API = /\bfetch\(|XMLHttpRequest|sendBeacon|importScripts|\bimport\(|new Worker\(|new EventSource\(|new WebSocket\(/;

let workspace: string;
let first: ScormPackagesIndex;
let second: ScormPackagesIndex;
const archives = new Map<string, ZipEntry[]>();

beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'ku-scorm-test-'));
  first = await buildScormPackages({ root: ROOT, outDir: join(workspace, 'first') });
  second = await buildScormPackages({ root: ROOT, outDir: join(workspace, 'second') });
  for (const entry of first.packages) archives.set(entry.id, readZip(await readFile(join(workspace, 'first', entry.file))));
}, BUILD_TIMEOUT_MS);

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true });
});

function text(entries: readonly ZipEntry[], path: string): string {
  const entry = entries.find((candidate) => candidate.path === path);
  if (!entry) throw new Error(`у пакеті немає ${path}`);
  return Buffer.from(entry.data).toString('utf8');
}

function find(node: XmlNode, name: string): XmlNode[] {
  return [...(node.name === name ? [node] : []), ...node.children.flatMap((childNode) => find(childNode, name))];
}

describe('scorm.json', () => {
  test('lists every package with size, hash and mastery score', async () => {
    // Arrange
    const onDisk = JSON.parse(await readFile(join(workspace, 'first', SCORM_INDEX_FILE), 'utf8')) as ScormPackagesIndex;

    // Assert
    expect(onDisk).toEqual(first);
    expect(first.packages.every((entry) => entry.kind === 'matrix')).toBe(true);
    for (const entry of first.packages) {
      const zip = await readFile(join(workspace, 'first', entry.file));
      expect(zip.length).toBe(entry.bytes);
      expect(entry.bytes).toBeLessThan(2 * 1024 * 1024);
      expect(entry.masteryPercent).toBeGreaterThan(0);
      expect(entry.masteryPercent).toBeLessThanOrEqual(100);
    }
  });

  test('is reproducible byte for byte', () => {
    expect(second.packages.map((entry) => entry.sha256)).toEqual(first.packages.map((entry) => entry.sha256));
  });
});

describe('package structure (over every package the build actually produced)', () => {
  test('ZIP: manifest at the root first, launch page, bundle and fonts', () => {
    for (const entry of first.packages) {
      const entries = archives.get(entry.id) ?? [];
      const paths = entries.map((candidate) => candidate.path);
      expect(paths[0], entry.id).toBe(MANIFEST_FILE);
      expect(paths, entry.id).toEqual(expect.arrayContaining([LAUNCH_FILE, APP_SCRIPT, APP_STYLES, 'fonts/OFL.txt', 'fonts/OpenSans-Variable-cyrillic.woff2']));
      expect(paths.every((path) => !path.startsWith('/') && !path.includes('..') && !path.includes('\\')), entry.id).toBe(true);
      expect(entry.files, entry.id).toEqual(paths);
    }
  });

  test('imsmanifest.xml is valid XML and lists exactly the files in the archive', () => {
    for (const entry of first.packages) {
      const entries = archives.get(entry.id) ?? [];
      const root = parseXml(text(entries, MANIFEST_FILE));
      const [resource] = find(root, 'resource');
      const listed = find(root, 'file').map((file) => file.attributes['href']);
      expect(resource?.attributes['href'], entry.id).toBe(LAUNCH_FILE);
      expect(resource?.attributes['adlcp:scormtype'], entry.id).toBe('sco');
      expect([...listed].sort(), entry.id).toEqual(entries.map((candidate) => candidate.path).filter((path) => path !== MANIFEST_FILE).sort());
      expect(find(root, 'adlcp:masteryscore')[0]?.text, entry.id).toBe(String(entry.masteryPercent));
    }
  });

  test('index.html loads only relative files that exist in the package', () => {
    for (const entry of first.packages) {
      const entries = archives.get(entry.id) ?? [];
      const html = text(entries, LAUNCH_FILE);
      const paths = new Set(entries.map((candidate) => candidate.path));
      const references = [...html.matchAll(/\b(?:src|href)="([^"]*)"/g), ...html.matchAll(/url\("?([^")]+)"?\)/g)].map((match) => match[1] ?? '');
      expect(references.length, entry.id).toBeGreaterThanOrEqual(10);
      for (const reference of references) {
        expect(reference, `${entry.id}: ${reference}`).toMatch(/^(\.\/|#)/);
        if (reference.startsWith('./')) expect(paths.has(reference.slice(2)), `${entry.id}: ${reference}`).toBe(true);
      }
      expect(html, entry.id).toContain('<symbol id="i-check"');
    }
  });

  test('styles and script have no absolute paths, CDNs or network calls', () => {
    for (const entry of first.packages) {
      const entries = archives.get(entry.id) ?? [];
      const css = text(entries, APP_STYLES);
      const js = text(entries, APP_SCRIPT);
      expect(css, entry.id).not.toMatch(/url\(|@import/);
      expect(js, entry.id).not.toMatch(NETWORK_API);
      // У повідомленні — фрагменти навколо знахідок, а не початок мініфікованого скрипта.
      const absolutePaths = [...js.matchAll(/.{0,80}(?:\/_astro\/|\/operatsiinyi-menedzhment\/).{0,40}/g)].map((match) => match[0]);
      expect(absolutePaths, entry.id).toEqual([]);
      // Відлагоджувальний JSX-рантайм вшиває абсолютні шляхи файлів збиральної машини — пакет має бути продакшен-збіркою.
      expect(js, entry.id).not.toContain('jsxDEV');
      expect(js, entry.id).not.toContain(ROOT);
      const urls = [...new Set(js.match(URL_IN_CODE) ?? [])];
      const unexpected = urls.filter((candidate) => !IDENTIFIER_URLS.some((pattern) => pattern.test(candidate)));
      expect(unexpected, entry.id).toEqual([]);
    }
  });

  test('embedded island data matches the index; external URLs are only cited sources', () => {
    for (const entry of first.packages) {
      const entries = archives.get(entry.id) ?? [];
      const html = text(entries, LAUNCH_FILE);
      const match = new RegExp(`<script type="application/json" id="${PACKAGE_DATA_ELEMENT_ID}">([^<]*)</script>`).exec(html);
      const data = parsePackageData(match?.[1], entry.kind);
      expect(data.activityId, entry.id).toBe(entry.activityId);
      expect(data.masteryPercent, entry.id).toBe(entry.masteryPercent);
      const cited = new Set(Object.values(data.sources).map((source) => source.url));
      const dataUrls = (match?.[1] ?? '').match(URL_IN_CODE) ?? [];
      expect(dataUrls.filter((url) => !cited.has(url)), entry.id).toEqual([]);
    }
  });
});
