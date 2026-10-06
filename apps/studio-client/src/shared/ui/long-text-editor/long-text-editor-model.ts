export type LongTextEditorMode = 'source' | 'preview'

export type LongTextEditorState = {
  undoValue?: string
}

type LongTextEditorAction =
  | { type: 'clear'; value: string }
  | { type: 'edit' | 'undo' | 'expire-undo' }

export const INITIAL_LONG_TEXT_EDITOR_STATE: LongTextEditorState = {}

export function reduceLongTextEditorState(
  state: LongTextEditorState,
  action: LongTextEditorAction,
): LongTextEditorState {
  if (action.type === 'clear') return { ...state, undoValue: action.value }
  if (action.type === 'edit' || action.type === 'undo' || action.type === 'expire-undo') {
    return { ...state, undoValue: undefined }
  }
  return state
}
