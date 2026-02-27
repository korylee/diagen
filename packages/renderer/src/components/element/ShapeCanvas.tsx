import { onMount, createEffect, on } from 'solid-js';
import type { ShapeElement } from '@diagen/core';
import type { Rect, Viewport } from '@diagen/shared';
import { isRectVisible } from '@diagen/shared';
import { renderShape } from '../../utils';
import { useStore } from '../StoreProvider'

export interface ShapeCanvasProps {
  shape: ShapeElement;
  viewport: Viewport;
  viewportSize: { width: number; height: number };
  onMouseDown?: (event: MouseEvent) => void;
}

const DPR = window.devicePixelRatio || 1;

export function ShapeCanvas(props: ShapeCanvasProps) {
  let canvasRef: HTMLCanvasElement | undefined;
  let containerRef: HTMLDivElement | undefined

  const { selection } = useStore()
  const { isSelected } = selection

  const padding = 4;

  const getBounds = (): Rect => ({
    x: props.shape.props.x,
    y: props.shape.props.y,
    w: props.shape.props.w,
    h: props.shape.props.h,
  });

  const getScreenPosition = () => {
    const bounds = getBounds();
    return {
      x: bounds.x * props.viewport.zoom,
      y: bounds.y * props.viewport.zoom
    };
  };

  const getCanvasSize = () => {
    const bounds = getBounds();
    const zoom = props.viewport.zoom;
    return {
      width: Math.max(1, Math.ceil(bounds.w * zoom) + padding * 2),
      height: Math.max(1, Math.ceil(bounds.h * zoom) + padding * 2),
    };
  };

  const isVisible = () =>
    isRectVisible(getBounds(), props.viewport, {
      x: 0,
      y: 0,
      w: props.viewportSize.width,
      h: props.viewportSize.height,
    });

  const doRender = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const size = getCanvasSize();
    const scale = props.viewport.zoom;

    ctx.clearRect(0, 0, size.width * DPR, size.height * DPR);
    ctx.save();
    ctx.scale(DPR, DPR);
    ctx.scale(scale, scale);
    ctx.translate(padding / scale, padding / scale);
    renderShape(ctx, props.shape);
    ctx.restore();
  };

  const updateCanvas = () => {
    if (!isVisible()) {
      if (containerRef) containerRef.style.display = 'none';
      return;
    }
    if (containerRef) containerRef.style.display = 'block';

    const size = getCanvasSize();
    if (canvasRef) {
      canvasRef.width = size.width * DPR;
      canvasRef.height = size.height * DPR;
    }
    doRender();
  };

  onMount(() => updateCanvas());

  createEffect(on(() => [props.shape, props.viewport], () => updateCanvas()));

  const handleMouseDown = (e: MouseEvent) => {
    e.stopPropagation();
    props.onMouseDown?.(e);
  };

  const pos = () => getScreenPosition();
  const size = () => getCanvasSize();

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: `${pos().x - padding}px`,
        top: `${pos().y - padding}px`,
        width: `${size().width}px`,
        height: `${size().height}px`,
        cursor: isSelected(props.shape.id) ? 'move' : 'pointer',
        'pointer-events': 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        width={size().width * DPR}
        height={size().height * DPR}
        style={{
          width: `${size().width}px`,
          height: `${size().height}px`,
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
