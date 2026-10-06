import type { Translator } from '../../../shared/i18n/index.js'
import type { MarkdownCodeBlockLabels } from '../../../shared/ui/markdown-content/markdown-code-block.js'

export function messageCodeBlockLabels(t: Translator): MarkdownCodeBlockLabels {
  return {
    copied: t('longTextEditor.copied'),
    copy: t('longTextEditor.copy'),
    copyFailed: t('longTextEditor.copyFailed'),
    disableWrap: t('markdown.code.disableWrap'),
    enableWrap: t('markdown.code.enableWrap'),
  }
}
