import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import "./ReportDetailDialog.css";

/** Shared accessible detail popup for daily and yearly staff reports. */
export default function ReportDetailDialog({
  titleId, onClose, children
}: {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLElement|null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>(".report-v2-detail-close")
      ?.focus({preventScroll:true});

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const modal = dialogRef.current;
      if (!modal) return;
      const controls = [...modal.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter(element => element.getClientRects().length > 0);
      if (!controls.length) {
        event.preventDefault();
        return;
      }
      const first = controls[0], last = controls[controls.length-1];
      if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({preventScroll:true});
    };
  }, []);

  return createPortal(
    <div className="report-v2-dialog-backdrop" role="presentation"
      onMouseDown={event=>{
        if (event.target===event.currentTarget) onClose();
      }}>
      <section className="report-v2-dialog" role="dialog" aria-modal="true"
        aria-labelledby={titleId} ref={dialogRef}>
        {children}
      </section>
    </div>,document.body
  );
}
