import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import "./PreviewControls.css";

type Option = { value: string; label: string };

function ControlIcon({ name, size = 18 }: { name: "down" | "check" | "calendar" | "left" | "right" | "close"; size?: number }) {
  const shapes = {
    down: <path d="m6 9 6 6 6-6" />,
    check: <path d="m5 12 4 4 10-10" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    left: <path d="m15 6-6 6 6 6" />,
    right: <path d="m9 6 6 6-6 6" />,
    close: <path d="M5 5 19 19M19 5 5 19" />
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>;
}

export function PreviewSelect({ label, value, options, onChange, compact = false }: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 180, maxHeight: 240 });
  const controlId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find(option => option.value === value);
  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }
  function recalculate() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewport = window.innerHeight;
    const spaceBelow = viewport - rect.bottom - 10;
    const spaceAbove = rect.top - 10;
    const desiredHeight = Math.min(300, options.length * 43 + 12);
    const above = spaceBelow < Math.min(desiredHeight, 180) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(100, Math.min(300, (above ? spaceAbove : spaceBelow) - 6));
    const menuWidth = Math.max(rect.width, compact ? 144 : 170);
    setPos({
      top: above ? Math.max(8, rect.top - Math.min(desiredHeight, maxHeight) - 5) : rect.bottom + 5,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8)),
      width: menuWidth,
      maxHeight
    });
  }
  function openMenu() {
    if (open) { close(true); return; }
    recalculate();
    setHighlighted(Math.max(0, options.findIndex(option => option.value === value)));
    setOpen(true);
  }
  function choose(next: string) {
    onChange(next);
    close(true);
  }
  useEffect(() => {
    if (!open) return;
    listRef.current?.focus({ preventScroll: true });
    const item = listRef.current?.querySelector<HTMLElement>('[data-highlighted="true"]');
    item?.scrollIntoView({ block: "nearest" });
    function onDocumentDown(event: PointerEvent) {
      if (!triggerRef.current?.contains(event.target as Node) && !listRef.current?.contains(event.target as Node)) close();
    }
    function onReposition(event: Event) {
      // Scrolling within the custom menu should never dismiss it.
      if (event.type === "scroll" && listRef.current?.contains(event.target as Node)) return;
      close();
    }
    document.addEventListener("pointerdown", onDocumentDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onDocumentDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>('[data-highlighted="true"]')?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);
  function keyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); }
      close(event.key === "Escape");
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); event.stopPropagation();
      setHighlighted(index => (index + options.length + (event.key === "ArrowDown" ? 1 : -1)) % options.length);
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault(); event.stopPropagation();
      const item = options[highlighted];
      if (item) choose(item.value);
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault(); setHighlighted(event.key === "Home" ? 0 : options.length - 1);
    }
  }
  return (
    <div className={"preview-select" + (compact ? " preview-select-compact" : "")}>
      <span className="preview-select-label">{label}</span>
      <button type="button" className={"preview-select-trigger" + (open ? " is-open" : "")}
        ref={triggerRef} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? controlId : undefined}
        aria-label={label + ": " + (selected?.label || "ยังไม่เลือก")}
        onClick={openMenu}
        onKeyDown={event => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault(); openMenu();
          }
        }}>
        <span>{selected?.label || "เลือกข้อมูล"}</span><ControlIcon name="down" size={17}/>
      </button>
      {open && createPortal(
        <div id={controlId} className="preview-select-list" role="listbox" tabIndex={-1}
          aria-label={label} ref={listRef} onKeyDown={keyDown}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}>
          {options.map((option, index) => (
            <button type="button" key={option.value} role="option" aria-selected={value === option.value}
              data-highlighted={highlighted === index ? "true" : undefined}
              className={(option.value === value ? "is-selected " : "") + (index === highlighted ? "is-highlighted" : "")}
              onPointerMove={() => setHighlighted(index)}
              onClick={() => choose(option.value)}>
              <span>{option.label}</span>{option.value === value && <ControlIcon name="check" size={16}/>}
            </button>
          ))}
        </div>, document.body
      )}
    </div>
  );
}

function dateIso(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
}
function displayDate(value: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "DD/MM/YYYY";
  const [year,month,day] = value.split("-");
  return day + "/" + month + "/" + year;
}
const monthNames = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const weekdays = ["จ","อ","พ","พฤ","ศ","ส","อา"];
export function PreviewDatePicker({ label, value, onChange }: {
  label: string; value: string; onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(() => new Date(new Date().getFullYear(),new Date().getMonth(),1));
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLElement | null>(null);
  const years = Array.from({length: Math.max(1,new Date().getFullYear() - 1969 + 5)},(_,i)=>String(1970+i));
  function openCalendar() {
    const date = value ? new Date(value+"T12:00:00") : new Date();
    setVisible(new Date(date.getFullYear(),date.getMonth(),1));
    setOpen(true);
  }
  function closeCalendar() { setOpen(false); triggerRef.current?.focus({ preventScroll: true }); }
  useEffect(() => {
    if (!open) return;
    modalRef.current?.querySelector<HTMLButtonElement>(".preview-date-close")?.focus({preventScroll:true});
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  function calendarKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault(); event.stopPropagation(); closeCalendar(); return;
    }
    if (event.key !== "Tab") return;
    const list = Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);
    if (!list.length) return;
    if (event.shiftKey && document.activeElement===list[0]) { event.preventDefault(); list[list.length-1].focus(); }
    if (!event.shiftKey && document.activeElement===list[list.length-1]) { event.preventDefault(); list[0].focus(); }
  }
  const month = visible.getMonth(), year = visible.getFullYear();
  const blanks = (new Date(year,month,1).getDay()+6)%7;
  const count = new Date(year,month+1,0).getDate();
  return (
    <div className="preview-date-control">
      <span className="preview-select-label">{label}</span>
      <button type="button" ref={triggerRef} className="preview-date-trigger" onClick={openCalendar}
        aria-label={label + " " + (value ? displayDate(value) : "ยังไม่ได้เลือก") + " เปิดปฏิทิน"}
        aria-haspopup="dialog" aria-expanded={open}>
        <span className={!value ? "is-placeholder" : ""}>{displayDate(value)}</span>
        <span className="preview-date-icon"><ControlIcon name="calendar" size={21}/></span>
      </button>
      {open && createPortal(
        <div className="preview-date-backdrop" role="presentation"
          onMouseDown={event=>{ if (event.currentTarget===event.target) closeCalendar(); }}>
          <section className="preview-date-modal" role="dialog" aria-modal="true"
            aria-label={"เลือก"+label} ref={modalRef} onKeyDown={calendarKeyDown}>
            <div className="preview-date-modal-title">
              <div><span>เลือกวันที่</span><h3>{label}</h3></div>
              <button className="preview-date-close" type="button" aria-label="ปิดปฏิทิน" onClick={closeCalendar}><ControlIcon name="close"/></button>
            </div>
            <div className="preview-date-month-controls">
              <button type="button" aria-label="เดือนก่อนหน้า" onClick={()=>setVisible(new Date(year,month-1,1))}><ControlIcon name="left"/></button>
              <div className="preview-date-month-selects">
                <PreviewSelect compact label="เดือน" value={String(month)} options={monthNames.map((name,i)=>({value:String(i),label:name}))}
                  onChange={m=>setVisible(new Date(year,Number(m),1))}/>
                <PreviewSelect compact label="ปี ค.ศ." value={String(year)} options={years.map(y=>({value:y,label:y}))}
                  onChange={y=>setVisible(new Date(Number(y),month,1))}/>
              </div>
              <button type="button" aria-label="เดือนถัดไป" onClick={()=>setVisible(new Date(year,month+1,1))}><ControlIcon name="right"/></button>
            </div>
            <div className="preview-date-weekdays" aria-hidden="true">{weekdays.map(day=><span key={day}>{day}</span>)}</div>
            <div className="preview-date-days">
              {Array.from({length:blanks},(_,index)=><span key={"b"+index}/>)}
              {Array.from({length:count},(_,index)=>{
                const day = new Date(year,month,index+1),iso=dateIso(day);
                return <button type="button" key={iso} className={"preview-date-day"+(iso===value?" is-selected":"")+(iso===dateIso(new Date())?" is-today":"")}
                  aria-label={displayDate(iso)} aria-pressed={iso===value}
                  onClick={()=>{onChange(iso);closeCalendar();}}>{index+1}</button>;
              })}
            </div>
            <div className="preview-date-bottom">
              <span>วัน / เดือน / ปี ค.ศ.</span>
              <button type="button" onClick={()=>{onChange(dateIso(new Date()));closeCalendar();}}>เลือกวันนี้</button>
            </div>
          </section>
        </div>, document.body
      )}
    </div>
  );
}
