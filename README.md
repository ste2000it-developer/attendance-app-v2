# Attendance App V2

โปรเจกต์เริ่มใหม่จากศูนย์ โดยโฟกัสหน้า Home สำหรับพนักงานก่อน

## ทดลองบน GitHub Pages

เปิด [เว็บไซต์ทดสอบ](https://ste2000it-developer.github.io/attendance-app-v2/)

เมื่อเปิดใช้งาน Pages (Settings → Pages → Source = GitHub Actions) แล้ว ทุกครั้งที่ Push ไปที่ `main` ระบบ GitHub Actions จะ Build และ Deploy หน้าเว็บทดสอบให้อัตโนมัติ

ดูสถานะการ Deploy: [Actions](https://github.com/ste2000it-developer/attendance-app-v2/actions)

## ทดลองบนเครื่อง

```bash
npm install
npm run dev
```

## สถานะ

- React + TypeScript + Vite
- หน้า Home: Fresh & Friendly (เขียวมิ้นต์)
- นาฬิกาปัจจุบัน: ประเทศไทย (Asia/Bangkok)
- เมนูหลัก: วางโครงนำทาง
- ระบบลงเวลา / Firebase / หน้าอื่น / สิทธิ์ผู้ใช้: **ยังไม่เชื่อม**
- ปุ่มเข้างานยังไม่บันทึกข้อมูลจริง; จะแสดงคำอธิบายเมื่อกด

**คำเตือน:** เว็บไซต์นี้ยังเป็นเพียง UI prototype ไม่ใช่ระบบลงเวลาใช้งานจริง
