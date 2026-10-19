export type Section = "home" | "leave" | "profile";

export const navigation: ReadonlyArray<{ id: Section; label: string }> = [
  { id: "home", label: "หน้าหลัก" },
  { id: "leave", label: "การลา" },
  { id: "profile", label: "โปรไฟล์" }
];
