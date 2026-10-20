import "./ProfilePage.css";

/**
 * Attendance V2 employee-card preview.
 * Identity and employment information are deliberately empty until an
 * authenticated account and admin-managed employee record are connected.
 */
const workFields = [
  { label: "บริษัท", value: "—" },
  { label: "แผนก", value: "—" },
  { label: "ตำแหน่ง", value: "—" },
  { label: "สาขา / สถานที่ทำงาน", value: "—" },
  { label: "วันที่เริ่มงาน", value: "—" },
  { label: "สถานะพนักงาน", value: "—" }
] as const;

function PersonPlaceholder() {
  return (
    <svg width="66" height="72" viewBox="0 0 80 88" fill="none" aria-hidden="true">
      <circle cx="40" cy="28" r="16" fill="currentColor" opacity=".55" />
      <path d="M6 86v-7c0-20 15-32 34-32s34 12 34 32v7H6Z" fill="currentColor" opacity=".55" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function ProfilePage() {
  return (
    <div className="page-content profile-v2">
      <header className="profile-page-intro">
        <h1>โปรไฟล์</h1>
        <p>บัตรพนักงานและข้อมูลการทำงานของคุณ</p>
      </header>

      <section className="employee-id-card" aria-labelledby="employee-id-heading">
        <div className="employee-id-header">
          <div>
            <span className="employee-id-overline">EMPLOYEE ID</span>
            <h2 id="employee-id-heading">บัตรพนักงาน</h2>
          </div>
          <span className="employee-id-header-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4.5" width="20" height="15" rx="2.5"/>
              <circle cx="8.4" cy="10.5" r="2.3"/>
              <path d="M4.9 16c.5-1.9 2-2.9 3.5-2.9s3 1 3.5 2.9M15 9h4M15 13h4"/>
            </svg>
          </span>
        </div>

        <div className="employee-id-content">
          <div className="employee-id-photo" role="img" aria-label="ตำแหน่งแสดงรูปพนักงาน เมื่อเชื่อมบัญชี">
            <PersonPlaceholder />
            <span>รูปพนักงาน</span>
          </div>

          <div className="employee-id-person">
            <span className="employee-id-field-label">ชื่อ–นามสกุล</span>
            <p className="employee-id-person-name">ยังไม่มีข้อมูล</p>
            <div className="employee-id-position">
              <span>ตำแหน่ง</span>
              <strong>—</strong>
            </div>
            <div className="employee-id-number">
              <span>รหัสพนักงาน</span>
              <strong>—</strong>
            </div>
          </div>
        </div>

        <div className="employee-id-bottom">
          <div>
            <span>บริษัท</span>
            <strong>—</strong>
          </div>
          <div>
            <span>สถานที่ทำงาน</span>
            <strong>—</strong>
          </div>
          <span className="employee-id-unlinked">ยังไม่เชื่อมบัญชี</span>
        </div>
      </section>

      <section className="profile-work" aria-labelledby="profile-work-heading">
        <div className="profile-work-heading">
          <div>
            <h2 id="profile-work-heading">ข้อมูลการทำงาน</h2>
            <p>รายละเอียดที่ผู้ดูแลระบบกำหนดให้</p>
          </div>
          <span className="profile-work-readonly"><LockIcon /> ดูอย่างเดียว</span>
        </div>
        <dl className="profile-work-details">
          {workFields.map(({ label, value }) => (
            <div className="profile-work-field" key={label}>
              <dt>{label}</dt>
              <dd>{value}<span className="sr-only">ยังไม่มีข้อมูล</span></dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="profile-admin-note">
        <LockIcon />
        <p>ข้อมูลทั้งหมดจัดการโดยแอดมิน พนักงานไม่สามารถแก้ไขเองได้ <span>· ตอนนี้ยังไม่เชื่อมข้อมูลพนักงานจริง</span></p>
      </div>
    </div>
  );
}
