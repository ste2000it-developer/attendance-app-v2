import { useState } from "react";
import type { FormEvent } from "react";
import "./LoginPreviewPage.css";

function ClockMark() {
  return (
    <svg width="27" height="27" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="2.5" />
      <path d="M16 8.5V16l6 3.7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
    </svg>
  );
}

function EyeMark({ visible }: { visible: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {visible ? (
        <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/></>
      ) : (
        <><path d="M3 3 21 21M10.5 6.1A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-3.6 4.1M6.2 6.7C3.8 8.2 2.5 12 2.5 12S6 18 12 18c1.2 0 2.3-.2 3.3-.7M10 10a2.8 2.8 0 0 0 4 4"/></>
      )}
    </svg>
  );
}

export default function LoginPreviewPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Preview only: never authenticate locally, store credentials or simulate a signed-in session.
    setMessage(true);
  }

  return (
    <div className="auth-preview">
      <div className="auth-shell">
        <aside className="auth-aside">
          <a className="auth-back-link" href={window.location.pathname}>
            <span aria-hidden="true">‹</span> กลับหน้าตัวอย่างพนักงาน
          </a>
          <div className="auth-aside-main">
            <div className="auth-logo-large"><ClockMark /></div>
            <p className="auth-aside-overline">WORKFORCE · ATTENDANCE</p>
            <h1>ทุกวันทำงาน<br/>เริ่มต้นที่นี่</h1>
            <p>ระบบลงเวลางานและจัดการข้อมูลพนักงานที่ใช้งานง่าย ในหน้าตาที่เรียบและเป็นระเบียบ</p>
            <div className="auth-aside-rule" />
            <span className="auth-aside-version">ATTENDANCE V2 · DESIGN PREVIEW</span>
          </div>
          <p className="auth-aside-footer">เวอร์ชันทดลองหน้าบ้าน · ยังไม่เชื่อม Firebase</p>
        </aside>

        <main className="auth-panel">
          <div className="auth-panel-inner">
            <div className="auth-mobile-brand"><span className="auth-logo-small"><ClockMark /></span><strong>STE2000<span>.</span></strong></div>
            <div className="auth-form-heading">
              <span className="auth-kicker">ยินดีต้อนรับ</span>
              <h2>เข้าสู่ระบบ</h2>
              <p>เข้าสู่ระบบด้วยบัญชีพนักงานของคุณ</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="preview-login-email">อีเมล</label>
                <input id="preview-login-email" name="email" type="email" inputMode="email"
                  autoComplete="username" placeholder="name@example.com" value={email} required
                  onChange={(event) => { setEmail(event.target.value); setMessage(false); }} />
              </div>
              <div className="auth-field">
                <label htmlFor="preview-login-password">รหัสผ่าน</label>
                <div className="auth-password-wrap">
                  <input id="preview-login-password" name="password"
                    type={showPassword ? "text" : "password"} autoComplete="current-password"
                    placeholder="กรอกรหัสผ่าน" value={password} required
                    onChange={(event) => { setPassword(event.target.value); setMessage(false); }} />
                  <button type="button" className="auth-password-toggle"
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}>
                    <EyeMark visible={showPassword} />
                  </button>
                </div>
              </div>
              <button type="submit" className="auth-submit">
                เข้าสู่ระบบ <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
              </button>
              {message && (
                <div className="auth-feedback" role="status">
                  ยังไม่สามารถเข้าสู่ระบบจริงได้ในเวอร์ชันทดลอง — หน้านี้ยังไม่เชื่อม Firebase และไม่ได้ส่งข้อมูลเข้าสู่ระบบ
                </div>
              )}
            </form>

            <div className="auth-demo-notice">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>
              </svg>
              <p><strong>ตัวอย่างหน้าจอเท่านั้น</strong> ยังไม่มีบัญชีที่เข้าสู่ระบบได้ และยังไม่จัดเก็บข้อมูลที่กรอก โปรดอย่าใช้รหัสผ่านจริงเพื่อทดลอง</p>
            </div>

            <div className="auth-preview-links">
              <a href={window.location.pathname}>ดูหน้าแอปพนักงาน <span aria-hidden="true">↗</span></a>
              <a href="?preview=admin">ดูหน้าจอแอดมินต้นแบบ <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
