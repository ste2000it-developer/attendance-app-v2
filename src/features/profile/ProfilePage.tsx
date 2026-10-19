export default function ProfilePage() {
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">EMPLOYEE PROFILE</span>
          <h1>โปรไฟล์</h1>
          <p>ข้อมูลบัญชีพนักงานและรายละเอียดการทำงาน</p>
        </div>
      </div>
      <div className="notice" role="status">ยังไม่ได้เชื่อมระบบเข้าสู่ระบบและข้อมูลพนักงานจริง</div>
      <section className="panel profile-placeholder">
        <div className="profile-avatar" aria-hidden="true">?</div>
        <div>
          <p className="eyebrow">PROFILE PREVIEW</p>
          <h2>ข้อมูลพนักงาน</h2>
          <p>ชื่อ รหัสพนักงาน แผนก ตำแหน่ง และการผูกอุปกรณ์จะแสดงเมื่อระบบปลอดภัยพร้อมใช้งาน</p>
        </div>
      </section>
    </div>
  );
}
