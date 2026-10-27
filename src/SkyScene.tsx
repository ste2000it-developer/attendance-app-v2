import { useCallback, useEffect, useRef } from 'react';
import type { DayPeriod } from './theme';

type SkySceneProps = {
  period: DayPeriod;
  onSkyEdgeReady?: (period: DayPeriod, dataUrl: string) => void;
};

// Keep the four approved backgrounds unmodified. Sample only the visible TOP
// pixel row, respecting cover + center/bottom, to extend that same sky ABOVE
// the hero for iOS's translucent status bar. No rescaling of the hero itself.
export default function SkyScene({ period, onSkyEdgeReady }: SkySceneProps) {
  const imageRef = useRef<HTMLImageElement>(null);

  const sampleSkyEdge = useCallback(() => {
    const image = imageRef.current;
    if (!image || !image.naturalWidth || !image.naturalHeight || !onSkyEdgeReady) return;

    const width = Math.round(image.clientWidth);
    const height = Math.round(image.clientHeight);
    if (width < 1 || height < 1) return;

    // These numbers mirror CSS object-fit:cover + object-position:center bottom.
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const left = Math.max(0, (image.naturalWidth - sourceWidth) / 2);
    const top = Math.max(0, image.naturalHeight - sourceHeight);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, left, top, sourceWidth, 1 / scale, 0, 0, width, 1);
    try {
      onSkyEdgeReady(period, canvas.toDataURL('image/png'));
    } catch {
      // Keep the period's fallback sky color if canvas extraction is unavailable.
    }
  }, [period, onSkyEdgeReady]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    if (image.complete && image.naturalWidth) sampleSkyEdge();
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(sampleSkyEdge)
      : null;
    resizeObserver?.observe(image);
    return () => resizeObserver?.disconnect();
  }, [sampleSkyEdge]);

  return (
    <div className="sky-scene" aria-hidden="true">
      <img
        ref={imageRef}
        className="sky-scene__art"
        src={`${import.meta.env.BASE_URL}backgrounds/pixel-${period}.webp?v=bridge-aligned-1`}
        alt=""
        loading="eager"
        decoding="async"
        onLoad={sampleSkyEdge}
        draggable={false}
      />
    </div>
  );
}
