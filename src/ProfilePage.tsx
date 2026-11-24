import type { User } from 'firebase/auth';
import { scheduleTypeLabels, type EmployeeRecord } from './employeeData';
import {
  ArrowLeft, CalendarDays, ChevronRight, ClipboardList,
  ContactRound, Info, LogIn, LogOut, ShieldCheck, UserRound,
} from 'lucide-react';
import './profile.css';

type ProfilePageProps = {
  onBack: () => void;
  onHistory: () => void;
  onLeave: () => void;
  authUser: User | null;
  authReady: boolean;
  authBusy: boolean;
  authError: string | null;
  employee: EmployeeRecord | null;
  employeeLoading: boolean;
  employeeError: string | null;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
};

/**
 * Employee profile design preview.
 * Identity / role values intentionally remain empty until Firebase Auth
 * and the actual employee record are connected. No invented personal data.
 */
export default function ProfilePage({
  onBack, onHistory, onLeave,
  authUser, authReady, authBusy, authError, employee, employeeLoading, employeeError,
  onGoogleSignIn, onGoogleSignOut,
}: ProfilePageProps) {
  const employeeName = employee
    ? [employee.firstName, employee.lastName].filter(Boolean).join(' ')
    : '';
  const startDate = /^\\d{4}-\\d{2}-\\d{2}$/.test(employee?.startDate ?? '')
    ? (employee?.startDate ?? '').split('-').reverse().join('/')
    : '—';
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
          <span className="profile-hero__hint">Google Authentication</span>
        </div>
        <div className="profile-hero__body">
          <span className="profile-hero__avatar" aria-hidden="true">
            <UserRound size={39} strokeWidth={1.55} />
          </span>
          <div className="profile-hero__identity">
            <h2>{employeeName || authUser?.displayName || 'ข้อมูลพนักงาน'}</h2>
            <p>{authUser?.email || 'เข้าสู่ระบบด้วย Google เพื่อยืนยันตัวตน'}</p>
          </div>
        </div>
        <div className="profile-hero__status">
          <span className="profile-hero__status-dot" aria-hidden="true" />
          {!authReady ? 'กำลังตรวจสอบบัญชี Google'
            : !authUser ? 'ยังไม่ได้เข้าสู่ระบบ'
              : employeeLoading ? 'กำลังโหลดข้อมูลพนักงาน'
                : employeeError ? 'อ่านข้อมูลพนักงานไม่สำเร็จ'
                  : employee ? 'ผูกข้อมูลพนักงานแล้ว · ' + (employee.status === 'active' ? 'เปิดใช้งาน' : 'ยังไม่เปิดใช้งาน')
                    : 'ยืนยันตัวตนแล้ว · ยังไม่มีข้อมูลพนักงาน'}
        </div>
      </section>

      <section className="profile-google-auth" aria-label="เชื่อมบัญชี Google">
        <button type="button" className="profile-google-auth__button"
          onClick={authUser ? onGoogleSignOut : onGoogleSignIn}
          disabled={!authReady || authBusy}>
          {authUser ? <LogOut size={19} aria-hidden="true" /> : <LogIn size={19} aria-hidden="true" />}
          {authBusy ? 'กำลังดำเนินการ...' : authUser ? 'ออกจากระบบ Google' : 'เข้าสู่ระบบด้วย Google'}
        </button>
        <p>{authUser
          ? employee ? 'อ่านโปรไฟล์พนักงานจาก Firebase แล้ว · ระบบตอกบัตรยังไม่เปิดใช้งานจริง'
            : 'เข้าสู่ระบบ Google แล้ว แต่ยังไม่พบข้อมูลพนักงานที่ผูกกับบัญชีนี้'
          : 'เข้าสู่ระบบด้วย Google เพื่อดูข้อมูลพนักงานและตารางงานของตัวเอง'}</p>
        {employeeError && <p className="profile-google-auth__error" role="alert">{employeeError}</p>}
        {authError && <p className="profile-google-auth__error" role="alert">{authError}</p>}
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
            <span>ชื่อ-นามสกุล</span><strong>{employeeName || '—'}</strong>
          </div>
          <div className="profile-details__row">
            <span>รหัสพนักงาน</span><strong>{employee?.code || '—'}</strong>
          </div>
          <div className="profile-details__row">
            <span>แผนก</span><strong>{employee?.department || '—'}</strong>
          </div>
          <div className="profile-details__row">
            <span>ตำแหน่ง</span><strong>{employee?.position || '—'}</strong>
          </div>
          <div className="profile-details__row">
            <span>ชื่อเล่น</span><strong>{employee?.nickname || '—'}</strong>
          </div>
          <div className="profile-details__row">
            <span>วันที่เริ่มงาน</span><strong>{startDate}</strong>
          </div>
          <div className="profile-details__row">
            <span>ตารางงาน</span><strong>{employee ? scheduleTypeLabels[employee.scheduleType] : '—'}</strong>
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
        <Info size={14} aria-hidden="true" /> ข้อมูลพนักงานดึงจาก Firebase เฉพาะบัญชีที่ผูกไว้ · การลงเวลายังอยู่ระหว่างพัฒนา
      </p>
    </main>
  );
}
