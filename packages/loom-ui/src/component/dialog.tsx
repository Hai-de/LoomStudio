import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { DialogPortalContext } from './dialog-portal-context.js'
import { X } from 'lucide-react'
import { IconButton } from './icon-button.js'

export type DialogProps = {
  actions?: ReactNode
  children?: ReactNode
  className?: string
  closeOnBackdrop?: boolean
  closeLabel?: string
  description?: ReactNode
  dismissible?: boolean
  headerActions?: ReactNode
  id?: string
  layout?: 'default' | 'media' | 'workbench'
  onClose(): void
  open: boolean
  role?: 'alertdialog' | 'dialog'
  showCloseButton?: boolean
  title: ReactNode
  titleIcon?: ReactNode
}

export function Dialog(props: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [portalContainer, setPortalContainer] = useState<HTMLDialogElement | null>(null)
  const setDialogRef = useCallback((element: HTMLDialogElement | null) => {
    dialogRef.current = element
    setPortalContainer(element)
  }, [])
  const titleId = useId()
  const descriptionId = useId()
  const dismissible = props.dismissible ?? true
  const backdropPress = useRef(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (props.open && !dialog.open) {
      dialog.showModal()
    } else if (!props.open && dialog.open) {
      // History navigation can close a workbench while a nested confirmation is open.
      for (const child of [...dialog.querySelectorAll<HTMLDialogElement>('dialog[open]')].reverse()) child.close()
      dialog.close()
    }
  }, [props.open])

  useEffect(() => () => {
    if (dialogRef.current?.open) dialogRef.current.close()
  }, [])

  return (
      <dialog ref={setDialogRef} id={props.id} aria-describedby={props.description ? descriptionId : undefined} aria-labelledby={titleId} className={props.className} data-layout={props.layout ?? 'default'} data-loom-ui-dialog="" role={props.role ?? 'dialog'} onCancel={event => { event.stopPropagation(); event.preventDefault(); if (dismissible) props.onClose() }} onClose={event => { event.stopPropagation(); if (event.target === event.currentTarget && props.open) props.onClose() }} onPointerDown={event => {
      backdropPress.current = event.button === 0 && event.target === event.currentTarget
        && isDialogBackdropPoint(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY)
    }} onPointerCancel={() => { backdropPress.current = false }} onClick={event => {
      const startedOnBackdrop = backdropPress.current
      backdropPress.current = false
      if (!dismissible || props.closeOnBackdrop === false || !startedOnBackdrop || event.target !== event.currentTarget) return
      if (isDialogBackdropPoint(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY)) props.onClose()
    }}>
      <DialogPortalContext.Provider value={portalContainer}>
      <div data-loom-ui-dialog-frame="">
        <header data-loom-ui-dialog-header="">
          <div data-loom-ui-dialog-title-row="">
            <h2 id={titleId}>{props.titleIcon ? <span data-loom-ui-dialog-title-icon="" aria-hidden="true">{props.titleIcon}</span> : null}{props.title}</h2>
            <div data-loom-ui-dialog-header-actions="">
              {props.headerActions}
              {props.showCloseButton !== false ? <IconButton disabled={!dismissible}
                aria-label={props.closeLabel ?? '关闭'} onClick={props.onClose}>
                <X size={18} aria-hidden="true" />
              </IconButton> : null}
            </div>
          </div>
          {props.description ? <p id={descriptionId}>{props.description}</p> : null}
        </header>
        {props.children ? <div data-loom-ui-dialog-body="">{props.children}</div> : null}
        {props.actions ? <footer data-loom-ui-dialog-actions="">{props.actions}</footer> : null}
      </div>
      </DialogPortalContext.Provider>
    </dialog>
  )
}

export function isDialogBackdropPoint(rect: Pick<DOMRect, 'bottom' | 'left' | 'right' | 'top'>, clientX: number, clientY: number): boolean {
  return clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom
}
