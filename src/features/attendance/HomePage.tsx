export function HomePage() {
  const today = new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">หน้าแรก · พนักงาน</span>
          <h1>สวัสดีครับ</h1>
          <p>ยินดีต้อนรับสู่ระบบบันทึกเวลาทำงานเวอร์ชันใหม่</p>
        </div>
        <span className="date-chip">{today}</span>
      </div>

      <div className="notice" role="status">
        <span className="notice-dot" aria-hidden="true" />
        หน้านี้เป็นตัวอย่างการออกแบบ ยังไม่มีการเชื่อมต่อ Firebase หรือบันทึกข้อมูลจริง
      </div>

      <section className="panel attendance-panel" aria-labelledby="attendance-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">TODAY'S ATTENDANCE</p>
            <h2 id="attendance-title">บันทึกเวลาทำงาน</h2>
          </div>
          <span className="status-tag">ยังไม่เชื่อมระบบ</span>
        </div>

        <div className="time-grid">
          <div className="time-box">
            <span>เวลาเข้างาน</span>
            <strong>--:--</strong>
            <small>รอเชื่อมข้อมูลจริง</small>
          </div>
          <div className="time-box">
            <span>เวลาเลิกงาน</span>
            <strong>--:--</strong>
            <small>รอเชื่อมข้อมูลจริง</small>
          </div>
        </div>

        <div className="location-row">
          <span className="location-mark" aria-hidden="true">◎</span>
          <div>
            <strong>สถานที่ทำงาน</strong>
            <p>ยังไม่ได้เปิดใช้งาน GPS</p>
          </div>
        </div>

        <button type="button" className="primary-button" disabled>
          เข้างาน · ยังไม่เปิดใช้งาน
        </button>
      </section>

      <section className="overview-grid" aria-label="ฟังก์ชันที่กำลังเตรียมพัฒนา">
        <article className="panel overview-card">
          <span className="overview-icon" aria-hidden="true">◷</span>
          <h3>บันทึกการเข้างาน</h3>
          <p>ระบบเวลาทำงาน, OT, วันหยุด และการตัดเวลาอัตโนมัติ</p>
        </article>
        <article className="panel overview-card">
          <span className="overview-icon" aria-hidden="true">▤</span>
          <h3>ระบบการลา</h3>
          <p>ยื่นคำขอ ตรวจสถานะ และดูประวัติย้อนหลัง</p>
        </article>
      </section>
    </div>
  );
}
