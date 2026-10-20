import { lazy, Suspense, useState } from "react";
import type { ReactNode } from "react";
import { HomePage } from "../features/attendance/HomePage";
import type { Section } from "./navigation";
import { navigation } from "./navigation";

const LeavePage = lazy(() => import("../features/leave/LeavePage"));
const ProfilePage = lazy(() => import("../features/profile/ProfilePage"));

function NavIcon({ section }: { section: Section }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.85,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const
  };

  if (section === "home") {
    return <svg {...common}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" /></svg>;
  }
  if (section === "leave") {
    return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h4" /></svg>;
  }
  return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
}

function Navigation({ active, onNavigate, mobile = false }: {
  active: Section;
  onNavigate: (section: Section) => void;
  mobile?: boolean;
}) {
  // DOM order matches the visual order for keyboard and screen-reader navigation.
  const items = mobile
    ? [navigation[1], navigation[0], navigation[2]]
    : navigation;

  return (
    <nav className="app-nav" aria-label={mobile ? "เมนูหลักบนมือถือ" : "เมนูหลัก"}>
      {items.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={`nav-link nav-link-${id}${active === id ? " is-active" : ""}`}
          aria-current={active === id ? "page" : undefined}
          onClick={() => onNavigate(id)}
        >
          <span className="nav-icon-wrap"><NavIcon section={id} /></span>
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="32" height="32" fill="none">
          <circle cx="20" cy="20" r="13.5" stroke="currentColor" strokeWidth="2.4" opacity=".7" />
          <path d="M20 10.5v10l7 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="20" cy="20" r="2.3" fill="currentColor" />
        </svg>
      </span>
      <div>
        <span className="brand-name">STE2000<span className="brand-accent">.</span></span>
        <span className="brand-subtitle">Workforce · Attendance</span>
      </div>
    </div>
  );
}

function SectionContent({ active, onOpenLeave }: { active: Section; onOpenLeave: () => void }): ReactNode {
  if (active === "home") return <HomePage onOpenLeave={onOpenLeave} />;
  if (active === "leave") return <LeavePage />;
  return <ProfilePage />;
}

export default function App() {
  const [active, setActive] = useState<Section>("home");
  const sectionName = navigation.find((item) => item.id === active)?.label || "";

  return (
    <div className={`app-frame${active === "profile" ? " app-frame-profile" : ""}`}>
      <a href="#main-content" className="skip-link">ข้ามไปเนื้อหาหลัก</a>
      <aside className="sidebar">
        <Brand />
        <p className="sidebar-heading">เมนูหลัก</p>
        <Navigation active={active} onNavigate={setActive} />
        <div className="sidebar-footnote">
          <span className="sidebar-footnote-dot" aria-hidden="true" />
          Attendance V2 <span>· เวอร์ชันทดลอง</span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><Brand /></div>
          <div className="topbar-context">
            <span className="eyebrow">ATTENDANCE V2</span>
            <strong>{sectionName}</strong>
          </div>
          <span className="preview-pill"><span aria-hidden="true" /> เวอร์ชันทดลอง</span>
        </header>

        <main className={`page-main${active === "home" ? " page-main-home" : active === "profile" ? " page-main-profile" : ""}`} id="main-content">
          <Suspense fallback={<div className="panel loading-panel">กำลังเปิดหน้า...</div>}>
            <SectionContent active={active} onOpenLeave={() => setActive("leave")} />
          </Suspense>
        </main>

        <div className="mobile-navigation">
          <Navigation active={active} onNavigate={setActive} mobile />
        </div>
      </div>
    </div>
  );
}
