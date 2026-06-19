const navItems = [
  ["⌂", "หน้าหลัก"],
  ["◌", "ลูกค้า"],
  ["▣", "คลังเครื่อง"],
  ["▤", "สัญญา"],
  ["฿", "ชำระเงิน"],
  ["◎", "ติดตามงวด"],
  ["◇", "MDM"],
  ["▥", "รายงาน"],
  ["⚙", "ตั้งค่า"],
];

const customerRows = [
  ["กิตติพงษ์ วงศ์ไทย", "081-234-5678", "Active", "Low risk", "2", "25 พ.ค. 2567", "green", "green"],
  ["นภัสสร เรียบร้อย", "082-345-6789", "Active", "Low risk", "1", "24 พ.ค. 2567", "green", "green"],
  ["ธนพล ศรีสุวรรณ", "083-456-7890", "Watchlist", "Medium risk", "2", "24 พ.ค. 2567", "orange", "orange"],
  ["วิภาวี จันทร์ทอง", "084-567-8901", "Delinquent", "High risk", "1", "23 พ.ค. 2567", "red", "red"],
  ["สมชาย ใจดี", "085-678-9012", "Active", "Low risk", "3", "23 พ.ค. 2567", "green", "green"],
  ["อนุชา ศรีสวัสดิ์", "086-789-0123", "On Hold", "Medium risk", "1", "22 พ.ค. 2567", "gray", "orange"],
];

const deviceRows = [
  ["iPhone 15 Pro", "256GB Blue Titanium", "356789123456789", "MDM Controlled", "ผ่อนอยู่", "สาขา เซ็นทรัลลาดพร้าว", "green", "green"],
  ["Samsung Galaxy S24 Ultra", "256GB Titanium Gray", "351234567890123", "MDM Controlled", "ผ่อนอยู่", "สาขา เอ็มควอเทียร์", "green", "green"],
  ["iPhone 14", "128GB Midnight", "359876543210987", "MDM Controlled", "ผ่อนเสร็จ", "พร้อมปล่อย", "green", "blue"],
  ["Xiaomi 14T", "256GB Titan Blue", "865412036598741", "Not Controlled", "ค้าง 1 งวด", "สาขา ฟิวเจอร์พาร์ค", "orange", "orange"],
  ["iPad Air M2", "256GB Space Gray", "DMPXJ2L7Q9", "MDM Controlled", "ผ่อนอยู่", "สาขา เวสต์เกต", "green", "green"],
];

const contractRows = [
  ["KOGA-2026-0018", "กิตติพงษ์ วงศ์ไทย", "iPhone 15 Pro 256GB", "6/24", "฿32,900", "Active", "green", "25%"],
  ["KOGA-2026-0021", "นภัสสร เรียบร้อย", "Samsung S24 Ultra 256GB", "3/24", "฿36,900", "Active", "green", "12%"],
  ["KOGA-2026-0025", "ธนพล ศรีสุวรรณ", "iPhone 14 128GB", "1/24", "฿27,900", "Active", "green", "4%"],
  ["KOGA-2026-0026", "วิภาวี จันทร์ทอง", "Xiaomi 14T 256GB", "ค้าง 1 งวด", "฿21,900", "Overdue", "red", "8%"],
  ["KOGA-2026-0030", "สมชาย ใจดี", "iPad Air M2 256GB", "8/24", "฿28,900", "Active", "green", "33%"],
];

const paymentRequests = [
  ["KOGA-2026-0018", "กิตติพงษ์ วงศ์ไทย", "฿8,900", "ครบกำหนด 25 มิ.ย. 2567"],
  ["KOGA-2026-0021", "นภัสสร เรียบร้อย", "฿9,900", "ครบกำหนด 24 มิ.ย. 2567"],
  ["KOGA-2026-0025", "ธนพล ศรีสุวรรณ", "฿7,900", "ครบกำหนด 23 มิ.ย. 2567"],
  ["KOGA-2026-0030", "สมชาย ใจดี", "฿8,900", "ครบกำหนด 22 มิ.ย. 2567"],
];

const recentPayments = [
  ["รับชำระ KOGA-2026-0015", "฿8,900", "24 พ.ค. 2567 10:25"],
  ["รับชำระ KOGA-2026-0012", "฿7,900", "24 พ.ค. 2567 09:15"],
  ["รับชำระ KOGA-2026-0009", "฿9,900", "23 พ.ค. 2567 16:40"],
];

const collectionRows = [
  ["KOGA-2026-0026", "วิภาวี จันทร์ทอง", "฿8,900", "1 งวด", "25 พ.ค. 2567", "ติดตามครั้งที่ 1", "พัชรี", "orange"],
  ["KOGA-2026-0011", "อนุชา ศรีสวัสดิ์", "฿17,800", "2 งวด", "20 พ.ค. 2567", "ติดตามครั้งที่ 2", "อนันต์", "orange"],
  ["KOGA-2026-0007", "ณัฐพล ธนากร", "฿26,700", "3 งวด", "10 พ.ค. 2567", "ส่งทนายความ", "พัชรี", "red"],
  ["KOGA-2026-0003", "ภัทรวรรณ แซ่ลิ้ม", "฿19,900", "2 งวด", "30 เม.ย. 2567", "เร่งรัดขั้นสูง", "อนันต์", "red"],
];

function Status({ label, tone = "green" }: { label: string; tone?: string }) {
  return <span className={`status ${tone}`}>{label}</span>;
}

function Sidebar({ active }: { active: string }) {
  return (
    <aside className="sidebar" aria-label="KOGA Lease MDM navigation">
      <div className="app-logo-row">
        <div className="logo-k">K</div>
        <div className="app-logo-text">
          <strong>KOGA Lease MDM</strong>
          <small>Store console</small>
        </div>
      </div>
      {navItems.map(([icon, label]) => (
        <div className={`side-link ${label === active ? "active" : ""}`} key={label}>
          <span className="icon">{icon}</span>
          <span>{label}</span>
        </div>
      ))}
      <div className="sidebar-spacer" />
      <div className="store-chip">
        KOGA Store
        <small>tenant isolated</small>
      </div>
    </aside>
  );
}

function BrowserWindow({ title, active, children }: { title: string; active: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="board-shot-title">{title}</h2>
      <div className="browser-window">
        <div className="browser-bar">
          <div className="window-dots"><span /><span /><span /></div>
          <div className="window-brand">KOGA Lease MDM</div>
          <div className="window-tools">⌃⌃</div>
        </div>
        <div className="app-screen">
          <Sidebar active={active} />
          <div className="screen-content">{children}</div>
        </div>
      </div>
    </section>
  );
}

function ScreenHeader({ crumb, title, subtitle, actions }: { crumb: string; title: string; subtitle: string; actions?: React.ReactNode }) {
  return (
    <div className="screen-top">
      <div>
        <div className="crumb">{crumb}</div>
        <h3 className="screen-title">{title}</h3>
        <p className="screen-subtitle">{subtitle}</p>
      </div>
      {actions ? <div className="action-row">{actions}</div> : null}
    </div>
  );
}

function DashboardScreen() {
  return (
    <>
      <ScreenHeader
        crumb="หน้าหลัก / Command Center"
        title="Store Command Center Dashboard"
        subtitle="ภาพรวมการดำเนินงานของร้านค้าในหน้าเดียว"
        actions={<><Status label="Database ready" /><Status label="Tenant isolated" tone="purple" /></>}
      />
      <div className="dashboard-grid">
        <div className="panel hero-card">
          <div>
            <div className="kicker">Priority cockpit</div>
            <h3>ยินดีต้อนรับ, KOGA Store</h3>
            <p>จัดการลูกค้า เครื่อง สัญญา งวด และ MDM ได้อย่างครบจบในระบบเดียว ตรวจสอบงานสำคัญ ติดตามความเสี่ยง และรับชำระเงินได้รวดเร็วขึ้น</p>
          </div>
          <div className="hero-actions">
            <button className="btn-ui primary">จัดการสัญญา</button>
            <button className="btn-ui ghost">ตรวจชำระ 4 รายการ</button>
          </div>
        </div>
        <div className="panel ready-card">
          <div className="panel-title">System readiness</div>
          <strong>READY</strong>
          <small>API, Database, Billing และ Integration Hub พร้อมใช้งาน</small>
          <div className="health-line">● Live health check: Normal</div>
          <div className="chip-row"><Status label="Database ready" /><Status label="Tenant isolated" tone="purple" /></div>
        </div>
      </div>
      <div className="metric-row">
        <div className="metric-mini"><span>ลูกค้า</span><strong>248</strong><small>โปรไฟล์ทั้งหมด</small></div>
        <div className="metric-mini"><span>เครื่อง</span><strong>392</strong><small>181 เครื่องกำลังปล่อย</small></div>
        <div className="metric-mini"><span>สัญญา active</span><strong>164</strong><small>12 ค้าง/ต้องตาม</small></div>
        <div className="metric-mini"><span>รายรับยืนยัน</span><strong>฿1.42M</strong><small>ยอดที่ตรวจแล้ว</small></div>
      </div>
      <div className="bottom-panels">
        <div className="panel">
          <div className="panel-title">งานที่ควรจัดการก่อน</div>
          <div className="task-list">
            <div className="task-item"><span>รายการชำระรอตรวจ</span><b>4</b></div>
            <div className="task-item"><span>สัญญาค้าง / review</span><b>12</b></div>
            <div className="task-item"><span>MDM action รออนุมัติ</span><b>3</b></div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-title">สัญญาที่ต้องจับตา</div>
          {[
            ["KOGA-2026-0018", "กิตติพงษ์ วงศ์ไทย / iPhone 15 Pro / ค้าง 1 งวด"],
            ["KOGA-2026-0021", "ธนพล ศรีสุวรรณ / Samsung S24 Ultra / เสี่ยงสูง"],
            ["KOGA-2026-0030", "วิภาวี จันทร์ทอง / iPad Air M2 / เฝ้าระวัง"],
          ].map(([id, text]) => <div className="risk-item" key={id}><b>{id}</b><small>{text}</small></div>)}
        </div>
        <div className="panel">
          <div className="panel-title">ชำระเงินล่าสุด</div>
          <div className="payment-item"><b>฿8,900 / PromptPay</b><small>รอตรวจสอบ</small></div>
          <div className="payment-item"><b>฿7,900 / QR Payment</b><small>ชำระแล้ว</small></div>
          <div className="payment-item"><b>฿9,900 / Bank Transfer</b><small>รอตรวจสลิป</small></div>
        </div>
      </div>
    </>
  );
}

function CustomersScreen() {
  return (
    <>
      <ScreenHeader
        crumb="ลูกค้า / รายชื่อลูกค้า"
        title="รายชื่อลูกค้า"
        subtitle="จัดการข้อมูลลูกค้าและตรวจสอบสถานะทั้งหมด"
        actions={<><button className="btn-ui ghost">ตัวกรอง</button><button className="btn-ui ghost">ส่งออก</button><button className="btn-ui primary">+ เพิ่มลูกค้า</button></>}
      />
      <div className="toolbar">
        <input className="input-ui" placeholder="ค้นหาชื่อ, เบอร์โทร, เลขบัตร หรืออีเมล" />
        <button className="btn-ui ghost">ตัวกรอง</button>
        <button className="btn-ui ghost">ส่งออก</button>
        <button className="btn-ui primary">+ เพิ่มลูกค้า</button>
      </div>
      <div className="table-and-side">
        <div className="table-shell">
          <table className="data-table">
            <thead><tr><th>ลูกค้า</th><th>เบอร์โทร</th><th>สถานะ</th><th>เครดิต / ความเสี่ยง</th><th>สัญญา</th><th>อัปเดตล่าสุด</th></tr></thead>
            <tbody>
              {customerRows.map(([name, phone, status, risk, contracts, updated, statusTone, riskTone]) => (
                <tr key={name}>
                  <td><span className="name-main">{name}</span><span className="name-sub">Customer profile</span></td>
                  <td>{phone}</td>
                  <td><Status label={status} tone={statusTone} /></td>
                  <td><Status label={risk} tone={riskTone} /></td>
                  <td>{contracts}</td>
                  <td>{updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="summary-card">
          <div className="panel-title">ภาพรวมลูกค้า</div>
          <div className="summary-list">
            <div className="summary-line"><span>ลูกค้าทั้งหมด</span><b>248</b></div>
            <div className="summary-line"><span>Active</span><b>204</b></div>
            <div className="summary-line"><span>On Hold</span><b>16</b></div>
            <div className="summary-line"><span>Delinquent</span><b>18</b></div>
            <div className="summary-line"><span>Blocked</span><b>10</b></div>
          </div>
          <div className="donut" />
          <div className="legend">
            <span><b>Low risk</b><em>60%</em></span>
            <span><b>Medium risk</b><em>25%</em></span>
            <span><b>High risk</b><em>15%</em></span>
          </div>
        </div>
      </div>
    </>
  );
}

function DeviceScreen() {
  return (
    <>
      <ScreenHeader
        crumb="เครื่อง / คลังเครื่อง"
        title="คลังเครื่อง"
        subtitle="ตรวจสอบสต็อกและสถานะการควบคุมเครื่อง"
        actions={<><button className="btn-ui ghost">นำเข้าเครื่อง</button><button className="btn-ui primary">+ เพิ่มเครื่อง</button></>}
      />
      <div className="toolbar">
        <input className="input-ui" placeholder="ค้นหา IMEI / Serial / รุ่น" />
        <select className="select-ui"><option>ทุกแบรนด์</option></select>
        <select className="select-ui"><option>ทุกสถานะ</option></select>
        <button className="btn-ui ghost">ตัวกรอง</button>
      </div>
      <div className="metric-row">
        <div className="metric-mini"><span>ทั้งหมด</span><strong>392</strong><small>เครื่อง</small></div>
        <div className="metric-mini"><span>พร้อมปล่อย</span><strong>181</strong><small>เครื่อง</small></div>
        <div className="metric-mini"><span>ติดตั้งแล้ว</span><strong>145</strong><small>เครื่อง</small></div>
        <div className="metric-mini"><span>รอซ่อม / อื่นๆ</span><strong>66</strong><small>เครื่อง</small></div>
      </div>
      <div className="table-shell">
        <table className="data-table">
          <thead><tr><th>เครื่อง</th><th>รายละเอียด</th><th>IMEI / Serial</th><th>สถานะควบคุม</th><th>สถานะผ่อนชำระ</th><th>ตำแหน่ง</th></tr></thead>
          <tbody>
            {deviceRows.map(([model, detail, imei, control, pay, place, controlTone, payTone]) => (
              <tr key={imei}>
                <td><div className="device-name"><span className="device-thumb" /><span><span className="name-main">{model}</span><span className="name-sub">{detail}</span></span></div></td>
                <td>{detail}</td>
                <td>{imei}</td>
                <td><Status label={control} tone={controlTone} /></td>
                <td><Status label={pay} tone={payTone} /></td>
                <td>{place}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ContractsScreen() {
  return (
    <>
      <ScreenHeader
        crumb="สัญญา / รายการสัญญา"
        title="สัญญาทั้งหมด"
        subtitle="ติดตามสัญญาและความคืบหน้าการผ่อนชำระ"
        actions={<><button className="btn-ui ghost">ส่งออก</button><button className="btn-ui primary">+ สร้างสัญญา</button></>}
      />
      <div className="toolbar">
        <select className="select-ui"><option>ทั้งหมดสถานะ</option></select>
        <input className="input-ui" placeholder="วันที่เริ่มต้น - สิ้นสุด" />
        <input className="input-ui" placeholder="ค้นหาเลขสัญญา / ลูกค้า / เครื่อง" />
        <button className="btn-ui ghost">ตัวกรอง</button>
      </div>
      <div className="table-and-side">
        <div className="table-shell">
          <table className="data-table">
            <thead><tr><th>เลขสัญญา</th><th>ลูกค้า</th><th>เครื่อง</th><th>ความคืบหน้า</th><th>ยอดรวม</th><th>สถานะ</th></tr></thead>
            <tbody>
              {contractRows.map(([id, customer, device, progress, amount, status, tone, width]) => (
                <tr key={id}>
                  <td><span className="name-main">{id}</span></td>
                  <td>{customer}</td>
                  <td>{device}</td>
                  <td>{progress}<div className="progress-mini"><span style={{ width }} /></div></td>
                  <td>{amount}</td>
                  <td><Status label={status} tone={tone} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="summary-card">
          <div className="panel-title">รายละเอียดสัญญา</div>
          <div className="detail-grid">
            <div><span>Contract</span><b>KOGA-2026-0018</b></div>
            <div><span>สถานะ</span><b>Active</b></div>
            <div><span>ลูกค้า</span><b>กิตติพงษ์</b></div>
            <div><span>เบอร์</span><b>081-234-5678</b></div>
            <div><span>เครื่อง</span><b>iPhone 15 Pro</b></div>
            <div><span>เริ่มสัญญา</span><b>25 พ.ค. 2567</b></div>
            <div><span>จำนวนงวด</span><b>24 งวด</b></div>
            <div><span>ชำระแล้ว</span><b>6 งวด</b></div>
            <div><span>ยอดคงเหลือ</span><b>฿24,675</b></div>
          </div>
          <button className="btn-ui primary" style={{ width: "100%", marginTop: 10 }}>ดูรายละเอียดทั้งหมด</button>
        </div>
      </div>
    </>
  );
}

function PaymentsScreen() {
  return (
    <>
      <ScreenHeader
        crumb="ชำระเงิน / Payment Desk"
        title="ศูนย์รับชำระเงิน"
        subtitle="จัดการคำขอชำระเงิน ตรวจสอบสลิป และยืนยันการรับชำระ"
        actions={<><button className="btn-ui ghost">รายงาน</button><button className="btn-ui ghost">ตั้งค่า</button></>}
      />
      <div className="tabs"><span className="tab-ui active">คำขอชำระเงิน</span><span className="tab-ui">สลิปที่รอตรวจสอบ 4</span><span className="tab-ui">ประวัติการรับชำระ</span></div>
      <div className="payment-layout">
        <div className="panel">
          <div className="panel-title">คำขอชำระเงิน</div>
          <div className="payment-list">
            {paymentRequests.map(([id, name, amount, due]) => <div className="payment-card" key={id}><strong>{id}</strong><small>{name}</small><b>{amount}</b><small>{due}</small></div>)}
          </div>
        </div>
        <div className="qr-card">
          <div className="panel-title">QR สำหรับชำระเงิน</div>
          <small>KOGA-2026-0018</small>
          <h3 style={{ margin: "6px 0 0", color: "white", fontSize: 18 }}>฿8,900</h3>
          <small>ครบกำหนด 25 มิ.ย. 2567</small>
          <div className="qr-box" aria-label="QR payment preview" />
          <button className="btn-ui primary" style={{ width: "100%" }}>ดาวน์โหลด QR</button>
          <button className="btn-ui ghost" style={{ width: "100%", marginTop: 7 }}>คัดลอกลิงก์ชำระเงิน</button>
        </div>
        <div className="panel">
          <div className="panel-title">ชำระเงินล่าสุด</div>
          {recentPayments.map(([label, amount, time]) => <div className="recent-item" key={label}><b>{label}</b><small>{amount} / {time}</small></div>)}
        </div>
      </div>
    </>
  );
}

function CollectionScreen() {
  return (
    <>
      <ScreenHeader
        crumb="ติดตามงวด / Collection"
        title="ติดตามทวงถาม"
        subtitle="จัดการงวดค้างชำระ ติดตาม และเร่งรัดการชำระเงิน"
        actions={<><button className="btn-ui ghost">รายงาน</button><button className="btn-ui ghost">ส่งออก</button></>}
      />
      <div className="collection-summary">
        <div className="metric-mini"><span>ค้างชำระทั้งหมด</span><strong>18 สัญญา</strong><small>฿145,600</small></div>
        <div className="metric-mini"><span>ค้าง 1-30 วัน</span><strong>9 สัญญา</strong><small>฿58,900</small></div>
        <div className="metric-mini"><span>ค้าง 31-60 วัน</span><strong>6 สัญญา</strong><small>฿42,300</small></div>
        <div className="metric-mini"><span>ค้าง 61+ วัน</span><strong>3 สัญญา</strong><small>฿44,400</small></div>
      </div>
      <div className="table-and-side">
        <div className="table-shell">
          <table className="data-table">
            <thead><tr><th>สัญญา / ลูกค้า</th><th>ค้างชำระ</th><th>งวดค้าง</th><th>ครบกำหนด</th><th>ขั้นตอน</th><th>ผู้รับผิดชอบ</th></tr></thead>
            <tbody>
              {collectionRows.map(([id, name, amount, count, due, step, owner, tone]) => (
                <tr key={id}>
                  <td><span className="name-main">{id}</span><span className="name-sub">{name}</span></td>
                  <td>{amount}</td>
                  <td>{count}</td>
                  <td>{due}</td>
                  <td><Status label={step} tone={tone} /></td>
                  <td>{owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="summary-card">
          <div className="panel-title">รายละเอียดการติดตาม</div>
          <div className="detail-grid">
            <div><span>สัญญา</span><b>KOGA-2026-0026</b></div>
            <div><span>ลูกค้า</span><b>วิภาวี จันทร์ทอง</b></div>
            <div><span>ยอดค้าง</span><b>฿8,900</b></div>
            <div><span>งวดที่ค้าง</span><b>1 งวด</b></div>
            <div><span>ขั้นตอน</span><b>ติดตามครั้งที่ 1</b></div>
            <div><span>ผู้รับผิดชอบ</span><b>พัชรี</b></div>
          </div>
          <p className="screen-subtitle" style={{ margin: "10px 0" }}>โทรติดตามลูกค้า รับปากชำระภายใน 27 พ.ค. 2567</p>
          <button className="btn-ui primary" style={{ width: "100%" }}>บันทึกการติดตามใหม่</button>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <main className="koga-board">
      <h1 className="board-title"><span>KOGA</span> Lease MDM SaaS — Desktop Core Pages</h1>
      <div className="board-grid">
        <BrowserWindow title="1. Store Command Center Dashboard" active="หน้าหลัก"><DashboardScreen /></BrowserWindow>
        <BrowserWindow title="2. Customers" active="ลูกค้า"><CustomersScreen /></BrowserWindow>
        <BrowserWindow title="3. Device Inventory" active="คลังเครื่อง"><DeviceScreen /></BrowserWindow>
        <BrowserWindow title="4. Contracts" active="สัญญา"><ContractsScreen /></BrowserWindow>
        <BrowserWindow title="5. Payments" active="ชำระเงิน"><PaymentsScreen /></BrowserWindow>
        <BrowserWindow title="6. Collection" active="ติดตามงวด"><CollectionScreen /></BrowserWindow>
      </div>
    </main>
  );
}
