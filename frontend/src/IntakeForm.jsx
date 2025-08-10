import React, { useState } from 'react';

export default function IntakeForm() {
  const [form, setForm] = useState({
    fullName: '', email: '', dob: '', patientId: '',
    symptoms: '', medicalHistory: '', notes: '', documentsUrls: ''
  });
  const [msg, setMsg] = useState('');

  const set = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setMsg('');
    const res = await fetch('/api/intake', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(form)
    });
    const ok = (await res.json()).success;
    if (ok) {
      setMsg('✅ Submitted');
      setForm({ fullName:'', email:'', dob:'', patientId:'', symptoms:'', medicalHistory:'', notes:'', documentsUrls:'' });
    } else setMsg('❌ Failed');
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Patient Intake</h2>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2"><h3 className="font-semibold mb-2">Patient’s Demographics</h3></div>
        <div>
          <label className="label">Full Name</label>
          <input className="input" value={form.fullName} onChange={e=>set('fullName',e.target.value)} required />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" value={form.email} onChange={e=>set('email',e.target.value)} />
        </div>
        <div>
          <label className="label">Date of Birth</label>
          <input className="input" type="date" value={form.dob} onChange={e=>set('dob',e.target.value)} />
        </div>
        <div>
          <label className="label">Patient ID</label>
          <input className="input" value={form.patientId} onChange={e=>set('patientId',e.target.value)} />
        </div>

        <div className="md:col-span-2 mt-2"><h3 className="font-semibold mb-2">Medical History</h3></div>
        <div className="md:col-span-2">
          <label className="label">Symptoms</label>
          <textarea className="textarea" value={form.symptoms} onChange={e=>set('symptoms',e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Medical History</label>
          <textarea className="textarea" value={form.medicalHistory} onChange={e=>set('medicalHistory',e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Notes</label>
          <textarea className="textarea" value={form.notes} onChange={e=>set('notes',e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Medical Documents and Imaging URLs (comma-separated)</label>
          <input className="input" value={form.documentsUrls} onChange={e=>set('documentsUrls',e.target.value)} placeholder="https://..., https://..." />
        </div>

        <div className="md:col-span-2">
          <button className="btn" type="submit">Submit</button>
          {msg && <span className="ml-3 badge">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
