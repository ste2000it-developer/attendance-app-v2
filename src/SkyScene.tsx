import type { DayPeriod } from './theme';

// Time-themed artwork is stored in standalone SVG assets so the
// design can be updated without changing any layout or attendance logic.
export default function SkyScene({ period }: { period: DayPeriod }) {
  return (
    <div className="sky-scene" aria-hidden="true">
      <img
        className="sky-scene__art"
        src={`${import.meta.env.BASE_URL}backgrounds/${period}.svg`}
        alt=""
        decoding="async"
        draggable={false}
      />
    </div>
  );
}
