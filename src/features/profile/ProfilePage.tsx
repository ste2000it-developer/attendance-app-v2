/** Profile appearance only. No identity or personal data is fabricated in preview mode. */
const fields = ["ชื่อ–นามสกุล", "รหัสพนักงาน", "แผนก", "ตำแหน่ง"];

export default function ProfilePage() {
  return (
    <div className="page-content profile-v2">
      <header className="page-heading">
        <div>
          <span className="eyebrow">EMPLOYEE / ACCOUNT</span>
          <h1>โปรไฟล์</h1>
          <p>ข้อมูลส่วนตัวและรายละเอียดสำหรับการทำงาน</p>
        </div>
        <span className="page-demo-tag">ตัวอย่าง UI</span>
      </header>

      <section className="profile-card" aria-label="ข้อมูลโปรไฟล์พนักงาน">
        <div className="profile-identity">
          <span className="profile-identity-avatar" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </span>
          <div className="profile-identity-text">
            <span className="profile-overline">EMPLOYEE PROFILE</span>
            <h2>ข้อมูลพนักงาน</h2>
            <p>ข้อมูลของคุณจะแสดงที่นี่หลังเข้าสู่ระบบ</p>
          </div>
          <span className="profile-connection">ยังไม่เชื่อมบัญชี</span>
        </div>

        <dl className="profile-details">
          {fields.map((label) => (
            <div className="profile-detail" key={label}>
              <dt>{label}</dt>
              <dd>— <span className="sr-only">ยังไม่มีข้อมูล</span></dd>
            </div>
          ))}
        </dl>

        <div className="profile-footnote">
          <span className="profile-lock-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <p>ข้อมูลพนักงานจริงยังไม่เชื่อมต่อ หน้านี้เป็นตัวอย่าง UI และไม่แสดงข้อมูลส่วนบุคคลจำลอง</p>
        </div>
      </section>
    </div>
  );
}
