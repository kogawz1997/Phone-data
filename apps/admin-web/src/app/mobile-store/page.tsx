import type { ReactNode } from "react";

const customerCards = [
  ["กิตติพงษ์ วงศ์ไทย", "081-234-5678", "สัญญา 2 สัญญา | ยอดค้างชำระ 0 บาท", "ปกติ", "ความเสี่ยงต่ำ", "green", "green"],
  ["นภัสสร เรียบร้อย", "082-345-6789", "สัญญา 1 สัญญา | ยอดค้างชำระ 0 บาท", "ปกติ", "ความเสี่ยงต่ำ", "green", "green"],
  ["ธนพล ศรีสุวรรณ", "083-456-7890", "สัญญา 2 สัญญา | ยอดค้างชำระ 1,250 บาท", "เฝ้าระวัง", "ความเสี่ยงปานกลาง", "orange", "orange"],
  ["วิภาวี จันทร์ทอง", "084-567-8901", "สัญญา 1 สัญญา | ยอดค้างชำระ 3,200 บาท", "ค้างชำระ", "ความเสี่ยงสูง", "red", "red"],
];

const devices = [
  ["iPhone 15 Pro 256GB", "356789123456789", "สาขา เซ็นทรัลลาดพร้าว", "ออนไลน์", "ปกติ", "green", "green", ""],
  ["Samsung Galaxy S24 256GB", "354875123456789", "สาขา เดอะมอลล์บางกะปิ", "ออนไลน์", "ปกติ", "green", "green", "blue"],
  ["Xiaomi 14T 256GB", "866271123456789", "สาขา ฟิวเจอร์พาร์ค", "ออฟไลน์", "ค้าง 1 งวด", "orange", "orange", "dark"],
  ["iPad Air 5 64GB Wi-Fi", "DMPXJ123456789", "สาขา เซ็นทรัลเวสต์เกต", "ออนไลน์", "ปกติ", "green", "green", "tablet"],
];

const contracts = [
  ["CT-2405-000123", "ใช้งานอยู่", "กิตติพงษ์ วงศ์ไทย", "iPhone 15 Pro 256GB", "15 พ.ค. 2567", "15 พ.ค. 2568", "งวดที่ 6 / 12", "ชำระแล้ว 50%", "฿35,900", "green", "50%"],
  ["CT-2404-000098", "ค้างชำระ", "ธนพล ศรีสุวรรณ", "Samsung Galaxy S24 256GB", "20 เม.ย. 2567", "20 เม.ย. 2568", "งวดที่ 5 / 12", "ชำระแล้ว 33%", "฿28,900", "red", "33%"],
];

const overdueItems = [
  ["ธนพล ศรีสุวรรณ", "CT-2404-000098", "฿6,450", "ค้างชำระ 36 วัน", "ติดตามครั้งที่ 2", "โทรติดตามแล้ว 2 ครั้ง ลูกค้ายังไม่สะดวกชำระ", "10 พ.ค. 2567", "orange"],
  ["วิภาวี จันทร์ทอง", "CT-2404-000105", "฿3,200", "ค้างชำระ 61 วัน", "ติดตามครั้งที่ 3", "ลูกค้าแจ้งจะโอนภายในสัปดาห์นี้", "10 พ.ค. 2567", "red"],
  ["สมชาย ใจดี", "CT-2403-000087", "฿9,850", "ค้างชำระ 95 วัน", "เร่งรัดขั้นสูง", "เตรียมส่งหนังสือทวงถาม", "09 พ.ค. 2567", "red"],
];

function MStatus({ label, tone = "green" }: { label: string; tone?: string }) {
  return <span className={`mobile-status ${tone}`}>{label}</span>;
}

function Phone({ title, number, children }: { title: string; number: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mobile-shot-title"><span className="num">{number}</span>{title}</h2>
      <div className="phone-frame">
        <div className="phone-screen">
          <div className="phone-status"><span>9:41</span><span className="right">▴ Wi‑Fi ▰</span></div>
          {children}
        </div>
      </div>
    </section>
  );
}

function AppHeader({ pageTitle, filter = false }: { pageTitle?: string; filter?: boolean }) {
  return (
    <>
      <div className="mobile-app-header">
        <button className="mobile-menu">☰</button>
        <div className="mobile-brand"><span className="mobile-koga">KOGA<small>Lease MDM</small></span></div>
        {filter ? <button className="mobile-filter">▽ ตัวกรอง</button> : <button className="mobile-bell">♧</button>}
      </div>
      {pageTitle ? <div className="mobile-page-title"><h2>{pageTitle}</h2>{filter ? null : <button className="mobile-filter">▽ ตัวกรอง</button>}</div> : null}
    </>
  );
}

function BottomNav({ active }: { active: string }) {
  const items = [["⌂", "หน้าหลัก"], ["◌", "ลูกค้า"], ["▤", "สัญญา"], ["฿", "การเงิน"], ["☷", "เมนู"]];
  return <nav className="bottom-nav">{items.map(([icon, label]) => <span className={label === active ? "active" : ""} key={label}><b>{icon}</b>{label}</span>)}</nav>;
}

function StoreDashboard() {
  return (
    <>
      <AppHeader />
      <div className="mobile-scroll">
        <div className="greeting"><div className="avatar" /><div><h2>สวัสดีครับ, คุณอนนท์</h2><p>เจ้าของร้าน KOGA Mobile Store</p></div></div>
        <div className="mobile-card">
          <div className="mobile-section-title">สิ่งที่ต้องดำเนินการต่อไป <span className="mobile-link">ดูทั้งหมด</span></div>
          <div className="action-list">
            <div className="action-item"><span>▧ สัญญาใกล้ครบกำหนดชำระ</span><span className="badge-count">8</span></div>
            <div className="action-item"><span>▤ ชำระเงินวันนี้</span><span className="badge-count">12</span></div>
            <div className="action-item"><span>▣ อุปกรณ์ต้องตรวจสอบ</span><span className="badge-count">5</span></div>
          </div>
        </div>
        <div className="mobile-card">
          <div className="mobile-section-title">ภาพรวมร้านค้า</div>
          <div className="summary-grid">
            <div className="summary-tile"><span>ลูกค้า</span><strong>128</strong><small>+12 จากเดือนที่แล้ว</small></div>
            <div className="summary-tile"><span>อุปกรณ์</span><strong>235</strong><small>+18 จากเดือนที่แล้ว</small></div>
            <div className="summary-tile"><span>สัญญาที่ใช้งาน</span><strong>172</strong><small>+14 จากเดือนที่แล้ว</small></div>
            <div className="summary-tile"><span>รายได้ที่ยืนยันแล้ว</span><strong>฿1,245,300</strong><small>+8.6% จากเดือนที่แล้ว</small></div>
          </div>
        </div>
        <div className="mobile-card">
          <div className="mobile-section-title">เมนูด่วน</div>
          <div className="quick-grid"><div className="quick-button"><b>▤</b>สัญญา</div><div className="quick-button"><b>฿</b>ชำระเงิน</div><div className="quick-button"><b>◇</b>ตั้งค่า MDM</div><div className="quick-button"><b>▥</b>รายงาน</div></div>
        </div>
      </div>
      <BottomNav active="หน้าหลัก" />
    </>
  );
}

function CustomersMobile() {
  return (
    <><AppHeader pageTitle="ลูกค้า" filter /><div className="mobile-scroll"><input className="search-mobile" placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, เลขบัตร" /><div className="list-stack">{customerCards.map(([name, phone, detail, status, risk, statusTone, riskTone]) => <div className="person-card" key={name}><div className="person-top"><div className="person-main"><div className="person-avatar" /><div><span className="card-name">{name}</span><span className="card-sub">{phone}</span></div></div><MStatus label={status} tone={statusTone} /></div><div className="card-detail">{detail}</div><MStatus label={risk} tone={riskTone} /></div>)}</div></div><BottomNav active="ลูกค้า" /></>
  );
}

function DeviceMobile() {
  return (
    <><AppHeader pageTitle="คลังอุปกรณ์" filter /><div className="mobile-scroll"><input className="search-mobile" placeholder="ค้นหาอุปกรณ์, IMEI, รุ่น" /><div className="list-stack">{devices.map(([name, imei, location, control, payment, controlTone, paymentTone, img]) => <div className="device-card" key={imei}><div className="device-top"><div className="device-main"><div className={`device-img ${img}`} /><div><span className="card-name">{name}</span><span className="card-sub">IMEI: {imei}</span><span className="card-sub">สถานที่: {location}</span></div></div><div style={{display:"grid",gap:6,justifyItems:"end"}}><MStatus label={control} tone={controlTone} /><MStatus label={payment} tone={paymentTone} /></div></div></div>)}</div></div><BottomNav active="เมนู" /></>
  );
}

function ContractsMobile() {
  return (
    <><AppHeader pageTitle="สัญญา" filter /><div className="mobile-scroll"><div className="mobile-tabs"><span className="mobile-tab active">ทั้งหมด</span><span className="mobile-tab">ใช้งานอยู่</span><span className="mobile-tab">ปิดแล้ว</span></div><div className="list-stack">{contracts.map(([id,status,customer,device,start,end,installment,progress,amount,tone,width]) => <div className="contract-card" key={id}><div className="contract-top"><span className="card-name">{id}</span><MStatus label={status} tone={tone} /></div><div className="contract-meta"><span><em>ลูกค้า</em><b>{customer}</b></span><span><em>อุปกรณ์</em><b>{device}</b></span><span><em>เริ่มสัญญา</em><b>{start}</b></span><span><em>สิ้นสุด</em><b>{end}</b></span><span><em>งวด</em><b>{installment}</b></span><span><em>ยอดรวม</em><b>{amount}</b></span></div><div><span className="card-sub">{progress}</span><div className={`progress-bar ${tone === "red" ? "red" : ""}`}><span style={{width}} /></div></div></div>)}</div></div><BottomNav active="สัญญา" /></>
  );
}

function PaymentsMobile() {
  return (
    <><AppHeader pageTitle="ศูนย์ชำระเงิน" filter /><div className="mobile-scroll"><div className="mobile-tabs"><span className="mobile-tab active">คำขอชำระเงิน</span><span className="mobile-tab">สลิปที่รอตรวจสอบ 7</span><span className="mobile-tab">ประวัติการชำระ</span></div><div className="payment-grid-mobile"><div className="mobile-qr-card"><div className="mobile-section-title">QR Code สำหรับชำระเงิน</div><div className="mobile-qr" /><div className="mobile-money">฿8,950.00</div><p className="mobile-muted">สแกนเพื่อชำระเงิน</p><button className="mobile-btn">บันทึก QR Code</button></div><div className="payment-info-card"><div className="mobile-section-title">ข้อมูลการชำระเงิน</div><div className="detail-lines"><span>สัญญา <b>CT-2405-000123</b></span><span>ลูกค้า <b>กิตติพงษ์ วงศ์ไทย</b></span><span>งวดที่ <b>6 / 12</b></span><span>กำหนดชำระ <b>15 พ.ค. 2567</b></span><span>ยอดที่ต้องชำระ <b>฿8,950.00</b></span></div><button className="mobile-btn">แชร์ลิงก์ชำระเงิน</button></div></div><div className="payment-request-card"><div><span className="card-name">นภัสสร เรียบร้อย</span><span className="card-sub">CT-2405-000124 / งวดที่ 4/12</span></div><div><div className="mobile-money">฿7,750.00</div><MStatus label="รอชำระ" tone="orange" /></div></div></div><BottomNav active="การเงิน" /></>
  );
}

function CollectionMobile() {
  return (
    <><AppHeader pageTitle="ติดตามหนี้ค้างชำระ" filter /><div className="mobile-scroll"><div className="overdue-summary"><div className="overdue-tile"><span>ยอดค้างชำระรวม</span><strong>฿128,560</strong><small>22 สัญญา</small></div><div className="overdue-tile orange"><span>ค้างเกิน 30 วัน</span><strong>฿64,320</strong><small>11 สัญญา</small></div><div className="overdue-tile"><span>ค้างเกิน 60 วัน</span><strong>฿64,240</strong><small>11 สัญญา</small></div></div><div className="mobile-tabs"><span className="mobile-tab active">ทั้งหมด</span><span className="mobile-tab">ค้างเกิน 30 วัน</span><span className="mobile-tab">ค้างเกิน 60 วัน</span><span className="mobile-tab">90 วัน+</span></div><div className="list-stack">{overdueItems.map(([name, id, amount, overdue, stage, note, date, tone]) => <div className="overdue-card" key={id}><div className="overdue-top"><div><span className="card-name">{name}</span><span className="card-sub">{id}</span></div><div className="amount">{amount}</div></div><div style={{display:"flex",gap:7,flexWrap:"wrap"}}><MStatus label={overdue} tone="red" /><MStatus label={stage} tone={tone} /></div><p className="note">{note}</p><span className="card-sub">{date}</span></div>)}</div></div><BottomNav active="การเงิน" /></>
  );
}

export default function MobileStorePage() {
  return (
    <main className="mobile-store-board">
      <h1 className="mobile-board-title"><span>KOGA</span> Lease MDM SaaS — Mobile Store Core Pages</h1>
      <div className="mobile-board-grid">
        <Phone number="1" title="Store Dashboard"><StoreDashboard /></Phone>
        <Phone number="2" title="Customers"><CustomersMobile /></Phone>
        <Phone number="3" title="Device Inventory"><DeviceMobile /></Phone>
        <Phone number="4" title="Contracts"><ContractsMobile /></Phone>
        <Phone number="5" title="Payments"><PaymentsMobile /></Phone>
        <Phone number="6" title="Collection"><CollectionMobile /></Phone>
      </div>
    </main>
  );
}
