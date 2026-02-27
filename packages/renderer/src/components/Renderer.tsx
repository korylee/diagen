import { RendererContainer } from './RendererContainer'
import { CanvasRenderer } from '../canvas'

export function Renderer() {
  return (
    <RendererContainer>
      <CanvasRenderer />
      {/*  svg renderer*/}
    </RendererContainer>
  )
}
