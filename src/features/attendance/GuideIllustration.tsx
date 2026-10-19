/**
 * Visual, self-contained example screens for the demo assistant.
 * Drawn as SVG so they are sharp at every phone width and work offline.
 * These are illustrative previews, not actual screenshots or live GPS state.
 */
export type GuideTopic = "attendance" | "gps" | "leave";
type GuideStatus = "ready" | "working" | "finished";

const font = '"Noto Sans Thai", "Leelawadee UI", "Segoe UI", Tahoma, sans-serif';

function Ring({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  return (
    <rect x={x} y={y} width={width} height={height} rx="15"
      fill="none" stroke="#2C87CA" strokeWidth="3.2" />
  );
}

export function GuideIllustration({ topic, status }: { topic: GuideTopic; status: GuideStatus }) {
  const accent = status === "ready" ? "#176B48" : status === "working" ? "#A44B12" : "#525F6E";
  const action = status === "ready" ? "ทดลองเข้างาน"
    : status === "working" ? "ทดลองเลิกงาน" : "เริ่มทดลองใหม่";

  if (topic === "attendance") {
    return (
      <svg className="daily-guide-illustration" viewBox="0 0 360 210" role="img"
        aria-label={`ภาพจำลองหน้า Home ชี้ที่ปุ่ม ${action}`} style={{ fontFamily: font }}>
        <rect width="360" height="210" rx="19" fill="#E9F3F8" />
        <circle cx="322" cy="27" r="54" fill="#DCECF5" opacity=".7" />
        <rect x="55" y="12" width="250" height="186" rx="18" fill="#FFFFFF" stroke="#D5E3EC" />
        <rect x="74" y="26" width="42" height="4" rx="2" fill="#D1E1E9" />
        <text x="78" y="53" fontSize="12" fontWeight="700" fill="#304E66">เวลาปัจจุบัน</text>
        <text x="180" y="94" textAnchor="middle" fontSize="42" fontWeight="740" fill="#193751">08:30</text>
        <rect x="90" y="112" width="180" height="48" rx="12" fill={accent} />
        <text x="180" y="142" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="750">{action}</text>
        <Ring x={85} y={107} width={190} height={58} />
        <circle cx="293" cy="154" r="17" fill="#2C87CA" stroke="#FFFFFF" strokeWidth="3" />
        <text x="293" y="160" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="800">1</text>
        <rect x="112" y="179" width="136" height="5" rx="2.5" fill="#E2EAF0" />
      </svg>
    );
  }

  if (topic === "gps") {
    return (
      <svg className="daily-guide-illustration" viewBox="0 0 360 210" role="img"
        aria-label="ภาพจำลองหน้าการตั้งค่าตำแหน่ง ชี้สวิตช์เปิดตำแหน่ง" style={{ fontFamily: font }}>
        <rect width="360" height="210" rx="19" fill="#E9F3F8" />
        <circle cx="39" cy="178" r="58" fill="#D8EAF5" />
        <rect x="56" y="10" width="248" height="190" rx="18" fill="#FFFFFF" stroke="#D5E3EC" />
        <text x="80" y="46" fill="#243E56" fontSize="17" fontWeight="780">การตั้งค่าตำแหน่ง</text>
        <rect x="76" y="64" width="208" height="79" rx="13" fill="#F1F6F9" />
        <path d="M100 100c0 13 0 16 0 16s-13-14-13-23a13 13 0 0 1 26 0c0 9-13 23-13 23Z" fill="#397AA2" />
        <circle cx="100" cy="93" r="4" fill="#F1F6F9" />
        <text x="124" y="98" fontSize="14" fontWeight="730" fill="#2B465F">ตำแหน่ง</text>
        <text x="124" y="115" fontSize="10" fill="#647A8B">Location</text>
        <rect x="214" y="90" width="54" height="30" rx="15" fill="#197B59" />
        <circle cx="251" cy="105" r="11" fill="#FFFFFF" />
        <Ring x={207} y={83} width={68} height={44} />
        <circle cx="287" cy="129" r="16" fill="#2C87CA" stroke="#FFFFFF" strokeWidth="3" />
        <text x="287" y="134" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="800">1</text>
        <rect x="85" y="163" width="189" height="6" rx="3" fill="#E6EDF2" />
        <rect x="85" y="179" width="126" height="6" rx="3" fill="#EEF2F5" />
      </svg>
    );
  }

  return (
    <svg className="daily-guide-illustration" viewBox="0 0 360 210" role="img"
      aria-label="ภาพจำลองแอปชี้ตำแหน่งแท็บการลาที่แถบเมนูล่าง" style={{ fontFamily: font }}>
      <rect width="360" height="210" rx="19" fill="#E9F3F8" />
      <circle cx="319" cy="185" r="68" fill="#DCECF5" />
      <rect x="47" y="10" width="266" height="190" rx="17" fill="#FFFFFF" stroke="#D5E3EC" />
      <text x="68" y="42" fontSize="17" fontWeight="790" fill="#243D54">การลา</text>
      <text x="68" y="61" fontSize="10" fill="#617889">พื้นที่สำหรับจัดการใบลา</text>
      <rect x="67" y="75" width="226" height="51" rx="10" fill="#F4F8FA" />
      <rect x="82" y="89" width="104" height="7" rx="3.5" fill="#BECFD9" />
      <rect x="82" y="103" width="155" height="6" rx="3" fill="#D7E2E8" />
      <rect x="47" y="138" width="266" height="62" rx="0" fill="#F8FAFB" />
      <line x1="47" y1="138" x2="313" y2="138" stroke="#E4EDF2" />
      <rect x="62" y="146" width="68" height="45" rx="9" fill="#DCEAF4" />
      <rect x="89" y="152" width="14" height="13" rx="2" stroke="#286792" strokeWidth="2" fill="none" />
      <path d="M93 149v5M99 149v5M89 157h14" stroke="#286792" strokeWidth="1.5" strokeLinecap="round" />
      <text x="96" y="181" textAnchor="middle" fontSize="11" fontWeight="750" fill="#22577B">การลา</text>
      <path d="m171 154 8-6 8 6v11h-5v-7h-6v7h-5Z" stroke="#879BAA" fill="none" strokeWidth="1.5" />
      <text x="179" y="181" fontSize="11" textAnchor="middle" fill="#64788A">หน้าหลัก</text>
      <circle cx="263" cy="153" r="5" stroke="#879BAA" strokeWidth="1.7" fill="none" />
      <path d="M251 167a12 12 0 0 1 24 0" stroke="#879BAA" strokeWidth="1.7" fill="none" />
      <text x="263" y="181" fontSize="11" textAnchor="middle" fill="#64788A">โปรไฟล์</text>
      <Ring x={56} y={140} width={80} height={57} />
      <circle cx="148" cy="178" r="16" fill="#2C87CA" stroke="#FFFFFF" strokeWidth="3" />
      <text x="148" y="183" textAnchor="middle" fontSize="16" fill="#FFFFFF" fontWeight="800">1</text>
    </svg>
  );
}
