import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, CalendarCheck2, CalendarDays, CalendarRange, Check,
  ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Clock3,
  FilePenLine, HeartPulse, Info, MoreHorizontal, Paperclip,
  Palmtree, Plus, Send, X, GraduationCap, Shield, BookOpen,
  Baby, Stethoscope, Siren, UserRound,
} from 'lucide-react';
import './leave.css';

type LeaveType =
  | 'ลาพักร้อนประจำปี'
  | 'ลาป่วย'
  | 'ลาเพื่อฝึกอบรม/พัฒนาความรู้'
  | 'ลารับราชการทหาร'
  | 'ลาอุปสมบท'
  | 'ลาคลอด'
  | 'ลาเพื่อทำหมัน'
  | 'ลากิจโดยไม่รับค่าจ้าง'
  | 'ลาฉุกเฉิน'
  | 'อื่นๆ';
type LeaveStatus = 'pending' | 'approved' | 'rejected';
type LeaveFilter = 'all' | LeaveStatus;
type LeaveRequest = {
  id: string;
  type: LeaveType;
  start: string;
  end: string;
  reason: string;
  status: LeaveStatus;
};
type Modal = 'form' | 'detail' | null;
type DateField = 'start' | 'end' | null;

const demoRequests: LeaveRequest[] = [
  { id: 'demo-1', type: 'ลากิจโดยไม่รับค่าจ้าง', start: '2026-11-03', end: '2026-11-03', reason: 'ธุระส่วนตัว (ข้อมูลตัวอย่าง)', status: 'pending' },
  { id: 'demo-2', type: 'ลาป่วย', start: '2026-10-16', end: '2026-10-16', reason: 'พักรักษาตัว (ข้อมูลตัวอย่าง)', status: 'approved' },
  { id: 'demo-3', type: 'ลาพักร้อนประจำปี', start: '2026-09-22', end: '2026-09-23', reason: 'วันพักผ่อน (ข้อมูลตัวอย่าง)', status: 'rejected' },
];
// Original V1 leave categories and rules retained for the V2 design preview.
// Actual company holiday counting and real approval remain unconnected.
const leaveOptions = [
  { type: 'ลาพักร้อนประจำปี', detail: 'ยื่นล่วงหน้าอย่างน้อย 1 วัน', Icon: Palmtree, advance: true, noteRequired: false },
  { type: 'ลาป่วย', detail: 'ไม่ต้องยื่นล่วงหน้า', Icon: HeartPulse, advance: false, noteRequired: false },
  { type: 'ลาเพื่อฝึกอบรม/พัฒนาความรู้', detail: 'ยื่นล่วงหน้าอย่างน้อย 1 วัน', Icon: GraduationCap, advance: true, noteRequired: false },
  { type: 'ลารับราชการทหาร', detail: 'ยื่นล่วงหน้าอย่างน้อย 1 วัน', Icon: Shield, advance: true, noteRequired: false },
  { type: 'ลาอุปสมบท', detail: 'ยื่นล่วงหน้าอย่างน้อย 1 วัน', Icon: BookOpen, advance: true, noteRequired: false },
  { type: 'ลาคลอด', detail: 'ยื่นล่วงหน้าอย่างน้อย 1 วัน', Icon: Baby, advance: true, noteRequired: false },
  { type: 'ลาเพื่อทำหมัน', detail: 'ยื่นล่วงหน้าอย่างน้อย 1 วัน', Icon: Stethoscope, advance: true, noteRequired: false },
  { type: 'ลากิจโดยไม่รับค่าจ้าง', detail: 'ยื่นล่วงหน้าอย่างน้อย 1 วัน', Icon: ClipboardList, advance: true, noteRequired: false },
  { type: 'ลาฉุกเฉิน', detail: 'ไม่ต้องยื่นล่วงหน้า · ต้องระบุหมายเหตุ', Icon: Siren, advance: false, noteRequired: true },
  { type: 'อื่นๆ', detail: 'ไม่ต้องยื่นล่วงหน้า · ต้องระบุหมายเหตุ', Icon: MoreHorizontal, advance: false, noteRequired: true },
] as const;
const statusLabels: Record<LeaveStatus, string> = {
  pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ',
};
const filterOptions: { id: LeaveFilter; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'pending', label: 'รออนุมัติ' },
  { id: 'approved', label: 'อนุมัติแล้ว' },
  { id: 'rejected', label: 'ไม่อนุมัติ' },
];
const weekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;
const thaiDay = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});
const thaiMonth = new Intl.DateTimeFormat('th-TH', {
  month: 'long', year: 'numeric', timeZone: 'UTC',
});
function formatDate(iso: string) {
  return thaiDay.format(new Date(iso + 'T12:00:00Z'));
}
function formatRange(start: string, end: string) {
  return start === end ? formatDate(start) : formatDate(start) + ' – ' + formatDate(end);
}
function countCalendarDays(start: string, end: string) {
  const first = Date.parse(start + 'T12:00:00Z');
  const last = Date.parse(end + 'T12:00:00Z');
  return Number.isFinite(first) && Number.isFinite(last) && last >= first
    ? Math.round((last - first) / 86_400_000) + 1 : 0;
}
function bangkokToday(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return [part('year'), part('month'), part('day')].join('-');
}
function isoFromUtc(year: number, month: number, day: number) {
  return [year, String(month + 1).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
}
function modalFocusables(root: HTMLElement | null) {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(
    'button:not(:disabled), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
  )).filter((item) => item.getClientRects().length > 0);
}

export default function LeavePage({ now, onBack }: { now: Date; onBack: () => void }) {
  const today = bangkokToday(now);
  // Preview only: no employee identity, Firebase writes or real approvals.
  const [requests, setRequests] = useState<LeaveRequest[]>(demoRequests);
  const [filter, setFilter] = useState<LeaveFilter>('all');
  const [modal, setModal] = useState<Modal>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leaveType, setLeaveType] = useState<LeaveType>('ลาป่วย');
  const [typeOpen, setTypeOpen] = useState(false);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [dateField, setDateField] = useState<DateField>(null);
  const [pickerMonth, setPickerMonth] = useState(() => new Date(today + 'T12:00:00Z'));
  const [reason, setReason] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState(false);
  const previousFocus = useRef<HTMLElement | null>(null);
  const modalPanelRef = useRef<HTMLElement>(null);
  const modalCloseRef = useRef<HTMLButtonElement>(null);
  const pickerPanelRef = useRef<HTMLElement>(null);
  const pickerCloseRef = useRef<HTMLButtonElement>(null);
  const dateTriggerRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typeControlRef = useRef<HTMLDivElement>(null);

  const visibleRequests = requests.filter((request) => filter === 'all' || request.status === filter);
  const selectedRequest = requests.find((request) => request.id === selectedId);
  const countPending = requests.filter((request) => request.status === 'pending').length;
  const countApproved = requests.filter((request) => request.status === 'approved').length;
  const countRejected = requests.filter((request) => request.status === 'rejected').length;

  const openModal = (next: Modal, selected: string | null = null) => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedId(selected);
    setModal(next);
    setTypeOpen(false);
    setDateField(null);
    setFormError('');
  };
  const closeModal = () => {
    setDateField(null);
    setTypeOpen(false);
    setModal(null);
  };
  const openPicker = (field: Exclude<DateField, null>, trigger: HTMLButtonElement) => {
    dateTriggerRef.current = trigger;
    setTypeOpen(false);
    setPickerMonth(new Date((field === 'start' ? start : end) + 'T12:00:00Z'));
    setDateField(field);
  };
  const selectDate = (iso: string) => {
    if (dateField === 'start') {
      setStart(iso);
      if (end < iso) setEnd(iso);
    } else if (dateField === 'end') {
      setEnd(iso);
    }
    setDateField(null);
  };

  useEffect(() => {
    if (!modal) return;
    modalCloseRef.current?.focus();
    return () => { previousFocus.current?.focus(); };
  }, [modal]);

  useEffect(() => {
    if (!dateField) return;
    pickerCloseRef.current?.focus();
    return () => { dateTriggerRef.current?.focus(); };
  }, [dateField]);

  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (dateField) setDateField(null);
        else if (typeOpen) setTypeOpen(false);
        else closeModal();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusedPanel = dateField ? pickerPanelRef.current : modalPanelRef.current;
      const elements = modalFocusables(focusedPanel);
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modal, dateField, typeOpen]);

  useEffect(() => {
    if (!typeOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !typeControlRef.current?.contains(event.target)) {
        setTypeOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [typeOpen]);

  const submitPreview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!start || !end) {
      setFormError('กรุณาเลือกช่วงวันที่ลาให้ครบ');
      return;
    }
    if (end < start) {
      setFormError('วันที่สิ้นสุดต้องไม่อยู่ก่อนวันที่เริ่มลา');
      return;
    }
    const selectedRule = leaveOptions.find((option) => option.type === leaveType)!;
    if (selectedRule.noteRequired && !reason.trim()) {
      setFormError('การลาประเภทนี้ต้องระบุหมายเหตุ');
      return;
    }
    if (selectedRule.advance && start <= today) {
      setFormError('การลาประเภทนี้ต้องยื่นล่วงหน้าอย่างน้อย 1 วัน');
      return;
    }
    setRequests((current) => [{
      id: 'preview-' + Date.now(), type: leaveType,
      start, end, reason: reason.trim(), status: 'pending',
    }, ...current]);
    setFilter('all');
    setFeedback(true);
    setLeaveType('ลาป่วย');
    setStart(today);
    setEnd(today);
    setReason('');
    setAttachmentName('');
    setFormError('');
    closeModal();
  };

  const year = pickerMonth.getUTCFullYear();
  const month = pickerMonth.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const grid: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (grid.length % 7 !== 0) grid.push(null);
  const pickerValue = dateField === 'start' ? start : end;
  const selectedOption = leaveOptions.find((option) => option.type === leaveType)!;
  const SelectedTypeIcon = selectedOption.Icon;

  return (
    <main className="leave-page">
      <header className="leave-heading">
        <button className="leave-heading__back" type="button" onClick={onBack} aria-label="กลับหน้าหลัก">
          <ArrowLeft size={22} strokeWidth={1.9} aria-hidden="true" />
        </button>
        <span className="leave-heading__icon" aria-hidden="true"><FilePenLine size={23} strokeWidth={1.9} /></span>
        <div className="leave-heading__text">
          <h1>การลา</h1>
          <p>คำขอและสถานะการอนุมัติ</p>
        </div>
      </header>

      <section className="leave-hero" aria-label="จัดการคำขอลา">
        <div className="leave-hero__top">
          <span className="leave-hero__eyebrow"><CalendarCheck2 size={16} aria-hidden="true" /> LEAVE MANAGEMENT</span>
          <span className="leave-hero__graphic" aria-hidden="true"><CalendarRange size={31} strokeWidth={1.65} /></span>
        </div>
        <h2>จัดการวันลา<br />ได้ในที่เดียว</h2>
        <p>ส่งคำขอใหม่ และติดตามผลได้สะดวก</p>
        <button className="leave-hero__button" type="button" onClick={() => openModal('form')}>
          <Plus size={20} strokeWidth={2.25} aria-hidden="true" />
          ยื่นคำขอลา
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </section>

      <section className="leave-overview" aria-label="สรุปคำขอตัวอย่าง">
        <div><span className="leave-overview__dot leave-overview__dot--pending" /><strong>{countPending}</strong><small>รออนุมัติ</small></div>
        <div><span className="leave-overview__dot leave-overview__dot--approved" /><strong>{countApproved}</strong><small>อนุมัติแล้ว</small></div>
        <div><span className="leave-overview__dot leave-overview__dot--rejected" /><strong>{countRejected}</strong><small>ไม่อนุมัติ</small></div>
      </section>

      {feedback && (
        <div className="leave-feedback" role="status">
          <Check size={17} aria-hidden="true" />
          <span>เพิ่มคำขอทดลองแล้ว (ยังไม่ได้ส่งจริง)</span>
          <button type="button" onClick={() => setFeedback(false)} aria-label="ปิดข้อความ"><X size={16} /></button>
        </div>
      )}

      <section className="leave-records" aria-labelledby="leave-records-title">
        <div className="leave-section-heading">
          <div><h2 id="leave-records-title">คำขอลาของฉัน</h2><p>ตรวจสอบรายการและสถานะ</p></div>
          <span className="leave-count">{requests.length} รายการ</span>
        </div>
        <div className="leave-filters" role="group" aria-label="กรองสถานะคำขอ">
          {filterOptions.map((option) => (
            <button type="button" key={option.id}
              className={'leave-filter' + (filter === option.id ? ' leave-filter--active' : '')}
              aria-pressed={filter === option.id} onClick={() => setFilter(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
        <div className="leave-list">
          {visibleRequests.length ? visibleRequests.map((request) => (
            <button className="leave-request" key={request.id} type="button"
              onClick={() => openModal('detail', request.id)}
              aria-label={request.type + ' ' + formatRange(request.start, request.end) + ' ' + statusLabels[request.status]}>
              <span className="leave-request__icon" aria-hidden="true"><CalendarDays size={21} strokeWidth={1.8} /></span>
              <span className="leave-request__main">
                <strong>{request.type}</strong>
                <small>{formatRange(request.start, request.end)}</small>
              </span>
              <span className={'leave-status leave-status--' + request.status}>{statusLabels[request.status]}</span>
              <ChevronRight className="leave-request__arrow" size={17} aria-hidden="true" />
            </button>
          )) : (
            <div className="leave-empty">
              <ClipboardList size={29} strokeWidth={1.55} aria-hidden="true" />
              <strong>ยังไม่มีรายการในสถานะนี้</strong>
              <span>ลองเลือกสถานะอื่นเพื่อดูคำขอ</span>
            </div>
          )}
        </div>
      </section>
      <p className="leave-footnote"><Info size={14} aria-hidden="true" /> ข้อมูลบนหน้านี้เป็นตัวอย่าง ยังไม่เชื่อมระบบจริง</p>

      {modal && createPortal(
        <>
          <div className="leave-modal-overlay" onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}>
            <section ref={modalPanelRef} className="leave-modal"
              role="dialog" aria-modal="true" aria-labelledby="leave-modal-title">
              <div className="leave-modal__handle" aria-hidden="true" />
              <header className="leave-modal__head">
                <div>
                  <span>LEAVE REQUEST <i>•</i> ทดลองดีไซน์</span>
                  <h2 id="leave-modal-title">{modal === 'form' ? 'ยื่นคำขอลา' : 'รายละเอียดคำขอ'}</h2>
                  <p>{modal === 'form' ? 'กรอกข้อมูลให้ครบในหน้าเดียว' : 'ข้อมูลคำขอและสถานะปัจจุบัน'}</p>
                </div>
                <button ref={modalCloseRef} className="leave-modal__close" type="button" onClick={closeModal}
                  aria-label="ปิดหน้าต่าง"><X size={21} aria-hidden="true" /></button>
              </header>

              {modal === 'form' ? (
                <form className="leave-form" onSubmit={submitPreview}>
                  <section className="leave-employee" aria-label="ข้อมูลผู้ลา">
                    <div className="leave-employee__head">
                      <UserRound size={17} aria-hidden="true" />
                      <strong>ข้อมูลผู้ลา</strong>
                      <small>รอเชื่อมโปรไฟล์จริง</small>
                    </div>
                    <div className="leave-employee__grid">
                      <div><span>ชื่อ-นามสกุล</span><strong>—</strong></div>
                      <div><span>รหัสพนักงาน</span><strong>—</strong></div>
                      <div><span>แผนก</span><strong>—</strong></div>
                      <div><span>ตำแหน่ง</span><strong>—</strong></div>
                    </div>
                  </section>
                  <div className="leave-form__field leave-type-group" ref={typeControlRef}>
                    <span className="leave-form__label">ประเภทการลา <em>*</em></span>
                    <button type="button" className={'leave-control leave-control--select' + (typeOpen ? ' leave-control--expanded' : '')}
                      aria-haspopup="listbox" aria-expanded={typeOpen} aria-label={'ประเภทการลา ' + leaveType}
                      onClick={() => setTypeOpen((isOpen) => !isOpen)}>
                      <span className="leave-control__icon"><SelectedTypeIcon size={20} strokeWidth={1.8} aria-hidden="true" /></span>
                      <span className="leave-control__value">{leaveType}</span>
                      <ChevronDown size={19} className={'leave-control__chevron' + (typeOpen ? ' leave-control__chevron--up' : '')} aria-hidden="true" />
                    </button>
                    {typeOpen && (
                      <div className="leave-type-options" role="listbox" aria-label="เลือกประเภทการลา">
                        <div className="leave-type-options__heading">เลือกประเภทการลา <span>10 ประเภท</span></div>
                        {leaveOptions.map(({ type, detail, Icon }) => (
                          <button type="button" role="option" key={type}
                            aria-selected={leaveType === type}
                            className={'leave-type-option' + (leaveType === type ? ' leave-type-option--selected' : '')}
                            onClick={() => { setLeaveType(type); setTypeOpen(false); setFormError(''); }}>
                            <span className="leave-type-option__icon"><Icon size={19} strokeWidth={1.9} aria-hidden="true" /></span>
                            <span className="leave-type-option__text"><strong>{type}</strong><small>{detail}</small></span>
                            {leaveType === type && <Check size={19} strokeWidth={2.3} aria-hidden="true" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="leave-form__rule">
                    <Info size={15} aria-hidden="true" />
                    <span>{selectedOption.advance
                      ? 'ประเภทนี้ต้องยื่นล่วงหน้าอย่างน้อย 1 วัน'
                      : 'ประเภทนี้ไม่บังคับให้ยื่นล่วงหน้า'}</span>
                  </p>

                  <div className="leave-form__field">
                    <span className="leave-form__label">ช่วงวันที่ลา <em>*</em></span>
                    <div className="leave-date-row">
                      <button className="leave-control leave-date-trigger" type="button"
                        onClick={(event) => openPicker('start', event.currentTarget)} aria-label={'เลือกวันที่เริ่มลา ' + formatDate(start)}>
                        <span className="leave-date-trigger__caption">เริ่มต้น</span>
                        <span className="leave-date-trigger__value"><CalendarDays size={17} aria-hidden="true" />{formatDate(start)}</span>
                      </button>
                      <ChevronRight className="leave-date-row__arrow" size={18} aria-hidden="true" />
                      <button className="leave-control leave-date-trigger" type="button"
                        onClick={(event) => openPicker('end', event.currentTarget)} aria-label={'เลือกวันที่สิ้นสุด ' + formatDate(end)}>
                        <span className="leave-date-trigger__caption">สิ้นสุด</span>
                        <span className="leave-date-trigger__value"><CalendarDays size={17} aria-hidden="true" />{formatDate(end)}</span>
                      </button>
                    </div>
                    <p className="leave-form__duration">
                      <CalendarCheck2 size={15} aria-hidden="true" />
                      รวม {countCalendarDays(start, end)} วันตามช่วงวันที่
                      <small> (ยังไม่หักวันหยุด)</small>
                    </p>
                  </div>

                  <label className="leave-form__field">
                    <span className="leave-form__label">หมายเหตุ / เหตุผลการลา {selectedOption.noteRequired
                      ? <em>*</em>
                      : <small>(ไม่บังคับ)</small>}</span>
                    <textarea className="leave-reason" rows={3} maxLength={500} value={reason}
                      placeholder={selectedOption.noteRequired ? 'โปรดระบุหมายเหตุสำหรับการลาประเภทนี้...' : 'ระบุรายละเอียดเพิ่มเติม (ถ้ามี)...'}
                      required={selectedOption.noteRequired}
                      onChange={(event) => { setReason(event.target.value); setFormError(''); }} />
                    <small className="leave-form__characters">{reason.length}/500</small>
                  </label>

                  <div className="leave-form__field">
                    <span className="leave-form__label">เอกสารประกอบ <small>(ถ้ามี)</small></span>
                    <input className="leave-file-input" ref={fileInputRef} type="file" accept="image/*,.pdf"
                      onChange={(event) => setAttachmentName(event.currentTarget.files?.[0]?.name ?? '')}
                      tabIndex={-1} aria-label="ไฟล์เอกสารประกอบ" />
                    <div className="leave-attachment-row">
                      <button type="button" className="leave-attachment" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip size={19} strokeWidth={1.9} aria-hidden="true" />
                        <span>{attachmentName || 'เลือกไฟล์รูปภาพหรือ PDF'}</span>
                        <Plus size={17} strokeWidth={2} aria-hidden="true" />
                      </button>
                      {attachmentName && <button type="button" className="leave-attachment__remove" aria-label="ลบไฟล์ที่เลือก"
                        onClick={() => { setAttachmentName(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                        <X size={17} aria-hidden="true" />
                      </button>}
                    </div>
                  </div>
                  {formError && <p className="leave-form__error" role="alert">{formError}</p>}
                  <p className="leave-form__hint"><Info size={14} aria-hidden="true" /> แบบทดลองเท่านั้น จำนวนวันยังไม่ตรวจสอบวันหยุด และไม่มีการส่งข้อมูลจริง</p>
                  <button type="submit" className="leave-modal__primary"><Send size={18} aria-hidden="true" /> ทดลองส่งคำขอ</button>
                </form>
              ) : selectedRequest ? (
                <div className="leave-detail">
                  <div className="leave-detail__banner">
                    <span className="leave-detail__banner-icon"><CalendarCheck2 size={24} aria-hidden="true" /></span>
                    <div><span>ประเภทการลา</span><strong>{selectedRequest.type}</strong></div>
                    <span className={'leave-status leave-status--' + selectedRequest.status}>{statusLabels[selectedRequest.status]}</span>
                  </div>
                  <div className="leave-detail__row">
                    <CalendarDays size={19} aria-hidden="true" />
                    <div><small>ช่วงวันที่ลา</small><strong>{formatRange(selectedRequest.start, selectedRequest.end)}</strong></div>
                  </div>
                  <div className="leave-detail__row">
                    <Clock3 size={19} aria-hidden="true" />
                    <div><small>สถานะคำขอ</small><strong>{statusLabels[selectedRequest.status]} (ข้อมูลตัวอย่าง)</strong></div>
                  </div>
                  <div className="leave-detail__note">
                    <span>หมายเหตุ / เหตุผลการลา</span><p>{selectedRequest.reason || 'ไม่ได้ระบุหมายเหตุ'}</p>
                  </div>
                  <p className="leave-form__hint"><Info size={14} aria-hidden="true" /> ยังไม่ใช่ข้อมูลการอนุมัติจริงจากบริษัท</p>
                  <button className="leave-modal__primary" type="button" onClick={closeModal}>ปิดรายละเอียด</button>
                </div>
              ) : null}
            </section>
          </div>

          {dateField && (
            <div className="leave-picker-overlay" onMouseDown={(event) => {
              if (event.target === event.currentTarget) setDateField(null);
            }}>
              <section className="leave-picker" ref={pickerPanelRef} role="dialog" aria-modal="true"
                aria-labelledby="leave-picker-title">
                <div className="leave-picker__handle" aria-hidden="true" />
                <header className="leave-picker__head">
                  <div><span>เลือกวันจากปฏิทิน</span>
                    <h3 id="leave-picker-title">{dateField === 'start' ? 'วันที่เริ่มลา' : 'วันที่สิ้นสุด'}</h3>
                  </div>
                  <button ref={pickerCloseRef} type="button" className="leave-picker__close"
                    onClick={() => setDateField(null)} aria-label="ปิดปฏิทินเลือกวัน"><X size={21} aria-hidden="true" /></button>
                </header>
                <div className="leave-picker__month">
                  <button type="button" onClick={() => setPickerMonth(new Date(Date.UTC(year, month - 1, 1)))}
                    aria-label="เดือนก่อนหน้า"><ChevronLeft size={21} aria-hidden="true" /></button>
                  <strong>{thaiMonth.format(pickerMonth)}</strong>
                  <button type="button" onClick={() => setPickerMonth(new Date(Date.UTC(year, month + 1, 1)))}
                    aria-label="เดือนถัดไป"><ChevronRight size={21} aria-hidden="true" /></button>
                </div>
                <div className="leave-picker__weekdays" aria-hidden="true">
                  {weekdays.map((name) => <span key={name}>{name}</span>)}
                </div>
                <div className="leave-picker__grid" role="group" aria-label="เลือกวันที่">
                  {grid.map((day, index) => {
                    if (day === null) return <span key={'empty-' + index} aria-hidden="true" />;
                    const iso = isoFromUtc(year, month, day);
                    const isSelected = iso === pickerValue;
                    const isToday = iso === today;
                    const disabled = dateField === 'end' && iso < start;
                    return (
                      <button type="button" key={iso} disabled={disabled}
                        className={'leave-picker__day' + (isSelected ? ' leave-picker__day--selected' : '') + (isToday ? ' leave-picker__day--today' : '')}
                        aria-pressed={isSelected}
                        aria-label={formatDate(iso) + (disabled ? ' เลือกไม่ได้' : '')}
                        onClick={() => selectDate(iso)}>{day}</button>
                    );
                  })}
                </div>
                <div className="leave-picker__footer">
                  <button type="button" onClick={() => {
                    const target = dateField === 'end' && today < start ? start : today;
                    setPickerMonth(new Date(target + 'T12:00:00Z'));
                    selectDate(target);
                  }}>เลือกวันนี้</button>
                  <span>พ.ศ. {year + 543}</span>
                </div>
              </section>
            </div>
          )}
        </>,
        document.querySelector('.app-shell') ?? document.body,
      )}
    </main>
  );
}
