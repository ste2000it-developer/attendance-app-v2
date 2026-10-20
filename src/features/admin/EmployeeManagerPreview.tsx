import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import "./EmployeeManagerPreview.css";

export type EmployeeDraft = {
  code: string;
  fullName: string;
  email: string;
  department: string;
  position: string;
  workplace: string;
  role: "employee" | "admin";
  status: "active" | "inactive";
  startDate: string;
};
export type EmployeeRecord = EmployeeDraft & { id: number };

type StatusFilter = "all" | EmployeeDraft["status"];
type RoleFilter = "all" | EmployeeDraft["role"];
const blank: EmployeeDraft = {
  code: "", fullName: "", email: "", department: "", position: "", workplace: "",
  role: "employee", status: "active", startDate: ""
};
const statusLabels = { active: "ปฏิบัติงาน", inactive: "พักงาน" };
const roleLabels = { employee: "พนักงาน", admin: "แอดมิน" };

function PeopleIcon({ name, size = 20 }: { name: "plus" | "search" | "close" | "edit" | "users" | "shield" | "briefcase" | "chevron"; size?: number }) {
  const shapes = {
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="10.8" cy="10.8" r="6.7"/><path d="m16 16 5 5"/></>,
    close: <path d="M5 5 19 19M19 5 5 19" />,
    edit: <><path d="m16 4 4 4-11 11H5v-4L16 4Z"/><path d="m14 6 4 4"/></>,
    users: <><circle cx="9" cy="8" r="3.1"/><path d="M3 20v-1a6 6 0 0 1 12 0v1H3Z"/><path d="M16 5a3 3 0 0 1 0 6M17 15a5 5 0 0 1 4 5"/></>,
    shield: <><path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-4Z"/><path d="m9 12 2 2 4-4"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></>,
    chevron: <path d="m9 6 6 6-6 6" />
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>;
}

export default function EmployeeManagerPreview({ employees, onChange }: {
  employees: EmployeeRecord[];
  onChange: (records: EmployeeRecord[]) => void;
}) {
  // Everything in this view is in-memory only; no real account is ever created.
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EmployeeDraft>({ ...blank });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const modalRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const departments = Array.from(new Set(employees.map(person => person.department.trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"th"));
  const normalized = search.trim().toLocaleLowerCase();
  const filtered = employees.filter(person => {
    const hasSearch = !normalized || [person.code,person.fullName,person.email,person.department,person.position,person.workplace]
      .some(value => value.toLocaleLowerCase().includes(normalized));
    return hasSearch && (statusFilter === "all" || person.status === statusFilter)
      && (roleFilter === "all" || person.role === roleFilter)
      && (departmentFilter === "all" || person.department === departmentFilter);
  });
  const activeCount = employees.filter(person=>person.status==="active").length;
  const adminCount = employees.filter(person=>person.role==="admin").length;

  function updateField<K extends keyof EmployeeDraft>(key: K, value: EmployeeDraft[K]) {
    setForm(previous=>({ ...previous, [key]: value }));
    setFormError("");
  }
  function openCreate(event: React.MouseEvent<HTMLButtonElement>) {
    openerRef.current = event.currentTarget;
    setEditingId(null);
    setForm({ ...blank });
    setFormError("");
    setDialogOpen(true);
  }
  function openEdit(person: EmployeeRecord, event: React.MouseEvent<HTMLButtonElement>) {
    openerRef.current = event.currentTarget;
    setEditingId(person.id);
    setForm({
      code: person.code, fullName: person.fullName, email: person.email,
      department: person.department, position: person.position, workplace: person.workplace,
      role: person.role, status: person.status, startDate: person.startDate
    });
    setFormError("");
    setDialogOpen(true);
  }
  function closeDialog() {
    setDialogOpen(false);
    setFormError("");
  }

  useEffect(()=>{
    if(!dialogOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.querySelector<HTMLInputElement>("#employee-demo-code")?.focus();
    function handleKeyboard(event: KeyboardEvent) {
      if(event.key === "Escape") {
        event.preventDefault();
        setDialogOpen(false);
      }
      if(event.key !== "Tab") return;
      const focusable=Array.from(modalRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      )??[]);
      if(!focusable.length) return;
      if(event.shiftKey && document.activeElement===focusable[0]) {
        event.preventDefault(); focusable[focusable.length-1].focus();
      } else if(!event.shiftKey && document.activeElement===focusable[focusable.length-1]) {
        event.preventDefault(); focusable[0].focus();
      }
    }
    document.addEventListener("keydown",handleKeyboard);
    return ()=>{
      document.body.style.overflow=previousOverflow;
      document.removeEventListener("keydown",handleKeyboard);
      openerRef.current?.focus({preventScroll:true});
    };
  },[dialogOpen]);

  function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean: EmployeeDraft = {
      ...form, code:form.code.trim(),fullName:form.fullName.trim(),email:form.email.trim().toLowerCase(),
      department:form.department.trim(),position:form.position.trim(),workplace:form.workplace.trim()
    };
    if(!clean.code || !clean.fullName || !clean.email || !clean.department || !clean.position || !clean.workplace) {
      setFormError("กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบ");
      return;
    }
    if(employees.some(person=>person.id!==editingId && person.code.toLocaleLowerCase()===clean.code.toLocaleLowerCase())) {
      setFormError("รหัสพนักงานนี้มีอยู่ในรายการตัวอย่างแล้ว");
      return;
    }
    if(employees.some(person=>person.id!==editingId && person.email.toLocaleLowerCase()===clean.email.toLocaleLowerCase())) {
      setFormError("อีเมลนี้มีอยู่ในรายการตัวอย่างแล้ว");
      return;
    }
    if(editingId===null) {
      const newId=employees.reduce((max,person)=>Math.max(max,person.id),0)+1;
      onChange([{...clean,id:newId},...employees]);
      setNotice("เพิ่มข้อมูลพนักงานในตัวอย่างแล้ว · ยังไม่ได้บันทึกขึ้น Firebase");
    } else {
      onChange(employees.map(person=>person.id===editingId?{...clean,id:person.id}:person));
      setNotice("แก้ไขข้อมูลในตัวอย่างแล้ว · ยังไม่ได้บันทึกขึ้น Firebase");
    }
    setDialogOpen(false);
  }
  function resetFilters() { setSearch(""); setStatusFilter("all"); setRoleFilter("all"); setDepartmentFilter("all"); }
  return (
    <div className="employee-demo">
      <div className="employee-demo-topbar">
        <div className="employee-demo-summary">
          <span className="employee-demo-mode">ข้อมูลชั่วคราว</span>
          <strong>ทะเบียนพนักงาน</strong>
          <p>เพิ่มและแก้ไขข้อมูลเพื่อทดลองหน้าจอเท่านั้น เมื่อรีเฟรชข้อมูลจะหาย</p>
        </div>
        <button className="employee-demo-add" type="button" onClick={openCreate}>
          <PeopleIcon name="plus" /> <span>เพิ่มพนักงาน</span>
        </button>
      </div>
      <div className="employee-demo-metrics" aria-label="สรุปทะเบียนพนักงานตัวอย่าง">
        <div><span className="employee-demo-metric-icon"><PeopleIcon name="users" /></span><p>พนักงานทั้งหมด</p><strong>{employees.length}</strong></div>
        <div><span className="employee-demo-metric-icon"><PeopleIcon name="briefcase" /></span><p>ปฏิบัติงาน</p><strong>{activeCount}</strong></div>
        <div><span className="employee-demo-metric-icon"><PeopleIcon name="shield" /></span><p>สิทธิ์แอดมิน</p><strong>{adminCount}</strong></div>
      </div>
      {notice && <div className="employee-demo-notice" role="status"><span>{notice}</span><button type="button" onClick={()=>setNotice("")} aria-label="ปิดข้อความ"><PeopleIcon name="close" size={16}/></button></div>}
      <section className="employee-demo-directory" aria-labelledby="employee-directory-title">
        <div className="employee-demo-directory-title">
          <div><h3 id="employee-directory-title">รายชื่อพนักงาน</h3><p>ค้นหาและจัดการข้อมูลเพื่อแสดงบนบัตรพนักงานภายหลัง</p></div>
          <span>{filtered.length} รายการ</span>
        </div>
        <div className="employee-demo-filters">
          <label className="employee-demo-search">
            <PeopleIcon name="search" size={19}/>
            <span className="sr-only">ค้นหาชื่อ รหัส หรือข้อมูลพนักงาน</span>
            <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="ค้นหาชื่อหรือรหัสพนักงาน..." />
          </label>
          <div className="employee-demo-select-wrap">
            <label htmlFor="employee-demo-status">สถานะ</label>
            <select id="employee-demo-status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value as StatusFilter)}>
              <option value="all">ทุกสถานะ</option>
              <option value="active">ปฏิบัติงาน</option>
              <option value="inactive">พักงาน</option>
            </select>
          </div>
          <div className="employee-demo-select-wrap">
            <label htmlFor="employee-demo-role">สิทธิ์</label>
            <select id="employee-demo-role" value={roleFilter} onChange={e=>setRoleFilter(e.target.value as RoleFilter)}>
              <option value="all">ทุกสิทธิ์</option>
              <option value="employee">พนักงาน</option>
              <option value="admin">แอดมิน</option>
            </select>
          </div>
          <div className="employee-demo-select-wrap">
            <label htmlFor="employee-demo-department">แผนก</label>
            <select id="employee-demo-department" value={departmentFilter}
              onChange={e=>setDepartmentFilter(e.target.value)}>
              <option value="all">ทุกแผนก</option>
              {departments.map(dep=><option key={dep} value={dep}>{dep}</option>)}
            </select>
          </div>
        </div>
        <div className="employee-demo-table-wrap">
          {employees.length===0 ? (
            <div className="employee-demo-empty">
              <span className="employee-demo-empty-icon"><PeopleIcon name="users" size={29}/></span>
              <h4>ยังไม่มีข้อมูลพนักงาน</h4>
              <p>ทดลองเพิ่มพนักงานเพื่อดูหน้ารายชื่อ การค้นหา และหน้าต่างแก้ไขข้อมูล</p>
              <button type="button" onClick={openCreate}><PeopleIcon name="plus" size={18}/> เพิ่มพนักงานคนแรก</button>
            </div>
          ) : filtered.length===0 ? (
            <div className="employee-demo-empty employee-demo-noresults">
              <span className="employee-demo-empty-icon"><PeopleIcon name="search" size={28}/></span>
              <h4>ไม่พบพนักงานที่ตรงกับตัวกรอง</h4>
              <p>ลองใช้ชื่อ รหัสพนักงาน หรือเปลี่ยนตัวกรองอีกครั้ง</p>
              <button type="button" onClick={resetFilters}>ล้างตัวกรอง</button>
            </div>
          ) : (
            <>
              <div className="employee-demo-table-scroll">
                <table className="employee-demo-table">
                  <thead><tr><th>พนักงาน</th><th>ตำแหน่ง / แผนก</th><th>สถานที่ทำงาน</th><th>สิทธิ์</th><th>สถานะ</th><th><span className="sr-only">จัดการ</span></th></tr></thead>
                  <tbody>{filtered.map(person=>(
                    <tr key={person.id}>
                      <td><div className="employee-demo-person"><span className="employee-demo-avatar" aria-hidden="true"><PeopleIcon name="users" size={21}/></span>
                        <div><strong>{person.fullName}</strong><small>{person.code}</small></div></div></td>
                      <td><div className="employee-demo-data-primary">{person.position}</div><small className="employee-demo-data-muted">{person.department}</small></td>
                      <td className="employee-demo-data-primary">{person.workplace}</td>
                      <td><span className={"employee-demo-role employee-demo-role-"+person.role}>{roleLabels[person.role]}</span></td>
                      <td><span className={"employee-demo-status employee-demo-status-"+person.status}>{statusLabels[person.status]}</span></td>
                      <td><button className="employee-demo-edit" type="button" onClick={event=>openEdit(person,event)} aria-label={"แก้ไข "+person.fullName}><PeopleIcon name="edit" size={17}/> แก้ไข</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="employee-demo-mobile-list">
                {filtered.map(person=>(
                  <article key={person.id} className="employee-demo-mobile-person">
                    <div className="employee-demo-person"><span className="employee-demo-avatar" aria-hidden="true"><PeopleIcon name="users" size={20}/></span>
                      <div><strong>{person.fullName}</strong><small>{person.code}</small></div></div>
                    <div className="employee-demo-mobile-meta"><span>{person.position} · {person.department}</span><span>{person.workplace}</span></div>
                    <div className="employee-demo-mobile-bottom">
                      <span className={"employee-demo-role employee-demo-role-"+person.role}>{roleLabels[person.role]}</span>
                      <span className={"employee-demo-status employee-demo-status-"+person.status}>{statusLabels[person.status]}</span>
                      <button className="employee-demo-edit" type="button" onClick={event=>openEdit(person,event)}><PeopleIcon name="edit" size={16}/> แก้ไข</button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
        <p className="employee-demo-listfoot">* สิทธิ์แอดมินและสถานะเป็นข้อมูลจำลองบนหน้าจอเท่านั้น ไม่สามารถเข้าระบบหรือเปลี่ยนสิทธิ์จริงได้</p>
      </section>

      {dialogOpen && (
        <div className="employee-demo-backdrop" role="presentation" onMouseDown={event=>{
          if(event.target===event.currentTarget) closeDialog();
        }}>
          <section className="employee-demo-modal" ref={modalRef} role="dialog" aria-modal="true"
            aria-labelledby="employee-demo-modal-title" aria-describedby="employee-demo-modal-desc">
            <div className="employee-demo-modal-head">
              <div><span>EMPLOYEE · PREVIEW</span><h2 id="employee-demo-modal-title">{editingId===null?"เพิ่มพนักงาน":"แก้ไขข้อมูลพนักงาน"}</h2></div>
              <button type="button" aria-label="ปิดหน้าต่าง" onClick={closeDialog} className="employee-demo-close"><PeopleIcon name="close"/></button>
            </div>
            <p className="employee-demo-modal-desc" id="employee-demo-modal-desc">ข้อมูลนี้อยู่เฉพาะในหน้าต้นแบบ ไม่ได้สร้างบัญชีหรือบันทึกใน Firebase</p>
            <form onSubmit={saveEmployee} className="employee-demo-form">
              <div className="employee-demo-form-grid">
                <label><span>รหัสพนักงาน <b>*</b></span>
                  <input id="employee-demo-code" type="text" required maxLength={30} value={form.code}
                    autoComplete="off" placeholder="เช่น EMP001" onChange={e=>updateField("code",e.target.value)} />
                </label>
                <label><span>ชื่อ–นามสกุล <b>*</b></span>
                  <input required maxLength={120} value={form.fullName} autoComplete="off" placeholder="ชื่อและนามสกุล"
                    onChange={e=>updateField("fullName",e.target.value)}/></label>
                <label className="employee-demo-form-wide"><span>อีเมลสำหรับบัญชี <b>*</b></span>
                  <input type="email" required maxLength={160} value={form.email} autoComplete="off"
                    placeholder="name@example.com" onChange={e=>updateField("email",e.target.value)}/></label>
                <label><span>แผนก <b>*</b></span>
                  <input required maxLength={80} value={form.department} placeholder="ระบุแผนก"
                    onChange={e=>updateField("department",e.target.value)}/></label>
                <label><span>ตำแหน่ง <b>*</b></span>
                  <input required maxLength={80} value={form.position} placeholder="ระบุตำแหน่ง"
                    onChange={e=>updateField("position",e.target.value)}/></label>
                <label><span>สาขา / สถานที่ทำงาน <b>*</b></span>
                  <input required maxLength={120} value={form.workplace} placeholder="ระบุสถานที่ทำงาน"
                    onChange={e=>updateField("workplace",e.target.value)}/></label>
                <label><span>วันที่เริ่มงาน</span>
                  <input type="date" value={form.startDate} onChange={e=>updateField("startDate",e.target.value)}/></label>
                <label><span>สิทธิ์ผู้ใช้</span>
                  <select value={form.role} onChange={e=>updateField("role",e.target.value as EmployeeDraft["role"])}>
                    <option value="employee">พนักงาน</option><option value="admin">แอดมิน</option>
                  </select>
                </label>
                <label><span>สถานะพนักงาน</span>
                  <select value={form.status} onChange={e=>updateField("status",e.target.value as EmployeeDraft["status"])}>
                    <option value="active">ปฏิบัติงาน</option><option value="inactive">พักงาน</option>
                  </select>
                </label>
              </div>
              {formError && <p className="employee-demo-error" role="alert">{formError}</p>}
              <div className="employee-demo-form-actions">
                <button type="button" onClick={closeDialog}>ยกเลิก</button>
                <button type="submit">{editingId===null?"เพิ่มในตัวอย่าง":"บันทึกในตัวอย่าง"} <PeopleIcon name="chevron" size={18}/></button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
