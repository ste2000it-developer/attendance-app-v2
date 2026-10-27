import type { DayPeriod } from './theme';

// Approved scenery stays fixed; only independent pixel-sky details move.
export default function SkyScene({ period }: { period: DayPeriod }) {
  return (
    <div className="sky-scene" data-period={period} aria-hidden="true">
      <img
        className="sky-scene__art"
        src={`${import.meta.env.BASE_URL}backgrounds/pixel-${period}.webp?v=bridge-aligned-1`}
        alt=""
        loading="eager"
        decoding="async"
        draggable={false}
      />
      {period === 'night' ? (
        <div className="sky-scene__sky-effects">
          <span className="sky-scene__star sky-scene__star--one" />
          <span className="sky-scene__star sky-scene__star--two" />
          <span className="sky-scene__star sky-scene__star--three" />
          <span className="sky-scene__star sky-scene__star--four" />
        </div>
      ) : (
        <div className="sky-scene__sky-effects">
          <svg className="sky-scene__cloud sky-scene__cloud--left" viewBox="0 0 160 56" focusable="false">
            <path fill="currentColor" d="M4 40h12v-8h16v-8h16v-8h24V8h32v8h16v8h20v8h12v8h4v8H4z" />
            <path fill="var(--cloud-highlight)" d="M32 32v-8h16v-8h24V8h32v8h16v8H88v8z" />
          </svg>
          <svg className="sky-scene__cloud sky-scene__cloud--right" viewBox="0 0 128 48" focusable="false">
            <path fill="currentColor" d="M4 32h12v-8h16v-8h20V8h24v8h16v8h20v8h12v8H4z" />
            <path fill="var(--cloud-highlight)" d="M32 24v-8h20V8h24v8h16v8z" />
          </svg>
        </div>
      )}
    </div>
  );
}
