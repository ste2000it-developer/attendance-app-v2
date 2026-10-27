import type { DayPeriod } from './theme';

// Each Pixel Art background is cropped from the approved generated artwork.
// These are actual WebP image files, not hand-drawn SVG or UI decorations.
export default function SkyScene({ period }: { period: DayPeriod }) {
  return (
    <div className="sky-scene" aria-hidden="true">
      <img
        className="sky-scene__art"
        src={`${import.meta.env.BASE_URL}backgrounds/pixel-${period}.webp?v=bridge-aligned-1`}
        alt=""
        loading="eager"
        decoding="async"
        draggable={false}
      />
    </div>
  );
}
