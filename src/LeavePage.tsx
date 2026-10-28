import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, CalendarDays, ChevronRight, Clock3, FilePenLine,
  Info, Paperclip, Plus, Send, X,
} from 'lucide-react';
import './leave.css';

type LeaveType = 'ลาป่วย' | 'ลากิจ' | 'ลาพักร้อน' | 'อื่น ๆ';
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

const sampleRequests: LeaveRequest[] = [
  { id: 'demo-1', type: 'ลากิจ', start: '2026-11-03', end: '2026-11-03', reason: 'ธุระส่วนตัว (ข้อมูลตัวอย่าง)', status: 'pending' },
  { id: 'demo-2', type: 'ลาป่วย', start: '2026-10-16', end: '2026-10-16', reason: 'พักรักษาตัว (ข้อมูลตัวอย่าง)', status: 'approved' },
  { id: 'demo-3', type: 'ลาพักร้อน', start: '2026-09-22', end: '2026-09-23', reason: 'วันพักผ่อน (ข้อมูลตัวอย่าง)', status: 'rejected' },
];
const leaveTypes: LeaveType[] = ['ลาป่วย', 'ลากิจ', 'ลาพักร้อน', 'อื่น ๆ'];
const statusLabels: Record<LeaveStatus, string> = {
  pending: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
};
const filterOptions: { id: LeaveFilter; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'pending', label: 'รออนุมัติ' },
  { id: 'approved', label: 'อนุมัติแล้ว' },
  { id: 'rejected', label: 'ไม่อนุมัติ' },
];
const thaiDay = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});
function formatDate(iso: string): string {
  return thaiDay.format(new Date(iso + 'T12:00:00Z'));
}
function formatRange(start: string, end: string): string {
  return start === end ? formatDate(start) : formatDate(start) + ' – ' + formatDate(end);
}
function bangkokToday(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return [part('year'), part('month'), part('day')].join('-');
}

export default function LeavePage({ now, onBack }: { now: Date; onBack: () => void }) {
  const today = bangkokToday(now);
  const [requests, setRequests] = useState<LeaveRequest[]>(sampleRequests);
  const [filter, setFilter] = useState<LeaveFilter>('all');
  const [modal, setModal] = useState<Modal>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leaveType, setLeaveType] = useState<LeaveType>('ลากิจ');
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [reason, setReason] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState(false);
  const firstModalButton = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const modalPanelRef = useRef<HTMLElement>(null);

  const visibleRequests = requests.filter((request) => filter === 'all' || request.status === filter);
  const selectedRequest = requests.find((request) => request.id === selectedId);

  const openModal = (next: Modal, selected: string | null = null) => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedId(selected);
    setModal(next);
    setFormError('');
  };
  const closeModal = () => setModal(null);

  useEffect(() => {
    if (!modal) return;
    firstModalButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setModal(null);
      }
      if (event.key !== 'Tab' || !modalPanelRef.current) return;
      const focusable = Array.from(modalPanelRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)',
      )).filter((item) => item.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus.current?.focus();
    };
  }, [modal]);

  const submitPreview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!start || !end || !reason.trim()) {
      setFormError('กรุณากรอกวันที่ลาและเหตุผลให้ครบ');
      return;
    }
    if (end < start) {
      setFormError('วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น');
      return;
    }
    setRequests((current) => [{
      id: 'preview-' + Date.now(),
      type: leaveType,
      start,
      end,
      reason: reason.trim(),
      status: 'pending',
    }, ...current]);
    setFilter('all');
    setFeedback(true);
    setReason('');
    setLeaveType('ลากิจ');
    setStart(today);
    setEnd(today);
    setAttachmentName('');
    setFormError('');
    closeModal();
  };

  return (
    <main className="leave-page">
      <header className="leave-heading">
        <button className="leave-heading__back" type="button" onClick={onBack} aria-label="กลับหน้าหลัก">
          <ArrowLeft size={23} strokeWidth={1.9} />
        </button>
        <span className="leave-heading__icon" aria-hidden="true"><FilePenLine size={23} strokeWidth={1.9} /></span>
        <div className="leave-heading__text">
          <h1>การลา</h1>
          <p>ยื่นคำขอและติดตามสถานะ</p>
        </div>
      </header>

      <div className="leave-notice" role="status">
        <Info size={17} strokeWidth={1.9} aria-hidden="true" />
        <span>หน้าทดลองดีไซน์ · ยังไม่ส่งคำขอหรือบันทึกข้อมูลจริง</span>
      </div>

      <button type="button" className="leave-create" onClick={() => openModal('form')}>
        <span className="leave-create__icon" aria-hidden="true"><Plus size={24} strokeWidth={2.1} /></span>
        <span className="leave-create__label">
          <strong>ยื่นคำขอลา</strong>
          <small>กรอกประเภท วันที่ และเหตุผล</small>
        </span>
        <ChevronRight size={21} strokeWidth={1.9} aria-hidden="true" />
      </button>

      {feedback && (
        <div className="leave-feedback" role="status">
          <span>เพิ่มคำขอจำลองแล้ว — ไม่ได้ส่งถึงแอดมินหรือบันทึกลงระบบ</span>
          <button type="button" onClick={() => setFeedback(false)} aria-label="ปิดข้อความ"><X size={17} /></button>
        </div>
      )}

      <section className="leave-records" aria-labelledby="leave-records-title">
        <div className="leave-section-heading">
          <div>
            <h2 id="leave-records-title">คำขอลาของฉัน</h2>
            <p>รายการและสถานะคำขอ</p>
          </div>
          <span className="leave-count">{requests.length} รายการ</span>
        </div>

        <div className="leave-filters" role="group" aria-label="กรองสถานะคำขอ">
          {filterOptions.map((option) => (
            <button key={option.id} type="button"
              className={'leave-filter' + (filter === option.id ? ' leave-filter--active' : '')}
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >{option.label}</button>
          ))}
        </div>

        <div className="leave-list">
          {visibleRequests.length ? visibleRequests.map((request) => (
            <button type="button" className="leave-request" key={request.id}
              onClick={() => openModal('detail', request.id)}
              aria-label={request.type + ' ' + formatRange(request.start, request.end) + ' ' + statusLabels[request.status] + ' ดูรายละเอียด'}
            >
              <span className="leave-request__symbol" aria-hidden="true"><CalendarDays size={21} /></span>
              <span className="leave-request__main">
                <strong>{request.type}</strong>
                <small>{formatRange(request.start, request.end)}</small>
              </span>
              <span className={'leave-status leave-status--' + request.status}>{statusLabels[request.status]}</span>
              <ChevronRight size={17} className="leave-request__chevron" aria-hidden="true" />
            </button>
          )) : (
            <div className="leave-empty">
              <CalendarDays size={28} strokeWidth={1.6} aria-hidden="true" />
              <strong>ไม่มีคำขอในสถานะนี้</strong>
              <span>ลองเลือกสถานะอื่นเพื่อดูรายการตัวอย่าง</span>
            </div>
          )}
        </div>
      </section>
      <p className="leave-footnote">ข้อมูลคำขอทั้งหมดเป็นตัวอย่างสำหรับทดสอบหน้าจอเท่านั้น</p>

      {modal && createPortal(
        <div className="leave-modal-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeModal();
        }}>
          <section className="leave-modal" role="dialog" aria-modal="true"
            aria-labelledby="leave-modal-title" ref={modalPanelRef}>
            <div className="leave-modal__handle" aria-hidden="true" />
            <header className="leave-modal__head">
              <div>
                <span>ระบบการลา · โหมดทดลอง</span>
                <h2 id="leave-modal-title">{modal === 'form' ? 'ยื่นคำขอลา' : 'รายละเอียดคำขอลา'}</h2>
              </div>
              <button ref={firstModalButton} className="leave-modal__close" type="button"
                onClick={closeModal} aria-label="ปิดหน้าต่าง">
                <X size={21} />
              </button>
            </header>

            {modal === 'form' ? (
              <form className="leave-form" onSubmit={submitPreview}>
                <label className="leave-form__field">
                  <span>ประเภทการลา <em>*</em></span>
                  <select value={leaveType} onChange={(event) => setLeaveType(event.target.value as LeaveType)} required>
                    {leaveTypes.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <div className="leave-form__date-grid">
                  <label className="leave-form__field">
                    <span>วันที่เริ่มลา <em>*</em></span>
                    <input type="date" required value={start}
                      onChange={(event) => {
                        setStart(event.target.value);
                        if (event.target.value && end < event.target.value) setEnd(event.target.value);
                      }} />
                  </label>
                  <label className="leave-form__field">
                    <span>วันที่สิ้นสุด <em>*</em></span>
                    <input type="date" required min={start || undefined} value={end}
                      onChange={(event) => setEnd(event.target.value)} />
                  </label>
                </div>
                <label className="leave-form__field">
                  <span>เหตุผลการลา <em>*</em></span>
                  <textarea required value={reason} rows={3} maxLength={500}
                    placeholder="ระบุเหตุผลการลา..."
                    onChange={(event) => setReason(event.target.value)} />
                </label>
                <label className="leave-form__attachment">
                  <Paperclip size={18} aria-hidden="true" />
                  <span>{attachmentName || 'แนบเอกสารประกอบ (ถ้ามี)'}</span>
                  <input type="file" accept="image/*,.pdf" onChange={(event) => {
                    setAttachmentName(event.target.files?.[0]?.name ?? '');
                  }} />
                </label>
                {formError && <p className="leave-form__error" role="alert">{formError}</p>}
                <p className="leave-form__hint">กดปุ่มด้านล่างเพื่อทดลองขั้นตอนการยื่นคำขอเท่านั้น ไม่มีการส่งข้อมูลหรืออัปโหลดไฟล์จริง</p>
                <button className="leave-modal__primary" type="submit">
                  <Send size={18} aria-hidden="true" /> ทดลองส่งคำขอ
                </button>
              </form>
            ) : selectedRequest ? (
              <div className="leave-detail">
                <div className="leave-detail__intro">
                  <strong>{selectedRequest.type}</strong>
                  <span className={'leave-status leave-status--' + selectedRequest.status}>{statusLabels[selectedRequest.status]}</span>
                </div>
                <div className="leave-detail__line">
                  <CalendarDays size={18} aria-hidden="true" />
                  <div><span>วันที่ลา</span><strong>{formatRange(selectedRequest.start, selectedRequest.end)}</strong></div>
                </div>
                <div className="leave-detail__line">
                  <Clock3 size={18} aria-hidden="true" />
                  <div><span>สถานะคำขอ</span><strong>{statusLabels[selectedRequest.status]} (ตัวอย่าง)</strong></div>
                </div>
                <div className="leave-detail__reason">
                  <span>เหตุผลการลา</span>
                  <p>{selectedRequest.reason}</p>
                </div>
                <p className="leave-form__hint">นี่เป็นรายละเอียดจำลอง ไม่ใช่ผลอนุมัติจากบริษัท</p>
                <button className="leave-modal__primary" type="button" onClick={closeModal}>ปิดรายละเอียด</button>
              </div>
            ) : null}
          </section>
        </div>,
        document.querySelector('.app-shell') ?? document.body,
      )}
    </main>
  );
}
