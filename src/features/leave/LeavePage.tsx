import { useState } from "react";
import type { FormEvent } from "react";
import "./LeavePage.css";

type LeaveType = "" | "sick" | "personal" | "annual";
type LeaveField = "type" | "start" | "end" | "reason";
type LeaveErrors = Partial<Record<LeaveField, string>>;

const typeLabels: Record<Exclude<LeaveType, "">, string> = {
  sick: "ลาป่วย",
  personal: "ลากิจ",
  annual: "ลาพักร้อน"
};

export default function LeavePage() {
  // This is a local-only practice form, not an application for real leave.
  const [type, setType] = useState<LeaveType>("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<LeaveErrors>({});
  const [preview, setPreview] = useState<{ type: string; start: string; end: string; reason: string } | null>(null);

  function updateField(field: LeaveField) {
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setPreview(null);
  }

  function checkDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: LeaveErrors = {};
    if (!type) found.type = "กรุณาเลือกประเภทการลา";
    if (!start) found.start = "กรุณาเลือกวันเริ่มลา";
    if (!end) found.end = "กรุณาเลือกวันสิ้นสุด";
    if (start && end && end < start) found.end = "วันสิ้นสุดต้องไม่ก่อนวันเริ่มลา";
    if (reason.trim().length < 5) found.reason = "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร";

    setErrors(found);
    if (Object.keys(found).length > 0) {
      setPreview(null);
      const first = (["type", "start", "end", "reason"] as const).find((field) => found[field]);
      if (first) document.getElementById(`leave-${first}`)?.focus();
      return;
    }

    // A preview-only result. Nothing is persisted or transmitted.
    setPreview({ type: typeLabels[type as Exclude<LeaveType, "">], start, end, reason: reason.trim() });
  }

  function resetDraft() {
    setType("");
    setStart("");
    setEnd("");
    setReason("");
    setErrors({});
    setPreview(null);
  }

  return (
    <div className="page-content leave-v2">
      <div className="page-heading">
        <div>
          <span className="eyebrow">LEAVE MANAGEMENT · DEMO</span>
          <h1>การลา</h1>
          <p>ลองกรอกใบลา ผู้ช่วยจะตรวจข้อมูลเบื้องต้นให้ครับ</p>
        </div>
      </div>
      <div className="notice" role="note">
        เวอร์ชันทดลอง · ตรวจความครบถ้วนของฟอร์มเท่านั้น ไม่ได้ส่งคำขอ บันทึก Firebase หรือตรวจสิทธิ์วันลาจริง
      </div>

      <section className="leave-draft-panel" aria-labelledby="leave-form-title">
        <div className="leave-draft-heading">
          <span className="leave-draft-mark" aria-hidden="true">✦</span>
          <div>
            <h2 id="leave-form-title">ให้ผมช่วยตรวจใบลานะครับ</h2>
            <p>กรอกข้อมูลด้านล่าง แล้วกดตรวจใบลาได้เลย</p>
          </div>
        </div>
        <form className="leave-draft-form" onSubmit={checkDraft} noValidate>
          <div className="leave-draft-field">
            <label htmlFor="leave-type">ประเภทการลา <span aria-hidden="true">*</span></label>
            <select
              id="leave-type" value={type} aria-invalid={!!errors.type}
              aria-describedby={errors.type ? "leave-type-error" : undefined}
              onChange={(event) => { setType(event.target.value as LeaveType); updateField("type"); }}
            >
              <option value="">เลือกประเภทการลา</option>
              <option value="sick">ลาป่วย</option>
              <option value="personal">ลากิจ</option>
              <option value="annual">ลาพักร้อน</option>
            </select>
            {errors.type && <small id="leave-type-error" role="alert">{errors.type}</small>}
          </div>
          <div className="leave-draft-date-grid">
            <div className="leave-draft-field">
              <label htmlFor="leave-start">เริ่มลา <span aria-hidden="true">*</span></label>
              <input id="leave-start" type="date" value={start}
                aria-invalid={!!errors.start}
                aria-describedby={errors.start ? "leave-start-error" : undefined}
                onChange={(event) => { setStart(event.target.value); updateField("start"); }} />
              {errors.start && <small id="leave-start-error" role="alert">{errors.start}</small>}
            </div>
            <div className="leave-draft-field">
              <label htmlFor="leave-end">สิ้นสุด <span aria-hidden="true">*</span></label>
              <input id="leave-end" type="date" value={end}
                aria-invalid={!!errors.end}
                aria-describedby={errors.end ? "leave-end-error" : undefined}
                onChange={(event) => { setEnd(event.target.value); updateField("end"); }} />
              {errors.end && <small id="leave-end-error" role="alert">{errors.end}</small>}
            </div>
          </div>
          <div className="leave-draft-field">
            <label htmlFor="leave-reason">เหตุผลการลา <span aria-hidden="true">*</span></label>
            <textarea id="leave-reason" rows={3} value={reason} maxLength={500}
              placeholder="เช่น มีธุระส่วนตัวที่ต้องดำเนินการ"
              aria-invalid={!!errors.reason}
              aria-describedby={errors.reason ? "leave-reason-error" : undefined}
              onChange={(event) => { setReason(event.target.value); updateField("reason"); }} />
            {errors.reason && <small id="leave-reason-error" role="alert">{errors.reason}</small>}
          </div>
          <div className="leave-draft-actions">
            <button className="leave-draft-submit" type="submit">ตรวจข้อมูลใบลา <span aria-hidden="true">→</span></button>
            <button className="leave-draft-clear" type="button" onClick={resetDraft}>ล้างข้อมูล</button>
          </div>
        </form>
      </section>

      {preview && (
        <section className="leave-draft-result" role="status" aria-live="polite">
          <span className="leave-draft-result-mark" aria-hidden="true">✓</span>
          <div>
            <h2>กรอกข้อมูลครบแล้วครับ!</h2>
            <p>นี่เป็นเพียงตัวอย่างใบลา ยังไม่ได้ส่งหรือบันทึกจริง</p>
            <dl>
              <div><dt>ประเภท</dt><dd>{preview.type}</dd></div>
              <div><dt>วันที่</dt><dd>{preview.start} ถึง {preview.end}</dd></div>
              <div><dt>เหตุผล</dt><dd>{preview.reason}</dd></div>
            </dl>
          </div>
        </section>
      )}
    </div>
  );
}
