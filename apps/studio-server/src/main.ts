import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runStudioServerCli } from './cli.js'

export { createStudioServer, type CreateStudioServerOptions, type StudioServer } from './server.js'
export { main } from './cli.js'

const isMainModule = typeof process.argv[1] === 'string' && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isMainModule) runStudioServerCli()
