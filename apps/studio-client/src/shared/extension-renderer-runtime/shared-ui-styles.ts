import css from '../../../../../packages/loom-ui/src/styles.css?inline'

let sheet: CSSStyleSheet | undefined

/** All in-document extension Shadow roots reuse one host-owned UI stylesheet. */
export function adoptSharedUiStyles(root: ShadowRoot): void {
  if (!sheet) {
    sheet = new CSSStyleSheet()
    sheet.replaceSync(css)
  }
  if (!root.adoptedStyleSheets.includes(sheet)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]
}
