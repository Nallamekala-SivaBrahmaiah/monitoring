'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Play,
  RotateCw,
  Mail,
  Eye,
  CheckCircle2,
  XCircle,
  Download,
  Calendar,
  X,
  Send,
  Printer,
  Clock,
} from 'lucide-react';

export function DailyReportsTab() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activity-center/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Fetch reports error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateTodayReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/activity-center/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setToastMsg(`Daily report for ${data.report.reportDate} compiled successfully!`);
        setTimeout(() => setToastMsg(null), 4000);
        fetchReports();
        setSelectedReport(data.report);
      }
    } catch (err: any) {
      alert(`Error generating report: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSendReportNow = async (reportId: string) => {
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/activity-center/reports/${reportId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch email');
      }
      setToastMsg(`Report successfully dispatched to active managers & leads!`);
      setTimeout(() => setToastMsg(null), 4000);
      fetchReports();
      if (selectedReport && selectedReport.reportId === reportId) {
        setSelectedReport({ ...selectedReport, deliveryStatus: 'sent' });
      }
    } catch (err: any) {
      alert(`Email dispatch failed: ${err.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
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
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Daily DevOps Activity Reports</span>
          </h2>
          <p className="text-xs text-slate-400">
            Corporate executive summaries sent every evening (6:30 PM IST) to managers, Sir, and technical leads
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={generating}
            onClick={handleGenerateTodayReport}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-600/25 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-white ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Compiling Report...' : 'Compile Today’s Report'}</span>
          </button>
          <button
            type="button"
            onClick={fetchReports}
            className="p-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-slate-700/80 transition cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Reports List Table */}
      <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#111A2E] text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Report Date</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Total Activities</th>
                <th className="py-3 px-4">Deployments</th>
                <th className="py-3 px-4">Troubleshooting</th>
                <th className="py-3 px-4">Recipients</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-mono text-xs">
                    Loading reports list...
                  </td>
                </tr>
              ) : reports.length > 0 ? (
                reports.map((rep) => (
                  <tr key={rep._id || rep.reportId} className="hover:bg-[#111A2E]/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                      {rep.reportDate}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{rep.employeeName}</td>
                    <td className="py-3 px-4 font-mono text-cyan-300 font-bold">
                      {rep.summary?.totalActivities ?? 0}
                    </td>
                    <td className="py-3 px-4 font-mono text-teal-300">
                      {rep.summary?.deploymentsCount ?? 0}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-300">
                      {rep.summary?.troubleshootingCount ?? 0}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {rep.recipients?.length || 0} configured
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          rep.deliveryStatus === 'sent'
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/40'
                            : rep.deliveryStatus === 'failed'
                            ? 'bg-rose-950/40 text-rose-400 border border-rose-500/40'
                            : 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/40'
                        }`}
                      >
                        {rep.deliveryStatus === 'sent' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : rep.deliveryStatus === 'failed' ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{rep.deliveryStatus}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedReport(rep)}
                          className="px-2.5 py-1 rounded-lg bg-[#111A2E] hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          disabled={sendingEmail}
                          onClick={() => handleSendReportNow(rep.reportId)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send Email</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-mono text-xs">
                    No reports generated yet. Click &quot;Compile Today&apos;s Report&quot; to generate an executive daily summary.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Preview & Print Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0C1425] border border-cyan-500/40 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
            <div className="p-4 border-b border-slate-800 bg-[#090F1C] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">
                  Executive Report Preview: {selectedReport.reportDate}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="px-3 py-1.5 rounded-lg bg-[#111A2E] hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Download PDF</span>
                </button>
                <button
                  type="button"
                  disabled={sendingEmail}
                  onClick={() => handleSendReportNow(selectedReport.reportId)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Report Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto bg-[#050914]">
              {selectedReport.htmlContent ? (
                <div
                  dangerouslySetInnerHTML={{ __html: selectedReport.htmlContent }}
                  className="w-full flex justify-center"
                />
              ) : (
                <div className="text-center py-12 text-slate-400 font-mono text-xs">
                  No HTML preview available for this report.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
