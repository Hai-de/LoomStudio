import { runStudioServerCli } from './cli.js'

export { createStudioServer, type CreateStudioServerOptions, type StudioServer } from './server.js'
export { main } from './cli.js'

if (import.meta.main) runStudioServerCli()
