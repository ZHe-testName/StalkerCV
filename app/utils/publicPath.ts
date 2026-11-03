/** Путь из `public/` с префиксом GitHub Pages (`/StalkerCV/`). На localhost префикса нет. */
export function publicPath(path: string) {
  const nuxt = (globalThis as typeof globalThis & {
    __NUXT__?: { config?: { app?: { baseURL?: string } } }
  }).__NUXT__
  let base = nuxt?.config?.app?.baseURL
  if (!base) {
    try {
      base = useRuntimeConfig().app.baseURL
    } catch {
      base = '/'
    }
  }
  const root = !base || base === '/' ? '' : base.replace(/\/$/, '')
  const tail = path.startsWith('/') ? path : `/${path}`
  return `${root}${tail}`
}
