import type { DayPeriod } from './theme';

// Backgrounds are generated image assets (WebP), not hand-drawn SVG.
// Kept separate from the interface so illustrations never contain text or controls.
export default function SkyScene({ period }: { period: DayPeriod }) {
  return (
    <div className="sky-scene" aria-hidden="true">
      <img
        className="sky-scene__art"
        src={`${import.meta.env.BASE_URL}backgrounds/${period}.webp`}
        alt=""
        loading="eager"
        decoding="async"
        draggable={false}
      />
    </div>
  );
}
