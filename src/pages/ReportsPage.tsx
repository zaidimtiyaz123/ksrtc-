import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Bus, PassengerReport } from '../types';
import { ShieldAlert, CheckCircle2, AlertCircle, ArrowLeft, Send } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const prefillBusId = searchParams.get('bus');

  const [buses, setBuses] = useState<Bus[]>([]);
  const [busId, setBusId] = useState(prefillBusId || '');
  const [reportType, setReportType] = useState('wrong_eta');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [myReports, setMyReports] = useState<PassengerReport[]>([]);

  useEffect(() => {
    api.getBuses().then(res => setBuses(res.buses || [])).catch(() => {});
    api.getReports().then(res => setMyReports(res.reports || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.submitReport({
        bus_id: busId || undefined,
        report_type: reportType,
        description
      });
      setIsSuccess(true);
      setIsSubmitting(false);
      setDescription('');
      api.getReports().then(res => setMyReports(res.reports || [])).catch(() => {});
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to submit report. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#E0E0E0]">
      <div className="border-b border-[#262B35] pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Passenger Grievance & Service Reporting</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Direct communication channel to the KSRTC Central Traffic Control Room
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Report Form */}
        <div className="md:col-span-7 bg-[#161920] rounded-3xl p-6 border border-[#262B35] shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-white">Submit New Commuter Feedback / Incident</h2>

          {isSuccess ? (
            <div className="p-8 text-center space-y-3 bg-[#1C212B] rounded-2xl border border-emerald-500/30">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="font-bold text-sm text-emerald-300">Grievance Registered Successfully</div>
              <p className="text-xs text-slate-300">
                Your report has been dispatched to the KSRTC depot controller for review.
              </p>
              <button
                onClick={() => setIsSuccess(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl mt-2 transition-colors shadow"
              >
                Submit Another Report
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300">
                  {errorMessage}
                </div>
              )}
              <div>
                <label className="block font-bold text-slate-400 uppercase mb-1">Select Bus (Optional)</label>
                <select
                  value={busId}
                  onChange={e => setBusId(e.target.value)}
                  className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 font-medium text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- General Service Feedback (No specific bus) --</option>
                  {buses.map(b => (
                    <option key={b.id} value={b.id} className="bg-[#1C212B] text-white">
                      {b.registration_number} ({b.model}) - Fleet #{b.fleet_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase mb-1">Issue Category</label>
                <select
                  value={reportType}
                  onChange={e => setReportType(e.target.value)}
                  className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 font-medium text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="wrong_eta" className="bg-[#1C212B] text-white">Inaccurate ETA / Unexpected Delay</option>
                  <option value="bus_not_moving" className="bg-[#1C212B] text-white">Bus Stalled or Stationary</option>
                  <option value="missed_stop" className="bg-[#1C212B] text-white">Driver Skipped Designated Bus Shelter</option>
                  <option value="overcrowding" className="bg-[#1C212B] text-white">Severe Overcrowding / Denied Boarding</option>
                  <option value="reckless_driving" className="bg-[#1C212B] text-white">Rash or Unsafe Driving Behavior</option>
                  <option value="other" className="bg-[#1C212B] text-white">Other Public Commuter Feedback</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase mb-1">Description & Location Details</label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Provide specific details, landmark, or stop location..."
                  className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl p-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Transmitting...' : 'Transmit Report to Control Room'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Recent Reports Log */}
        <div className="md:col-span-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Recent Service Reports</h2>
          <div className="space-y-3">
            {myReports.slice(0, 5).map(r => (
              <div key={r.id} className="bg-[#161920] p-4 rounded-2xl border border-[#262B35] text-xs space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 uppercase text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-mono">
                    {r.report_type.replace('_', ' ')}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    r.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-slate-300 leading-snug">{r.description}</p>
                <div className="text-[10px] text-slate-400">
                  Logged: {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
