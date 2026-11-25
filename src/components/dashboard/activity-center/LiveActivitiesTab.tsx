'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RotateCw,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  X,
  FileText,
  Calendar,
  Cloud,
  Server,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface LiveActivitiesTabProps {
  initialPlatform?: string;
  allowedPlatforms?: string[];
  title?: string;
  subtitle?: string;
}

export function LiveActivitiesTab({
  initialPlatform = 'all',
  allowedPlatforms,
  title = 'Live DevOps Activities',
  subtitle = 'Real-time chronological timeline of all cloud, server, and pipeline operations',
}: LiveActivitiesTabProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState(initialPlatform);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected event for slide-over drawer
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Manual note modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualPlatform, setManualPlatform] = useState('application');
  const [manualResource, setManualResource] = useState('');
  const [manualAction, setManualAction] = useState('');
  const [manualStatus, setManualStatus] = useState('success');
  const [manualDetails, setManualDetails] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
      });
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      if (dateFilter) params.set('date', dateFilter);

      const res = await fetch(`/api/activity-center/activities?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Fetch activities error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [platformFilter, statusFilter, dateFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchActivities();
  };

  const handleAddManualNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingManual(true);
    try {
      const res = await fetch('/api/activity-center/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: manualPlatform,
          module: 'manual-note',
          resourceType: 'User Work Item',
          resourceName: manualResource || 'DevOps Task',
          action: manualAction || manualTitle,
          status: manualStatus,
          details: manualDetails,
          source: 'Manual User Note',
          initiator: 'DevOps Engineer',
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setManualTitle('');
        setManualResource('');
        setManualAction('');
        setManualDetails('');
        fetchActivities();
      }
    } catch (err) {
      alert(`Error saving manual activity: ${err}`);
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar & Filters */}
      <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Record Activity Note</span>
            </button>
            <button
              type="button"
              onClick={fetchActivities}
              className="p-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 border border-slate-700/80 transition cursor-pointer"
              title="Refresh Activities"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-800/80">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative md:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resource, action, or user..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#111A2E] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
            />
          </form>

          {/* Platform Filter */}
          {!allowedPlatforms && (
            <div>
              <select
                value={platformFilter}
                onChange={(e) => {
                  setPlatformFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 bg-[#111A2E] border border-slate-700/80 rounded-xl text-xs text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">All Platforms</option>
                <option value="aws">AWS Cloud</option>
                <option value="azure">Azure Cloud</option>
                <option value="onprem">On-Premises / SSH</option>
                <option value="application">Application Modules</option>
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 bg-[#111A2E] border border-slate-700/80 rounded-xl text-xs text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>

          {/* Date Picker Filter */}
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 bg-[#111A2E] border border-slate-700/80 rounded-xl text-xs text-slate-300 font-mono focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 2. Activities Timeline Table */}
      <div className="bg-[#0D1526]/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#111A2E] text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp (IST)</th>
                <th className="py-3 px-4">Platform</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Initiator</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-mono text-xs">
                    <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
                    <span>Loading real-time audit records...</span>
                  </td>
                </tr>
              ) : events.length > 0 ? (
                events.map((evt) => (
                  <tr key={evt._id || evt.eventId} className="hover:bg-[#111A2E]/60 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-cyan-300 whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          evt.platform === 'aws'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : evt.platform === 'azure'
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            : evt.platform === 'onprem'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {evt.platform}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{evt.module}</td>
                    <td className="py-3 px-4 font-medium text-white max-w-[180px] truncate" title={evt.resourceName}>
                      {evt.resourceName}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">{evt.action}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{evt.initiator || 'DevOps Engineer'}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          evt.status === 'success'
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/40'
                            : evt.status === 'failed'
                            ? 'bg-rose-950/40 text-rose-400 border border-rose-500/40'
                            : 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/40'
                        }`}
                      >
                        {evt.status === 'success' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : evt.status === 'failed' ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{evt.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {evt.source || 'Application Event'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(evt)}
                        className="px-2.5 py-1 rounded-lg bg-[#111A2E] hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-mono text-xs">
                    No activities found matching your criteria. Try adjusting your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#090F1C] flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing <strong className="text-white">{events.length}</strong> of{' '}
            <strong className="text-white">{totalCount}</strong> recorded events
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-[#111A2E] hover:bg-[#18233C] text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-cyan-300">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-[#111A2E] hover:bg-[#18233C] text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Slide-over Event Details Drawer Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0C1425] border border-cyan-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-slate-800 bg-[#090F1C] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Activity Event Details</h3>
                <span className="text-[11px] font-mono text-cyan-400">{selectedEvent.eventId}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#080D1A] border border-slate-800 font-mono">
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Platform:</span>
                  <span className="text-white font-bold">{selectedEvent.platform}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Module:</span>
                  <span className="text-cyan-300">{selectedEvent.module}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Status:</span>
                  <span
                    className={
                      selectedEvent.status === 'success'
                        ? 'text-emerald-400 font-bold'
                        : selectedEvent.status === 'failed'
                        ? 'text-rose-400 font-bold'
                        : 'text-indigo-400 font-bold'
                    }
                  >
                    {selectedEvent.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Audit Source:</span>
                  <span className="text-slate-300">{selectedEvent.source}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block uppercase text-[10px]">Timestamp:</span>
                  <span className="text-slate-300">
                    {new Date(selectedEvent.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Action & Resource:</span>
                <p className="text-white font-bold text-sm">{selectedEvent.action}</p>
                <p className="text-slate-300 mt-0.5">{selectedEvent.resourceName} ({selectedEvent.resourceId})</p>
              </div>

              {selectedEvent.details && (
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Execution Details / Output:</span>
                  <pre className="p-3 rounded-xl bg-[#050914] border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedEvent.details}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#090F1C] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-[#111A2E] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Record Manual Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0C1425] border border-cyan-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 bg-[#090F1C] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">Record Manual Work Note</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualNote} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Platform</label>
                  <select
                    value={manualPlatform}
                    onChange={(e) => setManualPlatform(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="aws">AWS Cloud</option>
                    <option value="azure">Azure Cloud</option>
                    <option value="onprem">On-Premises / Server</option>
                    <option value="application">Application Module</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Status</label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="success">Success</option>
                    <option value="in_progress">In Progress</option>
                    <option value="failed">Failed / Blocked</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Target Server or Resource</label>
                <input
                  type="text"
                  required
                  value={manualResource}
                  onChange={(e) => setManualResource(e.target.value)}
                  placeholder="e.g. EC2 Prod-App-01, vm01siva-mon, Docker Registry"
                  className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Action Performed</label>
                <input
                  type="text"
                  required
                  value={manualAction}
                  onChange={(e) => setManualAction(e.target.value)}
                  placeholder="e.g. Configured security group rules, updated SSL certificates"
                  className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Work Notes & Details</label>
                <textarea
                  rows={4}
                  value={manualDetails}
                  onChange={(e) => setManualDetails(e.target.value)}
                  placeholder="Additional context or command summary..."
                  className="w-full px-3 py-2 bg-[#111A2E] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500"
                />
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
                  disabled={savingManual}
                  className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 cursor-pointer disabled:opacity-50"
                >
                  {savingManual ? 'Saving...' : 'Save Activity Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
