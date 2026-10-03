import { describe, expect, it, afterAll } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createReleaseServer } from '../scripts/serve-release.mjs'

const config = JSON.parse(readFileSync(resolve('public/staticwebapp.config.json'), 'utf8'))
const csp = config.globalHeaders['Content-Security-Policy']
const project = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
const allDependencies = { ...project.dependencies, ...project.devDependencies }

// A WebAssembly engine in the dependency tree means the page will call
// WebAssembly.compile/instantiate at runtime. Under a Content-Security-Policy
// that omits a WASM source the browser refuses to compile the module, the app
// throws before it mounts, and the public site shows an error boundary. This is
// the assertion that would have caught the 29 September regression.
const usesWebAssembly = Object.keys(allDependencies).some(name => /dimforge|rapier|wasm|wamr/i.test(name))

describe('content security policy', () => {
  it('declares a policy the shipped runtime can actually satisfy', () => {
    expect(csp).toBeTruthy()
    expect(csp).toMatch(/script-src/)
    expect(csp).toMatch(/default-src 'self'/)
  })

  it('permits WebAssembly compilation because the project ships a WASM engine', () => {
    expect(usesWebAssembly, 'this guard is only meaningful while a WASM engine is a dependency').toBe(true)
    const scriptSrc = csp.match(/script-src[^;]*/)?.[0] ?? ''
    // 'wasm-unsafe-eval' is the narrow allowance. 'unsafe-eval' also compiles
    // WASM but additionally re-enables eval() and new Function(), which this
    // static site never needs, so it is not an acceptable substitute.
    expect(scriptSrc, `script-src must include 'wasm-unsafe-eval' to compile the physics engine: ${scriptSrc}`)
      .toMatch(/'wasm-unsafe-eval'/)
    expect(scriptSrc, "'unsafe-eval' re-enables eval(); use 'wasm-unsafe-eval' instead")
      .not.toMatch(/'unsafe-eval'/)
  })

  it('keeps the object and framing protections that arrived with the policy', () => {
    expect(csp).toMatch(/object-src 'none'/)
    expect(csp).toMatch(/base-uri 'self'/)
    expect(csp).toMatch(/frame-ancestors 'none'/)
    expect(config.globalHeaders['X-Frame-Options']).toBe('DENY')
  })

  it('serves the built artifact with those same headers', () => {
    if (!existsSync(resolve('dist/staticwebapp.config.json'))) return
    const built = JSON.parse(readFileSync(resolve('dist/staticwebapp.config.json'), 'utf8'))
    // Azure consumes the built copy, not the source file, so a policy that
    // never reaches dist/ would break production while every source-level
    // assertion stayed green.
    expect(built.globalHeaders['Content-Security-Policy'])
      .toBe(config.globalHeaders['Content-Security-Policy'])
  })
})

describe('release server used by the production end-to-end run', () => {
  const servers = []
  afterAll(() => { for (const server of servers) server.close() })

  const serve = async root => {
    const server = createReleaseServer(resolve(root))
    servers.push(server)
    await new Promise(done => server.listen(0, '127.0.0.1', done))
    return `http://127.0.0.1:${server.address().port}`
  }

  it('applies globalHeaders to responses, which vite preview does not', async () => {
    if (!existsSync(resolve('dist/index.html'))) return
    const origin = await serve('dist')
    const response = await fetch(origin + '/')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-security-policy')).toBe(csp)
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
  })

  it('serves a missing path through the navigation fallback but honours exclusions', async () => {
    if (!existsSync(resolve('dist/index.html'))) return
    const origin = await serve('dist')
    expect((await fetch(origin + '/some/client/route')).status).toBe(200)
    // /assets/* is excluded from the rewrite, so a missing asset stays a 404
    // instead of silently returning HTML with a script MIME type.
    expect((await fetch(origin + '/assets/does-not-exist.js')).status).toBe(404)
  })

  it('applies the configured MIME types', async () => {
    if (!existsSync(resolve('dist/index.html'))) return
    const origin = await serve('dist')
    expect((await fetch(origin + '/')).headers.get('content-type')).toMatch(/text\/html/)
  })
})
