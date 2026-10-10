import { messages as common } from './zh-cn/common.js'
import { messages as sessions } from './zh-cn/sessions.js'
import { messages as agent } from './zh-cn/agent.js'
import { messages as resources } from './zh-cn/resources.js'
import { messages as characters } from './zh-cn/characters.js'
import { messages as state } from './zh-cn/state.js'
import { messages as prompt } from './zh-cn/prompt.js'
import { messages as extensions } from './zh-cn/extensions.js'
import { messages as settings } from './zh-cn/settings.js'
import { messages as textTransforms } from './zh-cn/textTransforms.js'
import { messages as logs } from './zh-cn/logs.js'

export const zhCN = {
  ...common,
  ...sessions,
  ...agent,
  ...resources,
  ...characters,
  ...state,
  ...prompt,
  ...extensions,
  ...settings,
  ...textTransforms,
  ...logs,
} as const
