export default function LeavePage() {
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">LEAVE MANAGEMENT</span>
          <h1>การลา</h1>
          <p>พื้นที่สำหรับจัดการใบลาและประวัติคำขอ</p>
        </div>
      </div>
      <div className="notice" role="status">หน้านี้เป็นตัวอย่าง UI และยังไม่ส่งข้อมูลไป Firebase</div>
      <section className="panel feature-placeholder">
        <div className="feature-symbol" aria-hidden="true">▤</div>
        <h2>ระบบการลาเวอร์ชันใหม่</h2>
        <p>เราจะออกแบบฟอร์มและรายการใบลาให้ใช้ง่ายขึ้น โดยยึดเงื่อนไขการลาจากระบบเดิม</p>
        <button className="secondary-button" type="button" disabled>สร้างใบลา · ยังไม่เปิดใช้งาน</button>
      </section>
    </div>
  );
}
