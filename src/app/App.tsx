import { lazy, Suspense, useState } from "react";
import type { ReactNode } from "react";
import { HomePage } from "../features/attendance/HomePage";
import type { Section } from "./navigation";
import { navigation } from "./navigation";

const LeavePage = lazy(() => import("../features/leave/LeavePage"));
const ProfilePage = lazy(() => import("../features/profile/ProfilePage"));

function NavIcon({ section }: { section: Section }) {
  const common = {
    width: 21,
    height: 21,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
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

function Navigation({ active, onNavigate }: { active: Section; onNavigate: (section: Section) => void }) {
  return (
    <nav className="app-nav" aria-label="เมนูหลัก">
      {navigation.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={active === id ? "nav-link is-active" : "nav-link"}
          aria-current={active === id ? "page" : undefined}
          onClick={() => onNavigate(id)}
        >
          <NavIcon section={id} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon" aria-hidden="true">S</span>
      <div>
        <span className="brand-name">STE2000</span>
        <span className="brand-subtitle">Workforce Management</span>
      </div>
    </div>
  );
}

function SectionContent({ active }: { active: Section }): ReactNode {
  if (active === "home") return <HomePage />;
  if (active === "leave") return <LeavePage />;
  return <ProfilePage />;
}

export default function App() {
  const [active, setActive] = useState<Section>("home");
  const sectionName = navigation.find((item) => item.id === active)?.label || "";

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Brand />
        <p className="sidebar-heading">เมนูหลัก</p>
        <Navigation active={active} onNavigate={setActive} />
        <p className="sidebar-footnote">Attendance V2 · UI Preview</p>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><Brand /></div>
          <div className="topbar-context">
            <span className="eyebrow">ATTENDANCE V2</span>
            <strong>{sectionName}</strong>
          </div>
          <span className="preview-pill">ตัวอย่าง UI</span>
        </header>

        <main className="page-main" id="main-content">
          <Suspense fallback={<div className="panel loading-panel">กำลังเปิดหน้า...</div>}>
            <SectionContent active={active} />
          </Suspense>
        </main>

        <div className="mobile-navigation">
          <Navigation active={active} onNavigate={setActive} />
        </div>
      </div>
    </div>
  );
}
