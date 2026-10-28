import {
  ArrowLeft, CalendarDays, ChevronRight, ClipboardList,
  ContactRound, Info, ShieldCheck, UserRound,
} from 'lucide-react';
import './profile.css';

type ProfilePageProps = {
  onBack: () => void;
  onHistory: () => void;
  onLeave: () => void;
};

/**
 * Employee profile design preview.
 * Identity / role values intentionally remain empty until Firebase Auth
 * and the actual employee record are connected. No invented personal data.
 */
export default function ProfilePage({ onBack, onHistory, onLeave }: ProfilePageProps) {
  return (
    <main className="profile-page">
      <header className="profile-heading">
        <button className="profile-heading__back" type="button" onClick={onBack} aria-label="กลับหน้าหลัก">
          <ArrowLeft size={22} strokeWidth={1.9} aria-hidden="true" />
        </button>
        <span className="profile-heading__icon" aria-hidden="true">
          <UserRound size={23} strokeWidth={1.9} />
        </span>
        <div className="profile-heading__text">
          <h1>โปรไฟล์</h1>
          <p>ข้อมูลส่วนตัวและเมนูของฉัน</p>
        </div>
      </header>

      <section className="profile-hero" aria-label="บัญชีผู้ใช้งาน">
        <div className="profile-hero__top">
          <span className="profile-hero__eyebrow">EMPLOYEE PROFILE</span>
          <span className="profile-hero__hint">ตัวอย่างดีไซน์</span>
        </div>
        <div className="profile-hero__body">
          <span className="profile-hero__avatar" aria-hidden="true">
            <UserRound size={39} strokeWidth={1.55} />
          </span>
          <div className="profile-hero__identity">
            <h2>ข้อมูลพนักงาน</h2>
            <p>ชื่อและรายละเอียดจะแสดงที่นี่หลังเข้าสู่ระบบ</p>
          </div>
        </div>
        <div className="profile-hero__status">
          <span className="profile-hero__status-dot" aria-hidden="true" />
          ยังไม่เชื่อมบัญชีพนักงาน
        </div>
      </section>

      <section className="profile-section" aria-labelledby="profile-personal-title">
        <div className="profile-section__heading">
          <div className="profile-section__title">
            <ContactRound size={19} strokeWidth={1.9} aria-hidden="true" />
            <h2 id="profile-personal-title">ข้อมูลส่วนตัว</h2>
          </div>
          <span className="profile-section__readonly">อ่านอย่างเดียว</span>
        </div>
        <div className="profile-details">
          <div className="profile-details__row">
            <span>ชื่อ-นามสกุล</span><strong>—</strong>
          </div>
          <div className="profile-details__row">
            <span>รหัสพนักงาน</span><strong>—</strong>
          </div>
          <div className="profile-details__row">
            <span>แผนก</span><strong>—</strong>
          </div>
          <div className="profile-details__row">
            <span>ตำแหน่ง</span><strong>—</strong>
          </div>
        </div>
      </section>

      <section className="profile-section profile-shortcuts" aria-labelledby="profile-menu-title">
        <div className="profile-section__heading">
          <div className="profile-section__title">
            <ClipboardList size={19} strokeWidth={1.9} aria-hidden="true" />
            <h2 id="profile-menu-title">เมนูของฉัน</h2>
          </div>
        </div>
        <div className="profile-shortcuts__list">
          <button type="button" className="profile-shortcut" onClick={onHistory}>
            <span className="profile-shortcut__icon"><CalendarDays size={21} strokeWidth={1.8} aria-hidden="true" /></span>
            <span className="profile-shortcut__body">
              <strong>ประวัติการทำงาน</strong>
              <small>ดูข้อมูลการเข้างานและออกงาน</small>
            </span>
            <ChevronRight size={19} aria-hidden="true" />
          </button>
          <button type="button" className="profile-shortcut" onClick={onLeave}>
            <span className="profile-shortcut__icon"><ClipboardList size={21} strokeWidth={1.8} aria-hidden="true" /></span>
            <span className="profile-shortcut__body">
              <strong>คำขอลาของฉัน</strong>
              <small>ดูรายการลาและสถานะคำขอ</small>
            </span>
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        </div>
      </section>

      <div className="profile-security">
        <ShieldCheck size={19} strokeWidth={1.8} aria-hidden="true" />
        <div>
          <strong>ข้อมูลปลอดภัยและเป็นส่วนตัว</strong>
          <span>เมื่อเชื่อมระบบจริง พนักงานจะเห็นเฉพาะข้อมูลของบัญชีตนเองตามสิทธิ์ที่กำหนด</span>
        </div>
      </div>

      <p className="profile-footnote">
        <Info size={14} aria-hidden="true" /> หน้านี้เป็นตัวอย่าง UI ยังไม่เชื่อม Firebase หรือข้อมูลพนักงานจริง
      </p>
    </main>
  );
}
