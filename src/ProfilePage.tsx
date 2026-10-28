import { useState } from 'react';
import {
  ArrowLeft, ArrowUpRight, BadgeInfo, CalendarDays, Check,
  ChevronDown, ClipboardList, ContactRound,
  Fingerprint, IdCard, Info, LockKeyhole, UserRound, UsersRound,
} from 'lucide-react';
import './profile.css';

type ProfilePageProps = {
  onBack: () => void;
  onHistory: () => void;
  onLeave: () => void;
};

const fields = [
  { label: 'ชื่อ-นามสกุล', Icon: UserRound },
  { label: 'รหัสพนักงาน', Icon: IdCard },
  { label: 'แผนก', Icon: UsersRound },
  { label: 'ตำแหน่ง', Icon: ContactRound },
] as const;

/**
 * Employee profile: intentional empty state until authenticated employee data
 * is connected. No fictional identity, attendance count, role or verification.
 */
export default function ProfilePage({ onBack, onHistory, onLeave }: ProfilePageProps) {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <main className="profile-page">
      <header className="profile-header">
        <button className="profile-back" type="button" onClick={onBack} aria-label="กลับหน้าหลัก">
          <ArrowLeft size={23} strokeWidth={2} aria-hidden="true" />
        </button>
        <div className="profile-header__identity">
          <span>MY ACCOUNT</span>
          <h1>โปรไฟล์ของฉัน</h1>
        </div>
        <span className="profile-preview-tag">
          <span aria-hidden="true" />
          โหมดทดลอง
        </span>
      </header>

      <section className="profile-identity" aria-labelledby="profile-identity-title">
        {/* Subtle pixel landscape that follows the Home sky's time of day. */}
        <div className="profile-pixel-scene" aria-hidden="true">
          <span className="profile-pixel-scene__sun" />
          <span className="profile-pixel-scene__cloud" />
          <span className="profile-pixel-scene__star profile-pixel-scene__star--one" />
          <span className="profile-pixel-scene__star profile-pixel-scene__star--two" />
          <span className="profile-pixel-scene__ridge profile-pixel-scene__ridge--back" />
          <span className="profile-pixel-scene__ridge profile-pixel-scene__ridge--front" />
        </div>
        <div className="profile-identity__top">
          <span className="profile-identity__eyebrow">EMPLOYEE CARD</span>
          <span className="profile-identity__emblem" aria-hidden="true"><Fingerprint size={24} strokeWidth={1.7} /></span>
        </div>
        <div className="profile-identity__main">
          <div className="profile-avatar" aria-hidden="true">
            <div className="profile-avatar__inner"><UserRound size={38} strokeWidth={1.55} /></div>
          </div>
          <div className="profile-identity__text">
            <h2 id="profile-identity-title">บัญชีพนักงาน</h2>
            <p>ข้อมูลประจำตัวจะแสดงที่นี่</p>
            <span className="profile-identity__role">พนักงาน · ตัวอย่างหน้าจอ</span>
          </div>
        </div>
        <div className="profile-identity__bottom">
          <div className="profile-account-state">
            <span className="profile-account-state__dot" aria-hidden="true" />
            <span>ยังไม่เชื่อมบัญชีจริง</span>
          </div>
          <span className="profile-identity__stamp">ATTENDANCE</span>
        </div>
      </section>

      <section className="profile-section profile-section--actions" aria-labelledby="profile-actions-title">
        <div className="profile-section__heading">
          <div>
            <h2 id="profile-actions-title">รายการของฉัน</h2>
            <p>เข้าถึงข้อมูลที่ใช้บ่อยได้ทันที</p>
          </div>
          <span className="profile-section__subtle">ทางลัด</span>
        </div>
        <div className="profile-quick-grid">
          <button type="button" className="profile-quick-card" onClick={onHistory}>
            <span className="profile-quick-card__top">
              <span className="profile-quick-card__icon"><CalendarDays size={23} strokeWidth={1.85} aria-hidden="true" /></span>
              <ArrowUpRight size={19} strokeWidth={2} aria-hidden="true" />
            </span>
            <strong>ประวัติทำงาน</strong>
            <span>ดูการเข้างานและออกงาน</span>
          </button>
          <button type="button" className="profile-quick-card" onClick={onLeave}>
            <span className="profile-quick-card__top">
              <span className="profile-quick-card__icon profile-quick-card__icon--leave">
                <ClipboardList size={23} strokeWidth={1.85} aria-hidden="true" />
              </span>
              <ArrowUpRight size={19} strokeWidth={2} aria-hidden="true" />
            </span>
            <strong>การลาของฉัน</strong>
            <span>คำขอและสถานะการลา</span>
          </button>
        </div>
      </section>

      <section className="profile-section" aria-labelledby="profile-details-title">
        <div className="profile-section__heading">
          <div>
            <h2 id="profile-details-title">ข้อมูลพนักงาน</h2>
            <p>ข้อมูลที่จัดการโดยบริษัท</p>
          </div>
          <span className="profile-section__privacy"><LockKeyhole size={13} aria-hidden="true" /> อ่านอย่างเดียว</span>
        </div>
        <div className="profile-info-grid">
          {fields.map(({ label, Icon }) => (
            <div className="profile-info-field" key={label}>
              <span className="profile-info-field__label"><Icon size={16} strokeWidth={1.8} aria-hidden="true" />{label}</span>
              <strong>รอเชื่อมข้อมูล</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-about" aria-label="รายละเอียดข้อมูลบัญชี">
        <button type="button" className="profile-about__trigger"
          aria-expanded={aboutOpen} aria-controls="profile-about-details"
          onClick={() => setAboutOpen((open) => !open)}>
          <span className="profile-about__icon"><BadgeInfo size={21} strokeWidth={1.9} aria-hidden="true" /></span>
          <span className="profile-about__label">
            <strong>เกี่ยวกับข้อมูลของฉัน</strong>
            <small>{aboutOpen ? 'ข้อมูลการเชื่อมต่อและสิทธิ์การเข้าถึง' : 'ดูว่าข้อมูลนี้จะมาจากไหน'}</small>
          </span>
          <ChevronDown className={aboutOpen ? 'profile-about__chevron profile-about__chevron--open' : 'profile-about__chevron'}
            size={21} aria-hidden="true" />
        </button>
        {aboutOpen && (
          <div className="profile-about__content" id="profile-about-details">
            <div><Check size={16} aria-hidden="true" /><span>เมื่อเปิดใช้งานจริง ข้อมูลชื่อ รหัส แผนก และตำแหน่งจะดึงจากบัญชีพนักงานของบริษัท</span></div>
            <div><LockKeyhole size={16} aria-hidden="true" /><span>ระบบจะกำหนดสิทธิ์ให้พนักงานดูเฉพาะข้อมูลที่ได้รับอนุญาต</span></div>
            <div><Info size={16} aria-hidden="true" /><span>ปัจจุบันยังเป็นหน้าออกแบบ ไม่มีการอ่านหรือบันทึกข้อมูลพนักงานจริง</span></div>
          </div>
        )}
      </section>

      <p className="profile-footnote">
        <Info size={14} aria-hidden="true" />
        UI ทดลอง · ยังไม่ได้เชื่อม Firebase
      </p>
    </main>
  );
}
