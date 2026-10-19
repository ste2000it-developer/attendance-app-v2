# Attendance V2

แอปตอกบัตรเวอร์ชันใหม่สำหรับ S.TUNTIVIVAT ENGINEERING 2000

## สถานะ

โปรเจกต์นี้เป็น **โครงสร้างเริ่มต้น (UI preview)** เท่านั้น ปุ่มตอกบัตรยังไม่บันทึกเวลาจริง ไม่มีการอ่านหรือเขียนข้อมูล Firebase และยังไม่ได้เปิดใช้งานแทน Attendance V1

- React + TypeScript + Vite
- แยกหน้า Home / Leave / Profile ด้วย lazy loading
- Mobile-first พร้อมแถบนำทางสำหรับมือถือและ Sidebar บนจอใหญ่
- จัดไฟล์ตามฟีเจอร์เพื่อดูแลและพัฒนาต่อได้ง่าย
- เตรียมตัวเชื่อม Firebase แต่จะไม่เชื่อมฐานข้อมูลจริงจนกว่าจะตกลงเรื่องสภาพแวดล้อมทดสอบและสิทธิ์การเข้าถึง

## เริ่มโปรเจกต์

ต้องมี Node.js เวอร์ชัน 24.12 ขึ้นไป (เพื่อรองรับ Firebase SDK รุ่นที่ติดตั้ง)

```bash
npm install
npm run dev
```

เปิด URL ที่ Vite แสดง เช่น http://localhost:5173

ตรวจสอบความถูกต้องและสร้างไฟล์สำหรับเผยแพร่:

```bash
npm run build
npm run preview
```

## โครงสร้าง

```text
src/
  app/             # Shell, navigation, main layout
  features/
    attendance/     # หน้าตอกบัตร (ยังเป็น preview)
    leave/          # หน้าใบลา (ยังเป็น preview)
    profile/        # หน้าข้อมูลพนักงาน (ยังเป็น preview)
  lib/firebase/     # Firebase client ที่ยังไม่เริ่มเชื่อมโดยอัตโนมัติ
  styles/           # Design tokens และ global styles
```

## หมายเหตุสำคัญด้านความปลอดภัย

- ห้ามใส่รหัสผ่านหรือ Firebase Admin SDK service account ใน frontend หรือ GitHub
- ค่า Firebase web config เป็นข้อมูลการตั้งค่า client แต่ยังต้องควบคุมด้วย Firebase Auth และ Firestore Security Rules
- ยังไม่มีระบบ Sign-in / Device binding / GPS / Auto checkout / OT / Leave approval / Export Excel
- แอปจริง V1 ยังคงใช้ Repository แยกกัน ไม่ได้รับผลกระทบจาก V2
- ยังไม่ได้ตั้งค่า PWA install และยังไม่เปิดระบบจริง; เตรียม GitHub Pages workflow ไว้สำหรับเว็บทดลองเท่านั้น

## GitHub Pages — เว็บทดลอง

โครงสร้างนี้เตรียมไว้สำหรับเว็บไซต์ทดลองที่ `https://ste2000it-developer.github.io/attendance-app-v2/` **เมื่อ Deploy สำเร็จแล้วเท่านั้น**

การเปิดเว็บครั้งแรกต้องทำจาก GitHub ด้วยบัญชีเจ้าของ:

1. `Settings > General > Danger Zone > Change repository visibility > Make public` และยืนยัน (เนื้อหา Repository และประวัติ Commit จะเปิดเผยต่อสาธารณะ)
2. `Settings > Pages > Build and deployment > Source > GitHub Actions`
3. `Actions > Deploy Attendance V2 Preview > Run workflow` เลือก `main` แล้วกดเริ่ม
4. เมื่อการ Deploy ผ่าน ให้เปิดลิงก์เว็บจากหน้า Pages หรือผลลัพธ์ของ Workflow

ทุกครั้งที่มีการ Push โค้ดขึ้น `main` ใน Repository แบบ Public ระบบจะ Build และ Deploy อัตโนมัติ

**ข้อควรระวัง:** หน้าเว็บทดลองจะเข้าถึงได้จากอินเทอร์เน็ต ไม่ใส่ข้อมูลบุคคล รหัสผ่าน หรือความลับใด ๆ ในไฟล์ที่เผยแพร่ ปัจจุบัน UI เป็นเพียงหน้าตัวอย่าง ไม่มีการเชื่อม Firebase Production
