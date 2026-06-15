import "./production-systems.css";

type SystemStatus = "ready" | "pilot" | "external" | "build";

type SystemCard = {
  title: string;
  status: SystemStatus;
  description: string;
  items: string[];
};

const statusLabel: Record<SystemStatus, string> = {
  ready: "พร้อมใช้",
  pilot: "พร้อม Pilot",
  external: "รอต่อบริการภายนอก",
  build: "ต้องต่อยอด",
};

const systems: SystemCard[] = [
  {
    title: "Store Onboarding",
    status: "pilot",
    description: "พาร้านตั้งค่าระบบทีละขั้น ตั้งแต่ข้อมูลร้านจนถึง provider readiness",
    items: ["ตั้งค่าร้าน", "เพิ่มเครื่อง", "เพิ่มลูกค้า", "ตั้งค่างวด", "ตรวจ readiness"],
  },
  {
    title: "Contract Wizard",
    status: "pilot",
    description: "สร้างสัญญาแบบเป็นขั้นตอน ลดความผิดพลาดก่อนปล่อยเครื่อง",
    items: ["เลือกลูกค้า", "เลือกเครื่อง", "ตั้งราคา", "สร้างงวด", "ตรวจสรุป"],
  },
  {
    title: "Payment Review",
    status: "ready",
    description: "ตรวจยอดชำระ แนบหลักฐาน ยืนยันหรือปฏิเสธพร้อม audit log",
    items: ["รอตรวจ", "ยืนยันยอด", "ปฏิเสธ", "หมายเหตุ", "ประวัติการตรวจ"],
  },
  {
    title: "Customer Portal",
    status: "pilot",
    description: "ให้ลูกค้าดูยอดค้าง งวดถัดไป QR ชำระเงิน และสถานะสัญญาเอง",
    items: ["ยอดค้าง", "QR", "ประวัติชำระ", "แจ้งชำระ", "ขอปลดเมื่อจ่ายครบ"],
  },
  {
    title: "Collection CRM",
    status: "pilot",
    description: "ติดตามลูกค้าค้างงวดแบบมี timeline และหลักฐานการติดต่อ",
    items: ["โทรแล้ว", "นัดชำระ", "ส่งแจ้งเตือน", "ติดตามซ้ำ", "ส่งต่อทีมกฎหมาย"],
  },
  {
    title: "Store Settings",
    status: "build",
    description: "ย้ายค่าร้านจาก env ไปเป็น settings ที่ร้านจัดการเองได้",
    items: ["โลโก้", "PromptPay", "Grace period", "ค่าปรับ", "รอบแจ้งเตือน"],
  },
  {
    title: "Role & Permission",
    status: "pilot",
    description: "กำหนดสิทธิ์พนักงานตามหน้าที่ ลดการกดผิดและลดความเสี่ยง",
    items: ["Owner", "Manager", "Collection", "Payment Reviewer", "Viewer"],
  },
  {
    title: "Audit Timeline",
    status: "ready",
    description: "เก็บหลักฐานทุก action สำคัญ พร้อม actor, target, timestamp และ metadata",
    items: ["ใครทำ", "ทำอะไร", "เวลา", "เป้าหมาย", "metadata"],
  },
  {
    title: "Notification Center",
    status: "external",
    description: "ศูนย์แจ้งเตือนงวดครบ ค้างชำระ ชำระรอตรวจ และ action รออนุมัติ",
    items: ["LINE", "SMS", "Email", "Webhook", "Mark as read"],
  },
  {
    title: "Template Center",
    status: "pilot",
    description: "จัดการข้อความแจ้งเตือนและเอกสารมาตรฐานของร้าน",
    items: ["แจ้งเตือนงวด", "ค้างชำระ", "ยืนยันรับเงิน", "PDPA", "MDM Consent"],
  },
  {
    title: "Risk Scoring",
    status: "pilot",
    description: "ประเมินความเสี่ยงลูกค้าจากประวัติการชำระและข้อมูลสัญญา",
    items: ["เกรด A-D", "เหตุผล", "ค้างงวด", "หลายสัญญา", "ข้อมูลครบ"],
  },
  {
    title: "Document Center",
    status: "external",
    description: "เก็บเอกสารลูกค้า สัญญา รูปเครื่อง สลิป และ consent อย่างเป็นระบบ",
    items: ["Preview", "Download", "Cloud storage", "Permission", "Archive"],
  },
  {
    title: "Contract PDF",
    status: "build",
    description: "สร้างไฟล์สัญญา PDF พร้อมตารางงวด เงื่อนไข และช่องลายเซ็น",
    items: ["ข้อมูลร้าน", "ข้อมูลลูกค้า", "ข้อมูลเครื่อง", "ตารางงวด", "ลายเซ็น"],
  },
  {
    title: "Digital Consent",
    status: "build",
    description: "เก็บการยอมรับสัญญา PDPA และเงื่อนไขการจัดการอุปกรณ์",
    items: ["Timestamp", "IP", "Device info", "PDPA", "MDM consent"],
  },
  {
    title: "Owner Platform Dashboard",
    status: "pilot",
    description: "เจ้าของแพลตฟอร์มดูภาพรวมร้าน แพ็กเกจ รายได้ และสถานะ trial",
    items: ["ร้านทั้งหมด", "Active store", "Trial", "Subscription", "Usage"],
  },
  {
    title: "SaaS Billing",
    status: "external",
    description: "คิดค่าบริการร้านตามแพ็กเกจ ออก invoice และตรวจ subscription",
    items: ["Plan", "Trial", "Invoice", "Webhook", "Suspend/Resume"],
  },
  {
    title: "Backup & Restore",
    status: "external",
    description: "ระบบป้องกันข้อมูลหายสำหรับ production จริง",
    items: ["Postgres backup", "Export", "Restore drill", "Retention", "Monitoring"],
  },
  {
    title: "Import / Export",
    status: "build",
    description: "นำเข้าลูกค้า/เครื่องจาก CSV และส่งออกรายงานใช้งานจริง",
    items: ["CSV import", "Validation", "Preview", "Error rows", "Export report"],
  },
  {
    title: "In-app Help",
    status: "build",
    description: "คู่มือในระบบสำหรับพนักงานร้าน ใช้ลดงานซัพพอร์ต",
    items: ["คู่มือร้าน", "SOP", "คำถามบ่อย", "Video link", "Checklist"],
  },
];

const gates = [
  "ตั้งค่า domain และ HTTPS จริง",
  "เปลี่ยน secret ทุกตัวก่อนขายจริง",
  "เปิด Postgres backup และทดสอบ restore",
  "ต่อ payment provider หรือกำหนด SOP manual payment",
  "ต่อ LINE/SMS/email สำหรับแจ้งเตือนจริง",
  "ต่อ Android Management API / Apple Business Manager เฉพาะกรณีใช้ MDM จริง",
  "ตรวจเอกสารสัญญาและ consent โดยผู้เชี่ยวชาญ",
  "ทดสอบ pilot กับร้านจริงอย่างน้อย 1 ร้านก่อนขายกว้าง",
];

export default function ProductionSystemsPage() {
  const readyCount = systems.filter((system) => system.status === "ready" || system.status === "pilot").length;
  const externalCount = systems.filter((system) => system.status === "external").length;
  const buildCount = systems.filter((system) => system.status === "build").length;

  return (
    <main className="ps-page">
      <section className="ps-hero">
        <a className="ps-back" href="/">← กลับหน้า Admin</a>
        <div>
          <p className="ps-kicker">KOGA Production Systems Pack</p>
          <h1>ศูนย์ควบคุมระบบก่อนใช้งานจริง</h1>
          <p>
            รวมระบบหลักที่ควรมีสำหรับร้านปล่อยผ่อน / lease-to-own / MDM SaaS พร้อมแยกสถานะว่าอะไรใช้ได้ทันที อะไรพร้อม pilot และอะไรต้องต่อ provider จริงก่อนขาย
          </p>
        </div>
        <div className="ps-score-card">
          <span>Production Coverage</span>
          <strong>{Math.round((readyCount / systems.length) * 100)}%</strong>
          <small>{readyCount}/{systems.length} ระบบพร้อมใช้งานหรือพร้อม pilot</small>
        </div>
      </section>

      <section className="ps-metrics">
        <div><span>Ready / Pilot</span><strong>{readyCount}</strong></div>
        <div><span>External Gate</span><strong>{externalCount}</strong></div>
        <div><span>Build Next</span><strong>{buildCount}</strong></div>
        <div><span>Total Systems</span><strong>{systems.length}</strong></div>
      </section>

      <section className="ps-grid">
        {systems.map((system) => (
          <article key={system.title} className={`ps-card ${system.status}`}>
            <div className="ps-card-head">
              <h2>{system.title}</h2>
              <span>{statusLabel[system.status]}</span>
            </div>
            <p>{system.description}</p>
            <ul>
              {system.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        ))}
      </section>

      <section className="ps-gates">
        <div>
          <p className="ps-kicker">Production Gate</p>
          <h2>ก่อนขายจริงต้องผ่านรายการนี้</h2>
          <p>ฟีเจอร์ในเว็บช่วยให้ระบบดูดีและใช้ง่าย แต่ production จริงต้องผ่าน provider, legal, security และ operation gate ก่อน ไม่งั้นก็เหมือนรถแต่งสวยแต่ยังไม่มีเบรก</p>
        </div>
        <ol>
          {gates.map((gate) => <li key={gate}>{gate}</li>)}
        </ol>
      </section>
    </main>
  );
}
