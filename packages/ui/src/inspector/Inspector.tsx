import { createDgBem, cx } from '@diagen/shared'
import { Show, type JSX } from 'solid-js'
import { SidebarBody, SidebarFrame, SidebarHeader } from '../sidebar/panel'
import { createInspectorBridge } from './InspectorBridge'
import { ColorField } from './fields/ColorField'
import { NumberField } from './fields/NumberField'

import './inspector.css'

const bem = createDgBem('inspector')

export interface InspectorProps {
  class?: string
}

function InspectorSection(props: {
  title: string
  description: string
  action?: JSX.Element
  children: JSX.Element
}): JSX.Element {
  return (
    <section class="dg-panel__section">
      <div class="dg-panel__section-head">
        <div class="dg-panel__section-heading">
          <div class="dg-panel__section-copy">
            <div class="dg-panel__section-title-row">
              <span class="dg-panel__section-title">{props.title}</span>
            </div>
            <div class="dg-panel__section-description">{props.description}</div>
          </div>
        </div>
        <Show when={props.action}>
          <div class={bem('section-action')}>{props.action}</div>
        </Show>
      </div>
      <div class="dg-panel__section-content">
        <div class={bem('section-fields')}>{props.children}</div>
      </div>
    </section>
  )
}

export function Inspector(props: InspectorProps): JSX.Element {
  const bridge = createInspectorBridge()

  return (
    <SidebarFrame class={cx(bem(), props.class)} aria-label="Inspector">
      <SidebarHeader class={bem('header')}>
        <div class={bem('title')}>Inspector</div>
        <div class={bem('subtitle')}>Selected {bridge.selectionCount()}</div>
      </SidebarHeader>

      <SidebarBody stacked class={bem('body')}>
        <Show when={bridge.selectionCount() === 0}>
          <div class={bem('empty')}>选择一个图元后可直接编辑样式。</div>
        </Show>

        <Show when={bridge.selectionCount() > 1}>
          <div class={bem('hint')}>批量编辑会合并为一次历史记录；空输入框表示当前值不一致。</div>
        </Show>

        <Show when={bridge.selectionCount() > 0}>
          <>
            <InspectorSection
              title="Line"
              description="基础线条样式"
              action={
                <button type="button" class={bem('default-button')} onClick={bridge.applyLineColorAsDefault}>
                  Set default
                </button>
              }
            >
              <ColorField
                label="Color"
                value={bridge.lineColorValue()}
                placeholder={bridge.lineColorPlaceholder()}
                onInput={bridge.setLineColor}
              />
            </InspectorSection>

            <Show when={bridge.hasShapeSelection()}>
              <InspectorSection
                title="Fill"
                description="基础填充样式"
                action={
                  <button type="button" class={bem('default-button')} onClick={bridge.applyFillColorAsDefault}>
                    Set default
                  </button>
                }
              >
                <ColorField
                  label="Color"
                  value={bridge.fillColorValue()}
                  placeholder={bridge.fillColorPlaceholder()}
                  onInput={bridge.setFillColor}
                />
              </InspectorSection>
            </Show>

            <InspectorSection
              title="Font"
              description="基础文字样式"
              action={
                <button type="button" class={bem('default-button')} onClick={bridge.applyFontSizeAsDefault}>
                  Set default
                </button>
              }
            >
              <NumberField
                label="Size"
                min={1}
                step={1}
                value={bridge.fontSizeValue()}
                placeholder={bridge.fontSizePlaceholder()}
                onInput={bridge.setFontSize}
              />
            </InspectorSection>
          </>
        </Show>
      </SidebarBody>
    </SidebarFrame>
  )
}
