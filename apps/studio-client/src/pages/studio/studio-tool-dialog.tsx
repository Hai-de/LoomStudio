import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { Dialog, LoadingText } from '@loom-studio/ui'

export function StudioToolDialog(props: {
  id: string
  open: boolean
  title: string
  icon: ReactNode
  closeLabel: string
  onClose(): void
  render(active: boolean): ReactNode
}) {
  const [visited, setVisited] = useState(props.open)
  useEffect(() => { if (props.open) setVisited(true) }, [props.open])

  return <Dialog id={props.id} open={props.open} onClose={props.onClose} title={props.title} titleIcon={props.icon}
    closeLabel={props.closeLabel} layout="workbench">
    {visited || props.open ? <Suspense fallback={<LoadingText />}>
      {props.render(props.open)}
    </Suspense> : null}
  </Dialog>
}
