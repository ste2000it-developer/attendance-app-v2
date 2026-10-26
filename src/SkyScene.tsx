import type { DayPeriod } from './theme';

// Lightweight vector landscapes: no remote images, no photo downloads.
// Decorative SVG only; essential information remains outside the artwork.
type Props = { period: DayPeriod };

const stars: Array<[number, number, number]> = [
  [19, 40, 1.1], [45, 81, 1], [82, 26, 1.4], [119, 67, 1],
  [161, 38, 1], [207, 17, 1.1], [251, 63, 1.2], [289, 36, 1],
  [325, 78, 1.4], [361, 23, 1], [391, 62, 1.2], [421, 37, 1],
  [59, 119, 1], [151, 103, 1], [276, 109, 0.9], [387, 117, 1],
];

function Clouds({ dusk = false }: { dusk?: boolean }) {
  return (
    <g fill={dusk ? '#ffe3cf' : '#ffffff'} opacity={dusk ? '0.20' : '0.75'}>
      <path d="M-28 128c8-25 41-31 58-10 11-23 46-22 57 3 17-9 39 2 44 19H-28Z" />
      <path d="M297 105c7-20 34-27 47-9 13-17 43-11 48 10 15-8 32 3 36 17H297Z" />
    </g>
  );
}

function Skyline({ period }: Props) {
  const isNight = period === 'night';
  const isEvening = period === 'evening';
  const back = isNight ? '#314664' : isEvening ? '#9c7797' : period === 'morning' ? '#9cbea3' : '#a4d6e9';
  const front = isNight ? '#142d49' : isEvening ? '#665677' : period === 'morning' ? '#83b3a4' : '#84bfd5';
  return (
    <>
      <path
        d="M0 255h15v-37h11v-23h19v60h11v-46h16v-16h8v62h16v-31h14v-45h19v76h11v-54h18v-21h8v75h12v-40h17v-38h15v78h12v-21h18v-32h13v53h14v-56h11v-33h18v89h11v-43h15v-27h21v70h15v-41h16v-26h12v67h20v-31h18v31h33v40H0Z"
        fill={back}
        opacity={isNight ? '0.58' : '0.55'}
      />
      <path
        d="M0 283h18v-35h15v-26h12v61h13v-46h19v46h15v-64h17v64h21v-36h17v-18h13v54h18v-40h23v40h12v-66h18v66h24v-42h16v-25h16v67h14v-44h20v44h11v-62h15v62h26v-29h19v29h24v-47h18v47h32v37H0Z"
        fill={front}
        opacity={isNight ? '0.95' : '0.64'}
      />
      {isNight && (
        <g fill="#ffd68a" opacity="0.8">
          <rect x="20" y="252" width="3" height="5" rx="1" />
          <rect x="38" y="232" width="3" height="6" rx="1" />
          <rect x="100" y="233" width="3" height="5" rx="1" />
          <rect x="146" y="260" width="3" height="6" rx="1" />
          <rect x="222" y="227" width="3" height="6" rx="1" />
          <rect x="289" y="253" width="3" height="5" rx="1" />
          <rect x="350" y="241" width="3" height="6" rx="1" />
          <rect x="389" y="263" width="3" height="5" rx="1" />
        </g>
      )}
    </>
  );
}

function Trees({ period }: Props) {
  const back = period === 'night' ? '#1a3855' : period === 'evening' ? '#866b83' : '#c0dbc2';
  const front = period === 'night' ? '#152f4d' : period === 'evening' ? '#6a637c' : '#8bbb9c';
  return (
    <>
      <path d="M0 282q25-42 48-9 24-38 57-8 36-30 55 10t52 7q31-39 63-6 23-38 56-9 37-31 61 4 25-29 38 11v38H0Z" fill={back} />
      <path d="M0 301q24-30 57-4 39-31 72 3 43-27 75 4 24-29 60-2 39-27 67 0 32-32 61-3l38-7v28H0Z" fill={front} />
    </>
  );
}

export default function SkyScene({ period }: Props) {
  return (
    <div className="sky-scene" aria-hidden="true">
      <svg className="sky-scene__art" viewBox="0 0 430 320" preserveAspectRatio="xMidYMax slice">
        {period === 'morning' && (
          <>
            <circle cx="73" cy="199" r="32" fill="#ffe29a" opacity="0.62" />
            <circle cx="73" cy="199" r="19" fill="#ffd678" />
            <Clouds />
            <path d="M0 260q74-63 146-14 58-33 130-4 85-44 154 3v75H0Z" fill="#f8e9bc" opacity="0.64" />
          </>
        )}
        {period === 'day' && (
          <>
            <circle cx="341" cy="55" r="28" fill="#fff7df" opacity="0.5" />
            <circle cx="341" cy="55" r="15" fill="#fffdf0" opacity="0.8" />
            <Clouds />
            <path d="M0 262q103-42 180-9 81-51 143-18 66-26 107 4v81H0Z" fill="#c5e6ea" opacity="0.55" />
          </>
        )}
        {period === 'evening' && (
          <>
            <circle cx="343" cy="208" r="37" fill="#ffc07a" opacity="0.3" />
            <circle cx="343" cy="208" r="21" fill="#ffd28e" opacity="0.9" />
            <Clouds dusk />
            <path d="M0 263q88-52 183-21 87-59 144-20 58-25 103 18v80H0Z" fill="#bd7f9a" opacity="0.46" />
          </>
        )}
        {period === 'night' && (
          <>
            <g fill="#dfedff">
              {stars.map(([x, y, radius]) => <circle key={String(x) + '-' + String(y)} cx={x} cy={y} r={radius} opacity="0.86" />)}
            </g>
            <path d="M337 42a24 24 0 1 0 19 34 26 26 0 1 1-19-34Z" fill="#e0e8fc" opacity="0.82" />
            <path d="M0 248q95-34 183-11 69-50 136-21 69-29 111 8v96H0Z" fill="#2b3c65" opacity="0.4" />
          </>
        )}
        <Skyline period={period} />
        <Trees period={period} />
      </svg>
    </div>
  );
}
