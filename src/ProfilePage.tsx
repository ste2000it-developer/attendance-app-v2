import { useState } from 'react';
import {
  ArrowLeft, CalendarDays, ChevronDown, ChevronRight, ClipboardList,
  ContactRound, IdCard, Info, LockKeyhole, ShieldCheck, UserRound, UsersRound,
} from 'lucide-react';
import './profile.css';

type ProfilePageProps = {
  onBack: () => void;
  onHistory: () => void;
  onLeave: () => void;
};

const employeeFields = [
  { key: 'name', label: 'ชื่อ-นามสกุล', Icon: UserRound },
  { key: 'number', label: 'รหัสพนักงาน', Icon: IdCard },
  { key: 'department', label: 'แผนก', Icon: UsersRound },
  { key: 'position', label: 'ตำแหน่ง', Icon: ContactRound },
] as const;

/** Decoration only. All shapes align to whole pixel coordinates. */
function PixelLandscape() {
  return (
    <svg className="pf-landscape" viewBox="0 0 360 140"
      preserveAspectRatio="xMidYMid slice" shapeRendering="crispEdges" aria-hidden="true">
      <rect width="360" height="140" fill="var(--pf-sky)" />
      <g className="pf-landscape__sun" fill="var(--pf-sun)">
        <rect x="268" y="22" width="32" height="32" />
        <rect x="276" y="14" width="16" height="8" />
        <rect x="276" y="54" width="16" height="8" />
        <rect x="260" y="30" width="8" height="16" />
        <rect x="300" y="30" width="8" height="16" />
      </g>
      <g className="pf-landscape__moon" fill="var(--pf-sun)">
        <rect x="274" y="17" width="24" height="8" />
        <rect x="266" y="25" width="32" height="24" />
        <rect x="274" y="49" width="24" height="8" />
        <rect x="290" y="17" width="16" height="26" fill="var(--pf-sky)" />
        <rect x="298" y="25" width="8" height="18" fill="var(--pf-sky)" />
      </g>
      <g className="pf-landscape__stars" fill="#fff6d6">
        <path d="M56 19h5v-5h5v5h5v5h-5v5h-5v-5h-5zM212 12h5v-5h5v5h5v5h-5v5h-5v-5h-5zM323 73h4v-4h4v4h4v4h-4v4h-4v-4h-4z" />
        <rect x="141" y="33" width="5" height="5" />
        <rect x="349" y="26" width="5" height="5" />
      </g>
      <g className="pf-landscape__clouds" fill="var(--pf-cloud)">
        <path d="M23 37h16v-8h24v8h16v8h16v8H15v-8h8z" />
        <path d="M178 43h16v-8h24v8h16v8h16v8h-80v-8h8z" />
        <rect x="101" y="19" width="24" height="5" opacity=".55" />
      </g>
      <path d="M0 96h16v-8h24v-8h32v-8h24v-8h24v8h16v8h24v8h20v8h24v-8h16v-8h24v-8h40v8h20v8h28v8h8v44H0z"
        fill="var(--pf-hill-back)" />
      <path d="M0 108h24v-8h28v-8h40v8h28v8h44v-8h32v-8h28v-8h24v8h20v8h16v8h28v-8h48v40H0z"
        fill="var(--pf-hill-front)" />
      <g fill="var(--pf-pixel-grass)">
        <rect x="24" y="115" width="8" height="4" />
        <rect x="76" y="108" width="12" height="4" />
        <rect x="134" y="125" width="8" height="4" />
        <rect x="198" y="109" width="12" height="4" />
        <rect x="271" y="119" width="8" height="4" />
        <rect x="322" y="107" width="8" height="4" />
        <rect x="346" y="126" width="6" height="4" />
      </g>
      <g fill="var(--pf-pixel-grass)" opacity=".45">
        <rect x="8" y="87" width="8" height="4" />
        <rect x="112" y="79" width="8" height="4" />
        <rect x="174" y="92" width="8" height="4" />
        <rect x="290" y="83" width="8" height="4" />
      </g>
    </svg>
  );
}

/**
 * Profile presentation only: no fabricated employee attributes, login or leave
 * balances. Real identity data will be displayed only after Firebase is wired.
 */
export default function ProfilePage({ onBack, onHistory, onLeave }: ProfilePageProps) {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <main className="pf-page">
      <header className="pf-header">
        <button type="button" className="pf-header__back" onClick={onBack} aria-label="กลับหน้าหลัก">
          <ArrowLeft size={22} strokeWidth={2} aria-hidden="true" />
        </button>
        <div className="pf-header__title">
          <span>PERSONAL SPACE</span>
          <h1>โปรไฟล์ของฉัน</h1>
        </div>
        <span className="pf-preview"><span className="pf-preview__light" aria-hidden="true" /> ตัวอย่าง</span>
      </header>

      <section className="pf-pass" aria-labelledby="pf-name">
        <div className="pf-pass__art">
          <PixelLandscape />
          <div className="pf-pass__art-top">
            <span>ATTENDANCE <span aria-hidden="true">·</span> PROFILE</span>
            <span className="pf-pass__pixels" aria-hidden="true">
              <i /><i /><i /><i />
            </span>
          </div>
        </div>
        <div className="pf-pass__body">
          <div className="pf-avatar" aria-hidden="true">
            <div className="pf-avatar__portrait"><UserRound size={34} strokeWidth={1.65} /></div>
            <span className="pf-avatar__spark" />
          </div>
          <div className="pf-pass__identity">
            <span className="pf-pass__overline">ข้อมูลประจำตัว</span>
            <h2 id="pf-name">โปรไฟล์พนักงาน</h2>
            <p>ชื่อและข้อมูลจะแสดงหลังเชื่อมบัญชี</p>
          </div>
        </div>
        <div className="pf-pass__status">
          <span className="pf-pass__status-icon"><Info size={16} aria-hidden="true" /></span>
          <span>ยังไม่เชื่อมข้อมูลพนักงานจริง</span>
          <span className="pf-pass__status-end">PREVIEW</span>
        </div>
      </section>

      <section className="pf-section" aria-labelledby="pf-shortcuts-title">
        <div className="pf-section__heading">
          <div>
            <span className="pf-section__eyebrow"><span aria-hidden="true" /> QUICK ACCESS</span>
            <h2 id="pf-shortcuts-title">เมนูของฉัน</h2>
          </div>
          <span className="pf-section__hint">เข้าถึงได้ทันที</span>
        </div>
        <div className="pf-links">
          <button className="pf-link" type="button" onClick={onHistory}>
            <span className="pf-link__icon pf-link__icon--history"><CalendarDays size={23} strokeWidth={1.85} aria-hidden="true" /></span>
            <span className="pf-link__body"><strong>ประวัติการทำงาน</strong><small>บันทึกเวลาเข้างานและออกงาน</small></span>
            <ChevronRight size={21} className="pf-link__arrow" aria-hidden="true" />
          </button>
          <button className="pf-link" type="button" onClick={onLeave}>
            <span className="pf-link__icon pf-link__icon--leave"><ClipboardList size={23} strokeWidth={1.85} aria-hidden="true" /></span>
            <span className="pf-link__body"><strong>การลาของฉัน</strong><small>ติดตามคำขอและผลการอนุมัติ</small></span>
            <ChevronRight size={21} className="pf-link__arrow" aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="pf-section pf-section--details" aria-labelledby="pf-details-title">
        <div className="pf-section__heading">
          <div>
            <span className="pf-section__eyebrow"><span aria-hidden="true" /> PERSONAL INFO</span>
            <h2 id="pf-details-title">ข้อมูลพนักงาน</h2>
          </div>
          <span className="pf-section__readonly"><LockKeyhole size={13} aria-hidden="true" /> ดูอย่างเดียว</span>
        </div>
        <div className="pf-fields">
          {employeeFields.map(({ key, label, Icon }) => (
            <div className="pf-field" key={key}>
              <span className="pf-field__label"><Icon size={16} strokeWidth={1.8} aria-hidden="true" />{label}</span>
              <strong>—</strong>
            </div>
          ))}
        </div>
        <p className="pf-fields-note"><Info size={14} aria-hidden="true" /> ข้อมูลส่วนนี้จะดึงจากโปรไฟล์บริษัทเมื่อเปิดใช้งานจริง</p>
      </section>

      <section className="pf-privacy" aria-label="ความเป็นส่วนตัวของข้อมูล">
        <button className="pf-privacy__trigger" type="button"
          aria-expanded={privacyOpen} aria-controls="pf-privacy-detail"
          onClick={() => setPrivacyOpen((value) => !value)}>
          <span className="pf-privacy__shield"><ShieldCheck size={21} strokeWidth={1.8} aria-hidden="true" /></span>
          <span className="pf-privacy__copy"><strong>ความเป็นส่วนตัว</strong><small>การใช้ข้อมูลและสิทธิ์เข้าถึง</small></span>
          <ChevronDown size={19} aria-hidden="true" className={'pf-privacy__chevron' + (privacyOpen ? ' pf-privacy__chevron--open' : '')} />
        </button>
        {privacyOpen && (
          <div className="pf-privacy__details" id="pf-privacy-detail">
            <p>เมื่อเชื่อมระบบจริง ข้อมูลพนักงานจะมาจากบัญชีบริษัท และการเข้าถึงจะถูกจำกัดตามสิทธิ์ของแต่ละคน</p>
            <p>ขณะนี้เป็นตัวอย่างดีไซน์ ยังไม่มีการอ่านหรือบันทึกข้อมูลส่วนบุคคลจริง</p>
          </div>
        )}
      </section>
      <p className="pf-footnote">Attendance V2 <span aria-hidden="true">·</span> เวอร์ชันทดลองดีไซน์</p>
    </main>
  );
}
