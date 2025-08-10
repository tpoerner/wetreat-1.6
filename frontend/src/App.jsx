import React, { useState } from 'react';
import IntakeForm from './IntakeForm.jsx';
import Admin from './Admin.jsx';

export default function App() {
  const [view, setView] = useState('form');
  const [admin, setAdmin] = useState(false);

  const login = () => {
    const pwd = prompt('Enter admin password:');
    if (!pwd) return;
    localStorage.setItem('admin_password', pwd);
    setAdmin(true);
    setView('admin');
  };
  const logout = () => {
    localStorage.removeItem('admin_password');
    setAdmin(false);
    setView('form');
  };

  return (
    <div>
      <nav className="bg-blue-800 text-white">
        <div className="max-w-5xl mx-auto flex items-center gap-3 p-3">
          <button className="px-3 py-2 rounded-md bg-white text-blue-800 hover:bg-slate-100" onClick={() => setView('form')}>Patient Intake</button>
          <button className="px-3 py-2 rounded-md bg-white text-blue-800 hover:bg-slate-100" onClick={() => admin ? setView('admin') : login()}>Admin Dashboard</button>
          {admin && <button className="px-3 py-2 rounded-md bg-white text-blue-800 hover:bg-slate-100 ml-auto" onClick={logout}>Logout</button>}
        </div>
      </nav>
      <main className="max-w-5xl mx-auto p-4">
        {view === 'form' && <IntakeForm />}
        {view === 'admin' && <Admin />}
      </main>
    </div>
  );
}
