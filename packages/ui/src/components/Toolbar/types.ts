import type { JSX, ParentProps } from 'solid-js'

export interface ToolbarSharedProps {
  class?: string
  style?: string
  width?: number | string
}

export interface ToolbarProps extends ParentProps<ToolbarSharedProps>, Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class' | 'style'> {}

export interface ToolbarRightProps extends ParentProps<ToolbarSharedProps>, Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class' | 'style'> {}

export interface ToolbarSpacerProps extends ToolbarSharedProps, Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class' | 'style'> {}

export interface ToolbarDividerProps extends ToolbarSharedProps, Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class' | 'style'> {
  size?: 'normal' | 'small'
}

export interface ToolbarButtonProps
  extends ParentProps<ToolbarSharedProps>,
    Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'class' | 'style' | 'children'> {
  icon?: JSX.Element
  text?: JSX.Element
  color?: string
  dropdown?: boolean
  active?: boolean
  selected?: boolean
}

export interface ToolbarLinkProps
  extends ParentProps<ToolbarSharedProps>,
    Omit<JSX.AnchorHTMLAttributes<HTMLAnchorElement>, 'class' | 'style' | 'children'> {
  icon?: JSX.Element
  text?: JSX.Element
  color?: string
  dropdown?: boolean
  active?: boolean
  selected?: boolean
}

export interface ToolbarSpinnerProps
  extends ParentProps<ToolbarSharedProps>,
    Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class' | 'style'> {
  value?: JSX.Element
}
