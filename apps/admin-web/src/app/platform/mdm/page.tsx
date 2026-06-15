"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function PlatformMdmPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<any>("/platform/mdm/summary").then(setData).catch((e) => setError(e.message)); }, []);
  return <main className="app-shell"><section className="hero"><div className="kicker">Platform Owner</div><h1>Platform MDM Summary</h1><p className="muted">ดูจำนวนเครื่อง enrollment command failed และ iCloud custody ที่รอปลด แยกตามร้าน</p><a className="btn secondary" href="/platform">กลับ Platform</a></section>{error && <div className="alert bad">{error}</div>}{data && <><div className="grid cols-4"><Metric label="Devices" value={data.totals.devices}/><Metric label="Enrollments" value={data.totals.enrollments}/><Metric label="Commands" value={data.totals.commands}/><Metric label="Failed" value={data.totals.failedCommands}/></div><section className="card" style={{marginTop:16}}><h2>แยกตามร้าน</h2><div className="table-wrap"><table className="table"><thead><tr><th>ร้าน</th><th>เครื่อง</th><th>Enrollment</th><th>iCloud Custody</th></tr></thead><tbody>{data.byStore.map((s:any)=><tr key={s.id}><td>{s.name}</td><td>{s._count.devices}</td><td>{s._count.mdmEnrollments}</td><td>{s._count.appleCustodyRecords}</td></tr>)}</tbody></table></div></section></>}</main>;
}
function Metric({label,value}:{label:string;value:any}){return <section className="card metric"><div className="metric-label">{label}</div><div className="metric-value">{value}</div></section>}
