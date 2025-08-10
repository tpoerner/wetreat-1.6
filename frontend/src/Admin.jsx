import React, { useEffect, useState } from 'react';

export default function Admin() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [dir, setDir] = useState('DESC');
  const [edit, setEdit] = useState(null);

  const pwd = localStorage.getItem('admin_password') || '';

  const load = async () => {
    const qs = new URLSearchParams({ search, sort, dir }).toString();
    const res = await fetch('/api/patients?' + qs, { headers: { 'X-Admin-Password': pwd } });
    if (res.status === 401) { alert('Unauthorized. Click Admin and enter password again.'); return; }
    setRows(await res.json());
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [sort, dir]);

  const saveConsult = async () => {
    const res = await fetch('/api/patients/' + edit.id + '/consultation', {
      method: 'PUT',
      headers: { 'Content-Type':'application/json', 'X-Admin-Password': pwd },
      body: JSON.stringify({
        physicianName: edit.physicianName,
        physicianEmail: edit.physicianEmail,
        consultationDate: edit.consultationDate,
        recommendations: edit.recommendations
      })
    });
    if (res.ok) { setEdit(null); load(); }
  };

  const del = async (id) => {
    if (!confirm('Delete this record?')) return;
    await fetch('/api/patients/' + id, { method:'DELETE', headers: { 'X-Admin-Password': pwd } });
    load();
  };

  const downloadPdf = async (id) => {
    const r = await fetch('/api/patients/' + id + '/report', { headers: { 'X-Admin-Password': pwd } });
    if (!r.ok) return alert('Failed to generate PDF');
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patient_' + id + '_report.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const links = (s) => (s||'').split(',').map(x=>x.trim()).filter(Boolean).map((u,i)=>(<a key={i} className="text-blue-700 underline hover:text-blue-900 break-all mr-2" href={u} target="_blank" rel="noreferrer">{u}</a>));

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <input className="w-full md:w-64 rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} />
        <button className="inline-flex items-center px-4 py-2 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700" onClick={load}>Search</button>
        <div className="ml-auto flex items-center gap-2">
          <select className="rounded-md border border-slate-300 px-3 py-2" value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="createdAt">Date Created</option>
            <option value="fullName">Name</option>
            <option value="patientId">Patient ID</option>
            <option value="dob">DOB</option>
            <option value="email">Email</option>
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2" value={dir} onChange={e=>setDir(e.target.value)}>
            <option value="DESC">Desc</option>
            <option value="ASC">Asc</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-100">
            <tr>
              {['ID','Created','Name','Email','DOB','Patient ID','Symptoms','History','Notes','Medical Docs & Imaging URLs','Consultation','Actions'].map(h=>(
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map(r => (
              <tr key={r.id} className="align-top">
                <td className="px-3 py-2 text-sm text-slate-800">{r.id}</td>
                <td className="px-3 py-2 text-sm text-slate-800">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 text-sm text-slate-800">{r.fullName}</td>
                <td className="px-3 py-2 text-sm text-slate-800">{r.email}</td>
                <td className="px-3 py-2 text-sm text-slate-800">{r.dob}</td>
                <td className="px-3 py-2 text-sm text-slate-800">{r.patientId}</td>
                <td className="px-3 py-2 text-sm text-slate-800">{r.symptoms}</td>
                <td className="px-3 py-2 text-sm text-slate-800">{r.medicalHistory}</td>
                <td className="px-3 py-2 text-sm text-slate-800">{r.notes}</td>
                <td className="px-3 py-2 text-sm text-slate-800">{links(r.documentsUrls)}</td>
                <td className="px-3 py-2 text-sm text-slate-800">
                  <div className="space-y-1 text-sm">
                    <div><b>Name:</b> {r.physicianName || '—'}</div>
                    <div><b>Email:</b> {r.physicianEmail || '—'}</div>
                    <div><b>Date:</b> {r.consultationDate || '—'}</div>
                    <div><b>Recs:</b> {r.recommendations || '—'}</div>
                  </div>
                </td>
                <td className="px-3 py-2 text-sm text-slate-800">
                  <div className="flex flex-col gap-2">
                    <button className="inline-flex items-center px-4 py-2 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700" onClick={()=>setEdit(r)}>Edit</button>
                    <button className="inline-flex items-center px-4 py-2 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700" onClick={()=>downloadPdf(r.id)}>Generate PDF</button>
                    <button className="inline-flex items-center px-4 py-2 rounded-md font-medium bg-red-700 text-white hover:bg-red-800" onClick={()=>del(r.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length===0 && <tr><td className="px-3 py-2 text-sm" colSpan="12">No records.</td></tr>}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white shadow rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-3">Edit Consultation for #{edit.id}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Physician's Name"  val={edit.physicianName}  onChange={v=>setEdit({...edit, physicianName:v})} />
              <Input label="Physician's Email" val={edit.physicianEmail} onChange={v=>setEdit({...edit, physicianEmail:v})} />
              <Input label="Consultation Date" type="date" val={edit.consultationDate} onChange={v=>setEdit({...edit, consultationDate:v})} />
              <Area  label="Recommendations" className="md:col-span-2" val={edit.recommendations} onChange={v=>setEdit({...edit, recommendations:v})} />
            </div>
            <div className="mt-4 flex gap-2">
              <button className="inline-flex items-center px-4 py-2 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700" onClick={saveConsult}>Save</button>
              <button className="inline-flex items-center px-4 py-2 rounded-md font-medium bg-slate-600 text-white hover:bg-slate-700" onClick={()=>setEdit(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({label, val, onChange, type='text', className=''}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" type={type} value={val || ''} onChange={e=>onChange(e.target.value)} />
    </div>
  );
}
function Area({label, val, onChange, className=''}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <textarea className="w-full rounded-md border border-slate-300 px-3 py-2 h-28 resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500" value={val || ''} onChange={e=>onChange(e.target.value)} />
    </div>
  );
}
