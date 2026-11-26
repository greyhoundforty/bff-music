import { describe, expect, it } from 'vitest';
import { resolveClientId } from './oauth';

describe('resolveClientId', () => {
  it('uses a loopback client when the page is served from 127.0.0.1', () => {
    const id = resolveClientId('http://127.0.0.1:8080', undefined);
    expect(id.startsWith('http://localhost?redirect_uri=')).toBe(true);
    expect(decodeURIComponent(id)).toContain('http://127.0.0.1:8080/callback');
    expect(decodeURIComponent(id)).toContain('atproto transition:generic');
  });

  it('rewrites a localhost origin to 127.0.0.1 in the redirect', () => {
    const id = resolveClientId('http://localhost:5173');
    expect(decodeURIComponent(id)).toContain('http://127.0.0.1:5173/callback');
  });

  it('keeps a configured https client id on a public host', () => {
    const configured = 'https://bff.example/client-metadata.json';
    expect(resolveClientId('https://bff.example', configured)).toBe(configured);
  });

  it('derives the client id from the public origin when none is configured', () => {
    expect(resolveClientId('https://bff.example')).toBe('https://bff.example/client-metadata.json');
    expect(resolveClientId('https://bff.example:8443/')).toBe(
      'https://bff.example:8443/client-metadata.json',
    );
  });

  it('ignores a baked-in production client id on loopback', () => {
    const id = resolveClientId(
      'http://127.0.0.1:8080',
      'https://bff.example/client-metadata.json',
    );
    expect(id.startsWith('http://localhost?')).toBe(true);
  });
});
