import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, ArrowRight, CalendarCheck2, CalendarDays, Check,
  ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Clock3,
  HeartPulse, Info, MoreHorizontal, Paperclip, UserRound,
  Palmtree, Plus, Send, X, GraduationCap, Shield, BookOpen,
  Baby, Stethoscope, Siren,
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
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<string | null>(null);
  const [draftEnd, setDraftEnd] = useState<string | null>(null);
  const [pickerMonth, setPickerMonth] = useState(() => new Date(today + 'T12:00:00Z'));
  const [confirmOpen, setConfirmOpen] = useState(false);
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
  const typeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const typePanelRef = useRef<HTMLElement>(null);
  const typeCloseRef = useRef<HTMLButtonElement>(null);
  const confirmPanelRef = useRef<HTMLElement>(null);
  const confirmCloseRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleRequests = requests.filter((request) => filter === 'all' || request.status === filter);
  const selectedRequest = requests.find((request) => request.id === selectedId);
  const countPending = requests.filter((request) => request.status === 'pending').length;
  const countApproved = requests.filter((request) => request.status === 'approved').length;
  const countRejected = requests.filter((request) => request.status === 'rejected').length;
  const selectedRule = leaveOptions.find((option) => option.type === leaveType)!;
  const SelectedTypeIcon = selectedRule.Icon;
  const validateLeaveRequest = () => {
    if (!start || !end || end < start) {
      setFormError('กรุณาเลือกช่วงวันที่ลาให้ถูกต้อง');
      return false;
    }
    if (selectedRule.advance && start <= today) {
      setFormError('การลาประเภทนี้ต้องยื่นล่วงหน้าอย่างน้อย 1 วัน');
      return false;
    }
    if (selectedRule.noteRequired && !reason.trim()) {
      setFormError('การลาประเภทนี้ต้องระบุเหตุผล');
      return false;
    }
    setFormError('');
    return true;
  };

  const openModal = (next: Modal, selected: string | null = null) => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedId(selected);
    setModal(next);
    setTypeOpen(false);
    setDatePickerOpen(false);
    setConfirmOpen(false);
    setFormError('');
  };
  const closeModal = () => {
    setConfirmOpen(false);
    setDatePickerOpen(false);
    setTypeOpen(false);
    setModal(null);
  };
  const openTypePicker = (trigger: HTMLButtonElement) => {
    typeTriggerRef.current = trigger;
    setTypeOpen(true);
  };
  const openRangePicker = (trigger: HTMLButtonElement) => {
    dateTriggerRef.current = trigger;
    setTypeOpen(false);
    setDraftStart(null);
    setDraftEnd(null);
    setPickerMonth(new Date(start + 'T12:00:00Z'));
    setDatePickerOpen(true);
  };
  const selectRangeDate = (iso: string) => {
    if (!draftStart || draftEnd || iso < draftStart) {
      setDraftStart(iso);
      setDraftEnd(null);
    } else {
      setDraftEnd(iso);
    }
  };
  const acceptRange = () => {
    if (!draftStart || !draftEnd) return;
    setStart(draftStart);
    setEnd(draftEnd);
    setFormError('');
    setDatePickerOpen(false);
  };

  useEffect(() => {
    if (!modal) return;
    modalCloseRef.current?.focus();
    return () => { previousFocus.current?.focus(); };
  }, [modal]);

  useEffect(() => {
    if (!datePickerOpen) return;
    pickerCloseRef.current?.focus();
    return () => { dateTriggerRef.current?.focus(); };
  }, [datePickerOpen]);

  useEffect(() => {
    if (!typeOpen) return;
    typeCloseRef.current?.focus();
    return () => { typeTriggerRef.current?.focus(); };
  }, [typeOpen]);

  useEffect(() => {
    if (!confirmOpen) return;
    confirmCloseRef.current?.focus();
  }, [confirmOpen]);

  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (confirmOpen) setConfirmOpen(false);
        else if (datePickerOpen) setDatePickerOpen(false);
        else if (typeOpen) setTypeOpen(false);
        else closeModal();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusedPanel = confirmOpen
        ? confirmPanelRef.current
        : datePickerOpen
          ? pickerPanelRef.current
          : typeOpen
            ? typePanelRef.current
            : modalPanelRef.current;
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
  }, [modal, datePickerOpen, typeOpen, confirmOpen]);

  const submitPreview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (validateLeaveRequest()) setConfirmOpen(true);
  };

  const confirmPreview = () => {
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
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  return (
    <main className="leave-page">
      <header className="leave-heading">
        <button className="leave-heading__back" type="button" onClick={onBack} aria-label="กลับหน้าหลัก">
          <ArrowLeft size={22} strokeWidth={1.9} aria-hidden="true" />
        </button>
        <div className="leave-heading__text">
          <h1>การลา</h1>
          <p>จัดการคำขอและติดตามสถานะ</p>
        </div>
        <span className="leave-heading__preview">ตัวอย่าง</span>
      </header>

      <button className="leave-new-request" type="button" onClick={() => openModal('form')}>
        <Plus size={21} strokeWidth={2.2} aria-hidden="true" /> ยื่นคำขอลาใหม่
        <ArrowRight size={19} aria-hidden="true" />
      </button>
      <section className="leave-overview" aria-label="สรุปจำนวนคำขอทดลอง ไม่ใช่ยอดวันลาคงเหลือ">
        <div className="leave-overview__item leave-overview__item--pending">
          <span className="leave-overview__mini"><Clock3 size={17} aria-hidden="true" /> รออนุมัติ</span>
          <strong>{countPending}<small> รายการ</small></strong>
        </div>
        <div className="leave-overview__item leave-overview__item--approved">
          <span className="leave-overview__mini"><Check size={17} aria-hidden="true" /> อนุมัติแล้ว</span>
          <strong>{countApproved}<small> รายการ</small></strong>
        </div>
        <div className="leave-overview__item leave-overview__item--rejected">
          <span className="leave-overview__mini"><X size={17} aria-hidden="true" /> ไม่อนุมัติ</span>
          <strong>{countRejected}<small> รายการ</small></strong>
        </div>
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
          <div><h2 id="leave-records-title">รายการคำขอ</h2><p>ข้อมูลจำลองสำหรับทดลองหน้าจอ</p></div>
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
              <span className={'leave-request__icon leave-request__icon--' + request.status} aria-hidden="true">
                {(() => { const Icon = leaveOptions.find((option) => option.type === request.type)!.Icon; return <Icon size={23} strokeWidth={1.9} />; })()}
              </span>
              <span className="leave-request__main">
                <strong>{request.type}</strong>
                <small>{formatRange(request.start, request.end)} · {countCalendarDays(request.start, request.end)} วันตามปฏิทิน</small>
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
                  <p>{modal === 'form' ? 'กรอกข้อมูลในหน้าเดียว ตรวจสอบก่อนยืนยัน' : 'ข้อมูลคำขอและสถานะปัจจุบัน'}</p>
                </div>
                <button ref={modalCloseRef} className="leave-modal__close" type="button" onClick={closeModal}
                  aria-label="ปิดหน้าต่าง"><X size={21} aria-hidden="true" /></button>
              </header>

              {modal === 'form' ? (
                <form className="leave-form leave-form--single" onSubmit={submitPreview}>
                  <section className="leave-employee leave-employee--compact" aria-label="ข้อมูลผู้ยื่นลา">
                    <span className="leave-employee__badge"><UserRound size={19} aria-hidden="true" /></span>
                    <div className="leave-employee__identity">
                      <strong>ข้อมูลผู้ยื่นลา</strong>
                      <span>จะแสดงชื่อและข้อมูลพนักงานเมื่อเชื่อมโปรไฟล์</span>
                    </div>
                    <span className="leave-employee__pending">ทดลอง</span>
                  </section>

                  <div className="leave-form__field leave-type-group">
                    <span className="leave-form__label">ประเภทการลา <em>*</em></span>
                    <button type="button" className="leave-control leave-control--select"
                      aria-haspopup="dialog" aria-expanded={typeOpen}
                      aria-label={'เลือกประเภทการลา ปัจจุบัน ' + leaveType}
                      onClick={(event) => openTypePicker(event.currentTarget)}>
                      <span className="leave-control__icon"><SelectedTypeIcon size={20} strokeWidth={1.85} aria-hidden="true" /></span>
                      <span className="leave-control__value">{leaveType}</span>
                      <ChevronDown size={19} className="leave-control__chevron" aria-hidden="true" />
                    </button>
                    <p className="leave-form__rule">
                      <Info size={15} aria-hidden="true" />
                      <span>{selectedRule.advance
                        ? 'ต้องยื่นล่วงหน้าอย่างน้อย 1 วัน'
                        : 'ไม่บังคับให้ยื่นล่วงหน้า'}
                        {selectedRule.noteRequired ? ' · ต้องระบุเหตุผล' : ''}</span>
                    </p>
                  </div>

                  <div className="leave-form__field">
                    <span className="leave-form__label">ช่วงวันที่ลา <em>*</em></span>
                    <div className="leave-date-row">
                      <button className="leave-control leave-date-trigger" type="button"
                        onClick={(event) => openRangePicker(event.currentTarget)}
                        aria-label={'เลือกช่วงวันที่ลา เริ่มวันที่ ' + formatDate(start)}>
                        <span className="leave-date-trigger__caption">เริ่มต้น</span>
                        <span className="leave-date-trigger__value"><CalendarDays size={17} aria-hidden="true" />{formatDate(start)}</span>
                      </button>
                      <ChevronRight size={18} className="leave-date-row__arrow" aria-hidden="true" />
                      <button className="leave-control leave-date-trigger" type="button"
                        onClick={(event) => openRangePicker(event.currentTarget)}
                        aria-label={'เลือกช่วงวันที่ลา สิ้นสุดวันที่ ' + formatDate(end)}>
                        <span className="leave-date-trigger__caption">สิ้นสุด</span>
                        <span className="leave-date-trigger__value"><CalendarDays size={17} aria-hidden="true" />{formatDate(end)}</span>
                      </button>
                    </div>
                    <div className="leave-date-total">
                      <CalendarCheck2 size={22} aria-hidden="true" />
                      <span>จำนวนวันตามปฏิทิน<strong>{countCalendarDays(start, end)} วัน</strong></span>
                      <small>ยังไม่หักวันหยุด</small>
                    </div>
                  </div>

                  <label className="leave-form__field">
                    <span className="leave-form__label">{leaveType === 'ลาป่วย' ? 'อาการ / เหตุผลการลา' : 'เหตุผลการลา'}
                      {selectedRule.noteRequired ? <em> *</em> : <small> (ไม่บังคับ)</small>}</span>
                    <textarea className="leave-reason" rows={3} maxLength={500} value={reason}
                      placeholder={leaveType === 'ลาป่วย'
                        ? 'ระบุอาการหรือรายละเอียดเพิ่มเติม (ถ้ามี)'
                        : selectedRule.noteRequired ? 'โปรดระบุเหตุผลที่จำเป็น' : 'ระบุเหตุผลหรือรายละเอียดเพิ่มเติม (ถ้ามี)'}
                      required={selectedRule.noteRequired}
                      onChange={(event) => { setReason(event.target.value); setFormError(''); }} />
                    <small className="leave-form__characters">{reason.length}/500</small>
                  </label>

                  <div className="leave-form__field">
                    <span className="leave-form__label">
                      {leaveType === 'ลาป่วย' ? 'ใบรับรองแพทย์' :
                        leaveType === 'ลาเพื่อฝึกอบรม/พัฒนาความรู้' ? 'เอกสารการอบรม' : 'เอกสารประกอบ'}
                      <small> (ถ้ามี)</small>
                    </span>
                    <input className="leave-file-input" ref={fileInputRef} type="file" accept="image/*,.pdf"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file && file.size > 10 * 1024 * 1024) {
                          setFormError('ไฟล์มีขนาดเกิน 10 MB กรุณาเลือกไฟล์ใหม่');
                          setAttachmentName('');
                          event.currentTarget.value = '';
                          return;
                        }
                        setAttachmentName(file?.name ?? '');
                        setFormError('');
                      }}
                      tabIndex={-1} aria-label="เลือกไฟล์เอกสารประกอบ" />
                    <div className="leave-attachment-row">
                      <button type="button" className="leave-attachment" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip size={19} strokeWidth={1.9} aria-hidden="true" />
                        <span>{attachmentName || 'เลือกไฟล์รูปภาพหรือ PDF (ไม่เกิน 10 MB)'}</span>
                        <Plus size={17} strokeWidth={2} aria-hidden="true" />
                      </button>
                      {attachmentName && (
                        <button className="leave-attachment__remove" type="button" aria-label="ลบไฟล์ที่เลือก"
                          onClick={() => {
                            setAttachmentName('');
                            setFormError('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}>
                          <X size={17} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  {formError && <p className="leave-form__error" role="alert">{formError}</p>}
                  <p className="leave-form__hint"><Info size={14} aria-hidden="true" />
                    แบบทดลองเท่านั้น ยังไม่บันทึกข้อมูลหรือส่งคำขอจริง</p>
                  <button type="submit" className="leave-modal__primary">
                    <Check size={18} aria-hidden="true" /> ตรวจสอบก่อนส่ง
                  </button>
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

          {typeOpen && (
            <div className="leave-type-overlay" onMouseDown={(event) => {
              if (event.target === event.currentTarget) setTypeOpen(false);
            }}>
              <section className="leave-type-sheet" ref={typePanelRef}
                role="dialog" aria-modal="true" aria-labelledby="leave-type-title">
                <div className="leave-picker__handle" aria-hidden="true" />
                <header className="leave-picker__head">
                  <div><span>มีทั้งหมด 10 ประเภท</span><h3 id="leave-type-title">เลือกประเภทการลา</h3></div>
                  <button type="button" ref={typeCloseRef} className="leave-picker__close"
                    onClick={() => setTypeOpen(false)} aria-label="ปิดตัวเลือกประเภทการลา">
                    <X size={21} aria-hidden="true" />
                  </button>
                </header>
                <div className="leave-type-options" role="group" aria-label="ประเภทการลา">
                  {leaveOptions.map(({ type, detail, Icon }) => (
                    <button type="button" key={type} aria-pressed={leaveType === type}
                      className={'leave-type-option' + (leaveType === type ? ' leave-type-option--selected' : '')}
                      onClick={() => { setLeaveType(type); setTypeOpen(false); setFormError(''); }}>
                      <span className="leave-type-option__icon"><Icon size={19} strokeWidth={1.9} aria-hidden="true" /></span>
                      <span className="leave-type-option__text"><strong>{type}</strong><small>{detail}</small></span>
                      {leaveType === type && <Check size={19} strokeWidth={2.3} aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {datePickerOpen && (
            <div className="leave-picker-overlay" onMouseDown={(event) => {
              if (event.target === event.currentTarget) setDatePickerOpen(false);
            }}>
              <section className="leave-picker" ref={pickerPanelRef} role="dialog" aria-modal="true"
                aria-labelledby="leave-picker-title">
                <div className="leave-picker__handle" aria-hidden="true" />
                <header className="leave-picker__head">
                  <div><span>เลือกในปฏิทินเดียว</span>
                    <h3 id="leave-picker-title">เลือกช่วงวันที่ลา</h3>
                  </div>
                  <button ref={pickerCloseRef} type="button" className="leave-picker__close"
                    onClick={() => setDatePickerOpen(false)} aria-label="ปิดปฏิทินเลือกวัน"><X size={21} aria-hidden="true" /></button>
                </header>
                <div className="leave-picker__range-hint" role="status">
                  <span className={draftStart ? 'is-picked' : ''}>
                    <small>วันเริ่มลา</small><strong>{draftStart ? formatDate(draftStart) : 'แตะเลือกวันแรก'}</strong>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                  <span className={draftEnd ? 'is-picked' : ''}>
                    <small>วันสิ้นสุด</small><strong>{draftEnd ? formatDate(draftEnd) : 'แตะเลือกวันสุดท้าย'}</strong>
                  </span>
                </div>
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
                <div className="leave-picker__grid" role="group" aria-label="เลือกวันเริ่มลา แล้วเลือกวันสิ้นสุด">
                  {grid.map((day, index) => {
                    if (day === null) return <span key={'empty-' + index} aria-hidden="true" />;
                    const iso = isoFromUtc(year, month, day);
                    const inRange = draftStart && draftEnd && iso > draftStart && iso < draftEnd;
                    const boundary = iso === draftStart || iso === draftEnd;
                    const isToday = iso === today;
                    return (
                      <button type="button" key={iso}
                        className={'leave-picker__day'
                          + (boundary ? ' leave-picker__day--selected' : '')
                          + (inRange ? ' leave-picker__day--range' : '')
                          + (isToday ? ' leave-picker__day--today' : '')}
                        aria-pressed={Boolean(boundary || inRange)}
                        aria-label={formatDate(iso) + (boundary ? ' วันที่เลือก' : '')}
                        onClick={() => selectRangeDate(iso)}>{day}</button>
                    );
                  })}
                </div>
                <div className="leave-picker__footer">
                  <button type="button" onClick={() => {
                    setPickerMonth(new Date(today + 'T12:00:00Z'));
                    setDraftStart(today);
                    setDraftEnd(today);
                  }}>เลือกวันเดียว (วันนี้)</button>
                  <span>{draftStart && draftEnd ? countCalendarDays(draftStart, draftEnd) + ' วัน (ยังไม่หักวันหยุด)' : 'พ.ศ. ' + (year + 543)}</span>
                </div>
                <button className="leave-modal__primary leave-picker__apply" type="button"
                  disabled={!draftStart || !draftEnd} onClick={acceptRange}>
                  <Check size={18} aria-hidden="true" /> ใช้ช่วงวันที่นี้
                </button>
              </section>
            </div>
          )}

          {confirmOpen && (
            <div className="leave-confirm-overlay" onMouseDown={(event) => {
              if (event.target === event.currentTarget) setConfirmOpen(false);
            }}>
              <section ref={confirmPanelRef} className="leave-confirm-sheet"
                role="dialog" aria-modal="true" aria-labelledby="leave-confirm-title">
                <div className="leave-picker__handle" aria-hidden="true" />
                <header className="leave-picker__head">
                  <div><span>ตรวจข้อมูลก่อนยืนยัน</span><h3 id="leave-confirm-title">สรุปคำขอลา</h3></div>
                  <button type="button" ref={confirmCloseRef} className="leave-picker__close"
                    onClick={() => setConfirmOpen(false)} aria-label="ปิดหน้ายืนยัน"><X size={21} aria-hidden="true" /></button>
                </header>
                <div className="leave-confirm__summary">
                  <div><span>ประเภทการลา</span><strong>{leaveType}</strong></div>
                  <div><span>วันที่ลา</span><strong>{formatRange(start, end)}</strong></div>
                  <div><span>ระยะเวลา</span><strong>{countCalendarDays(start, end)} วันตามปฏิทิน (ยังไม่หักวันหยุด)</strong></div>
                  <div><span>เหตุผลการลา</span><strong>{reason.trim() || 'ไม่ได้ระบุ'}</strong></div>
                  <div><span>ไฟล์ที่เลือก (ยังไม่อัปโหลด)</span><strong>{attachmentName || 'ไม่ได้เลือกไฟล์'}</strong></div>
                </div>
                <p className="leave-form__hint leave-confirm__notice"><Info size={15} aria-hidden="true" />
                  นี่เป็นโหมดทดลอง ยืนยันแล้วจะแสดงคำขอจำลองเท่านั้น ไม่ส่งถึงแอดมิน
                </p>
                <div className="leave-confirm__actions">
                  <button type="button" className="leave-confirm__edit" onClick={() => setConfirmOpen(false)}>กลับไปแก้ไข</button>
                  <button type="button" className="leave-modal__primary" onClick={confirmPreview}>
                    <Send size={18} aria-hidden="true" /> ยืนยันคำขอทดลอง
                  </button>
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
