import type { JSX, ParentProps } from 'solid-js'

export interface ActionBarSharedProps {
  class?: string
  style?: string
  width?: number | string
}

export interface ActionBarProps extends ParentProps<ActionBarSharedProps>, Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class' | 'style'> {}

export interface ActionBarSpacerProps extends ActionBarSharedProps, Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class' | 'style'> {}

export interface ActionBarDividerProps extends ActionBarSharedProps, Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class' | 'style'> {
  size?: 'normal' | 'small'
}

export interface ActionBarButtonProps
  extends ParentProps<ActionBarSharedProps>,
    Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'class' | 'style' | 'children'> {
  icon?: JSX.Element
  text?: JSX.Element
  color?: string
  dropdown?: boolean
  active?: boolean
  selected?: boolean
}

export interface ActionBarLinkProps
  extends ParentProps<ActionBarSharedProps>,
    Omit<JSX.AnchorHTMLAttributes<HTMLAnchorElement>, 'class' | 'style' | 'children'> {
  icon?: JSX.Element
  text?: JSX.Element
  color?: string
  dropdown?: boolean
  active?: boolean
  selected?: boolean
}

export interface ActionBarFieldProps
  extends ParentProps<ActionBarSharedProps>,
    Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class' | 'style'> {
  value?: JSX.Element
}
