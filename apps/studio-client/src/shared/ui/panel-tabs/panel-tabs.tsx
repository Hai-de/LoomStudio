import { Tabs, type TabItem, type TabsProps } from '@loom-studio/ui'

export type PanelTabItem<T extends string = string> = TabItem<T>
export type PanelTabsProps<T extends string = string> = TabsProps<T>

export function PanelTabs<T extends string = string>(props: PanelTabsProps<T>) {
  return <Tabs<T> {...props} />
}
