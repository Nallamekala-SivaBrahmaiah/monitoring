'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  RotateCw,
  Mail,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  X,
  Send,
  Shield,
  Briefcase,
} from 'lucide-react';

export function EmailRecipientsTab() {
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<any | null>(null);
  const [deletingRecipient, setDeletingRecipient] = useState<any | null>(null);
  const [testingEmail, setTestingEmail] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('Project Manager');
  const [department, setDepartment] = useState('DevOps / Engineering');
  const [group, setGroup] = useState<string>('Sir');
  const [deliveryPreference, setDeliveryPreference] = useState<'TO' | 'CC' | 'BCC'>('TO');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRecipients = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activity-center/recipients');
      if (res.ok) {
        const data = await res.json();
        setRecipients(data.recipients || []);
      }
    } catch (err) {
      console.error('Fetch recipients error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipients();
  }, []);

  const handleOpenAddModal = () => {
    setEditingRecipient(null);
    setName('');
    setEmail('');
    setDesignation('Project Manager');
    setDepartment('Engineering');
    setGroup('Sir');
    setDeliveryPreference('TO');
    setIsActive(true);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (rec: any) => {
    setEditingRecipient(rec);
    setName(rec.name);
    setEmail(rec.email);
    setDesignation(rec.designation || 'DevOps Lead');
    setDepartment(rec.department || 'Engineering');
    setGroup(rec.group || 'Manager');
    setDeliveryPreference(rec.deliveryPreference || 'TO');
    setIsActive(rec.isActive !== undefined ? rec.isActive : true);
    setShowAddModal(true);
  };

  const handleSaveRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        email,
        designation,
        department,
        group,
        deliveryPreference,
        isActive,
      };

      let res: Response;
      if (editingRecipient) {
        res = await fetch(`/api/activity-center/recipients/${editingRecipient._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/activity-center/recipients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save recipient');
      }

      setShowAddModal(false);
      setToastMsg(`Recipient ${name} (${email}) saved successfully!`);
      setTimeout(() => setToastMsg(null), 4000);
      fetchRecipients();
    } catch (err: any) {
      alert(`Error saving recipient: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecipient) return;
    try {
      const res = await fetch(`/api/activity-center/recipients/${deletingRecipient._id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setToastMsg(`Recipient removed successfully.`);
        setTimeout(() => setToastMsg(null), 4000);
        setDeletingRecipient(null);
        fetchRecipients();
      }
    } catch (err: any) {
      alert(`Error deleting recipient: ${err.message}`);
    }
  };

  const handleSendTestEmail = async (targetEmail: string) => {
    setTestingEmail(targetEmail);
    try {
      const res = await fetch('/api/activity-center/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'SMTP delivery failed');
      }
      setToastMsg(`Test verification email sent to ${targetEmail}!`);
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      alert(`Test email error: ${err.message}`);
    } finally {
      setTestingEmail(null);
    }
  };

  const handleToggleActive = async (rec: any) => {
    try {
      await fetch(`/api/activity-center/recipients/${rec._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rec.isActive }),
      });
      fetchRecipients();
    } catch {}
  };

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
          <button type="button" onClick={() => setToastMsg(null)} className="text-emerald-400">
            &times;
          </button>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Email Recipients & Distribution Groups</span>
          </h2>
          <p className="text-xs text-slate-400">
            Designate managers, Sir, project managers, and leads to receive daily DevOps activity summaries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Recipient</span>
          </button>
          <button
            type="button"
            onClick={fetchRecipients}
            className="p-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-slate-700/80 transition cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Recipients Table */}
      <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#111A2E] text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Recipient Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Group</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-mono text-xs">
                    Loading recipients...
                  </td>
                </tr>
              ) : recipients.length > 0 ? (
                recipients.map((rec) => (
                  <tr key={rec._id} className="hover:bg-[#111A2E]/60 transition">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        {rec.name.substring(0, 1).toUpperCase()}
                      </div>
                      <span>{rec.name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-300">{rec.email}</td>
                    <td className="py-3 px-4 text-slate-300">{rec.designation}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        {rec.group}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        {rec.deliveryPreference || 'TO'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(rec)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition cursor-pointer ${
                          rec.isActive
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {rec.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={testingEmail === rec.email}
                          onClick={() => handleSendTestEmail(rec.email)}
                          title="Send test verification email"
                          className="p-1.5 rounded-lg bg-[#111A2E] hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-700/80 transition cursor-pointer disabled:opacity-50"
                        >
                          <Send className={`w-3.5 h-3.5 ${testingEmail === rec.email ? 'animate-pulse text-cyan-400' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(rec)}
                          title="Edit recipient"
                          className="p-1.5 rounded-lg bg-[#111A2E] hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-700/80 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingRecipient(rec)}
                          title="Delete recipient"
                          className="p-1.5 rounded-lg bg-[#111A2E] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700/80 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono text-xs">
                    No recipients configured. Add your managers, Sir, or leads to deliver automatic evening reports.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0C1425] border border-cyan-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 bg-[#090F1C] flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">
                {editingRecipient ? 'Edit Recipient' : 'Add Report Recipient'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecipient} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Siva Sir"
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="manager@company.com"
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs font-mono text-cyan-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Project Manager, Lead"
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Recipient Group</label>
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="HR">HR</option>
                    <option value="Manager">Manager</option>
                    <option value="CTO">CTO</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Work Members">Work Members</option>
                    <option value="DevOps Lead">DevOps Lead</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Sir">Sir</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Delivery Preference</label>
                  <select
                    value={deliveryPreference}
                    onChange={(e) => setDeliveryPreference(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="TO">Direct Recipient (TO)</option>
                    <option value="CC">Carbon Copy (CC)</option>
                    <option value="BCC">Blind Copy (BCC)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Status</label>
                  <div className="flex items-center gap-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-slate-700 bg-[#111A2E] text-cyan-500"
                      />
                      <span>Active Delivery</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#111A2E] text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Recipient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecipient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0C1425] border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-white">Delete Recipient</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete <strong>{deletingRecipient.name}</strong> ({deletingRecipient.email})? They will no longer receive daily reports.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRecipient(null)}
                className="px-4 py-2 rounded-xl bg-[#111A2E] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md shadow-rose-600/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
