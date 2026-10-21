import { createRequire } from 'node:module'
import type { Plugin } from 'vite'

const require = createRequire(import.meta.url)
export const sharedExtensionModules = ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@loom-studio/ui'] as const
const prefix = 'virtual:loom-extension-shared/'

/** Browser import maps expose host module instances, never separately bundled copies. */
export function extensionSharedModules(): Plugin {
  let production = false
  let base = '/'
  return {
    name: 'loom-extension-shared-modules',
    configResolved(config) { production = config.command === 'build'; base = config.base },
    buildStart() {
      if (production) for (const name of sharedExtensionModules) {
        this.emitFile({ type: 'chunk', id: prefix + name, name: `extension-shared-${name.replace(/[^a-z0-9-]/gi, '-')}`, preserveSignature: 'strict' })
      }
    },
    resolveId(id) { if (id.startsWith(prefix)) return '\0' + id },
    load(id) {
      if (!id.startsWith('\0' + prefix)) return
      const name = id.slice(prefix.length + 1)
      if (!sharedExtensionModules.includes(name as typeof sharedExtensionModules[number])) throw new Error(`Unknown shared extension module: ${name}`)
      if (name === '@loom-studio/ui') return `export * from ${JSON.stringify(name)}`
      // Explicit exports let Vite apply CJS interop in development as well as production.
      const names = Object.keys(require(name)).filter(key => !key.startsWith('__') && key !== 'default')
      return `export { ${names.join(', ')} } from ${JSON.stringify(name)}; export { default } from ${JSON.stringify(name)};`
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const imports = Object.fromEntries(sharedExtensionModules.map(name => [name, production
          ? ''
          : `/@id/__x00__${prefix}${name}`]))
        if (production) for (const name of sharedExtensionModules) {
          // Vite's HTML hook receives emitted chunks keyed by filename, not reference ID.
          const chunk = Object.values(context.bundle ?? {}).find(entry => entry.type === 'chunk' && entry.facadeModuleId === '\0' + prefix + name)
          if (!chunk) throw new Error(`Missing shared extension entry: ${name}`)
          imports[name] = base + chunk.fileName
        }
        return [{ tag: 'script', attrs: { type: 'importmap' }, children: JSON.stringify({ imports }), injectTo: 'head-prepend' }]
      },
    },
  }
}
