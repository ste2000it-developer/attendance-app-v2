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

ต้องมี Node.js เวอร์ชัน 20.19+ หรือ 22.12+ (แนะนำ Node 22 LTS)

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
- ยังไม่ได้ตั้งค่า Hosting, PWA install หรือ Deploy
