import { describe, expect, it } from 'vitest';
import { joinBase } from './url';

const BASE = '/operatsiinyi-menedzhment/';

describe('joinBase', () => {
  it('returns the base itself for an empty path or a lone slash', () => {
    expect(joinBase(BASE)).toBe(BASE);
    expect(joinBase(BASE, '')).toBe(BASE);
    expect(joinBase(BASE, '/')).toBe(BASE);
  });

  it('adds the base and a trailing slash to page paths', () => {
    expect(joinBase(BASE, 'moduli/m1')).toBe('/operatsiinyi-menedzhment/moduli/m1/');
    expect(joinBase(BASE, '/moduli/m1/')).toBe('/operatsiinyi-menedzhment/moduli/m1/');
  });

  it('keeps file paths without a trailing slash', () => {
    expect(joinBase(BASE, 'sitemap-index.xml')).toBe('/operatsiinyi-menedzhment/sitemap-index.xml');
    expect(joinBase(BASE, '/files/m1/tema-1.pdf')).toBe('/operatsiinyi-menedzhment/files/m1/tema-1.pdf');
  });

  it('puts the trailing slash before the query and hash', () => {
    expect(joinBase(BASE, 'poshuk?q=kvorum')).toBe('/operatsiinyi-menedzhment/poshuk/?q=kvorum');
    expect(joinBase(BASE, 'moduli/m1#t02')).toBe('/operatsiinyi-menedzhment/moduli/m1/#t02');
  });

  it('normalises a base written without slashes and the root base', () => {
    expect(joinBase('operatsiinyi-menedzhment', 'kabinet')).toBe('/operatsiinyi-menedzhment/kabinet/');
    expect(joinBase('/', 'kabinet')).toBe('/kabinet/');
    expect(joinBase('', '')).toBe('/');
  });

  it.each(['https://example.com/', 'mailto:someone@example.com', '//cdn.example.com/x.js'])(
    'refuses external URL %s because url() is only for internal links',
    (external) => {
      expect(() => joinBase(BASE, external)).toThrow(/внутрішн/);
    },
  );
});
