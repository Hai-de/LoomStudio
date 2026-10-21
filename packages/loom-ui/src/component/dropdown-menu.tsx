import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { DialogPortalContext } from './dialog-portal-context.js'
import { Check } from 'lucide-react'
import * as React from 'react'

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, children, ...props }, forwardedRef) => {
  const portalContainer = React.useContext(DialogPortalContext)
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const [highlight, setHighlight] = React.useState<{ top: number; height: number; visible: boolean; moved: boolean }>({
    top: 0,
    height: 0,
    visible: false,
    moved: false,
  })

  const setMergedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node
      if (typeof forwardedRef === 'function') forwardedRef(node)
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node
    },
    [forwardedRef],
  )

  const handlePointerOver = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = contentRef.current
    if (!container) return
    const item = (event.target as HTMLElement | null)?.closest<HTMLElement>('.loom-ui-menu-item:not([data-disabled])')
    if (!item || !container.contains(item)) {
      setHighlight(prev => (prev.visible ? { ...prev, visible: false, moved: false } : prev))
      return
    }
    const containerRect = container.getBoundingClientRect()
    const itemRect = item.getBoundingClientRect()
    const top = itemRect.top - containerRect.top + container.scrollTop
    const height = itemRect.height

    setHighlight(prev => {
      if (prev.visible && prev.top === top && prev.height === height) return prev
      return { top, height, visible: true, moved: prev.visible }
    })
  }

  const handlePointerLeave = () => {
    setHighlight(prev => ({ ...prev, visible: false, moved: false }))
  }

  return (
    <DropdownMenuPrimitive.Portal container={portalContainer}>
      <DropdownMenuPrimitive.Content
        {...props}
        collisionBoundary={props.collisionBoundary ?? portalContainer}
        ref={setMergedRef}
        className={menuClass('loom-ui-menu', className)}
        data-menu-kind="dropdown"
        sideOffset={sideOffset}
        onPointerOver={handlePointerOver}
        onPointerLeave={handlePointerLeave}
      >
        <div
          className="loom-ui-menu-hover-indicator"
          style={{
            transform: `translateY(${highlight.top}px)`,
            height: `${highlight.height}px`,
            opacity: highlight.visible ? 1 : 0,
            transition: highlight.moved
              ? 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1), height 150ms cubic-bezier(0.16, 1, 0.3, 1), opacity 120ms ease'
              : 'opacity 120ms ease',
          }}
          aria-hidden="true"
        />
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
})
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

type DropdownMenuItemProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
  icon?: React.ReactNode
  inset?: boolean
  tone?: 'default' | 'danger'
}

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuItemProps
>(({ children, className, icon, inset, tone, ...props }, ref) => (
  <DropdownMenuPrimitive.Item {...props} ref={ref} className={menuClass('loom-ui-menu-item', className)} data-inset={inset || undefined} data-tone={tone}>
    {icon ? <span aria-hidden="true" className="loom-ui-menu-leading">{icon}</span> : null}
    <span className="loom-ui-menu-label">{children}</span>
  </DropdownMenuPrimitive.Item>
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ checked, children, className, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem {...props} ref={ref} checked={checked} className={menuClass('loom-ui-menu-item', className)}>
    <span aria-hidden="true" className="loom-ui-menu-leading"><DropdownMenuPrimitive.ItemIndicator><Check /></DropdownMenuPrimitive.ItemIndicator></span>
    <span className="loom-ui-menu-label">{children}</span>
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator {...props} ref={ref} className={menuClass('loom-ui-menu-separator', className)} />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

function menuClass(base: string, className?: string): string {
  return className ? `${base} ${className}` : base
}
