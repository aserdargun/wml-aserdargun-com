import { describe, expect, it } from 'vitest'
import { validateReleaseManifest } from '../scripts/release-contract.mjs'
const manifest = () => ({
  application: 'WML', commit: 'a'.repeat(40), builtAt: '2026-09-10T12:00:00.000Z',
  assets: ['index.html', 'favicon.svg', 'staticwebapp.config.json'].map(path => ({ path, bytes: 10, sha256: 'b'.repeat(64) })),
})
describe('release evidence validation', () => {
  it('accepts a complete release and rejects missing identity, timestamp or required assets', () => {
    expect(() => validateReleaseManifest(manifest())).not.toThrow()
    for (const field of ['application', 'commit', 'builtAt', 'assets']) {
      const broken = manifest()
      delete broken[field]
      expect(() => validateReleaseManifest(broken)).toThrow()
    }
    const broken = manifest()
    broken.assets.pop()
    expect(() => validateReleaseManifest(broken)).toThrow(/Missing required/)
  })
  it('rejects traversal, duplicate files and malformed hashes before any file or network access', () => {
    for (const path of ['../outside', '/index.html', 'assets/../index.html', 'assets//x.js', 'index.html']) {
      const broken = manifest()
      broken.assets.push({ ...broken.assets[0], path })
      expect(() => validateReleaseManifest(broken)).toThrow(/Invalid or duplicate/)
    }
    const broken = manifest()
    broken.assets[0].sha256 = 'not-a-hash'
    expect(() => validateReleaseManifest(broken)).toThrow()
  })
})
