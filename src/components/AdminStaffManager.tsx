import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AdminUser } from '../types';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Edit2,
  Shield,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Building,
  Phone,
  Mail,
  X,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';

interface Props {
  onStatusMessage?: (text: string, type: 'success' | 'error') => void;
}

export const AdminStaffManager: React.FC<Props> = ({ onStatusMessage }) => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  // Create Admin Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
    phone: '+91 ',
    admin_level: 'divisional_controller' as const,
    depot: 'Kempegowda Majestic Central Depot',
    permissions: ['fleet_dispatch', 'driver_roster', 'sos_emergency', 'routes_stops']
  });

  // Edit Admin Modal State
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (adminId: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [adminId]: !prev[adminId]
    }));
  };

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdmins();
      setAdmins(res.admins || []);
    } catch (err: any) {
      if (onStatusMessage) {
        onStatusMessage(err.message || 'Failed to fetch admin roster', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.name.trim() || !newAdmin.email.trim()) {
      if (onStatusMessage) onStatusMessage('Name and Email are required', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.createAdmin({
        name: newAdmin.name.trim(),
        email: newAdmin.email.trim().toLowerCase(),
        password: newAdmin.password.trim() || 'ksrtc@admin2025',
        phone: newAdmin.phone.trim(),
        admin_level: newAdmin.admin_level,
        depot: newAdmin.depot,
        permissions: newAdmin.permissions
      });

      if (onStatusMessage) {
        onStatusMessage(`Officer ${res.admin.name} enrolled with administrative access!`, 'success');
      }

      setIsCreateOpen(false);
      setNewAdmin({
        name: '',
        email: '',
        password: '',
        phone: '+91 ',
        admin_level: 'divisional_controller',
        depot: 'Kempegowda Majestic Central Depot',
        permissions: ['fleet_dispatch', 'driver_roster', 'sos_emergency', 'routes_stops']
      });
      fetchAdmins();
    } catch (err: any) {
      if (onStatusMessage) {
        onStatusMessage(err.message || 'Failed to create administrator', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    try {
      setIsSubmitting(true);
      const payload: any = {
        name: editingAdmin.name,
        phone: editingAdmin.phone,
        depot: editingAdmin.depot,
        admin_level: editingAdmin.admin_level,
        status: editingAdmin.status,
        permissions: editingAdmin.permissions
      };
      if (editAdminPassword.trim()) {
        payload.password = editAdminPassword.trim();
      }
      await api.updateAdmin(editingAdmin.id, payload);

      if (onStatusMessage) {
        onStatusMessage(`Officer ${editingAdmin.name} details updated!`, 'success');
      }

      setEditingAdmin(null);
      setEditAdminPassword('');
      fetchAdmins();
    } catch (err: any) {
      if (onStatusMessage) {
        onStatusMessage(err.message || 'Failed to update administrator', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (admin: AdminUser) => {
    if (admin.email === 'moadimtiyaz@gmail.com') {
      if (onStatusMessage) onStatusMessage('Chief Super Administrator cannot be deleted.', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete administrative access for ${admin.name} (${admin.email})?`)) {
      return;
    }

    try {
      await api.deleteAdmin(admin.id);
      if (onStatusMessage) {
        onStatusMessage(`Administrator account ${admin.email} deleted successfully.`, 'success');
      }
      fetchAdmins();
    } catch (err: any) {
      if (onStatusMessage) {
        onStatusMessage(err.message || 'Failed to delete administrator', 'error');
      }
    }
  };

  const handleToggleStatus = async (admin: AdminUser) => {
    if (admin.email === 'moadimtiyaz@gmail.com') {
      if (onStatusMessage) onStatusMessage('Super Administrator cannot be suspended.', 'error');
      return;
    }

    const newStatus = admin.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateAdmin(admin.id, { status: newStatus });
      if (onStatusMessage) {
        onStatusMessage(`Officer ${admin.name} status changed to ${newStatus.toUpperCase()}`, 'success');
      }
      fetchAdmins();
    } catch (err: any) {
      if (onStatusMessage) {
        onStatusMessage(err.message || 'Failed to toggle status', 'error');
      }
    }
  };

  const filteredAdmins = admins.filter(a => {
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      (a.depot && a.depot.toLowerCase().includes(search.toLowerCase())) ||
      (a.phone && a.phone.includes(search));
    const matchLevel = filterLevel === 'all' || a.admin_level === filterLevel;
    return matchSearch && matchLevel;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161920] p-6 rounded-3xl border border-[#262B35] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Security & Personnel Roster</span>
            </span>
            <span className="text-xs text-slate-400">Total Officers: {admins.length}</span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">Divisional Controllers & Admin Staff</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage authorized transit controllers, depot station masters, and emergency response officers with granular role-based permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdmins}
            className="p-2.5 bg-[#1C212B] hover:bg-[#232A37] text-slate-300 rounded-xl border border-[#262B35] transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-amber-600/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New Administrator</span>
          </button>
        </div>
      </div>

      {/* Primary Super Admin Highlight Card */}
      <div className="bg-gradient-to-r from-amber-950/40 via-[#1C212B] to-[#161920] border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-xl shadow-inner shrink-0">
              MI
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-white text-lg">Mohammed Imtiyaz</h3>
                <span className="bg-amber-500 text-black font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Chief Transport Controller & Super Admin
                </span>
                <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Primary Account
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-300 mt-1 flex-wrap font-mono">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  moadimtiyaz@gmail.com
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  +91 99453 23328
                </span>
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-amber-400" />
                  Central Traffic Control HQ (Karnataka State)
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#12151C] border border-[#262B35] rounded-2xl px-4 py-3 text-xs space-y-1 self-start md:self-auto">
            <div className="text-[11px] text-slate-400 uppercase font-bold">Access Scope</div>
            <div className="text-white font-bold">Universal Root Permissions</div>
            <div className="text-[10px] text-emerald-400">All 31 Karnataka Districts • Atomic DB Control</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#161920] p-4 rounded-2xl border border-[#262B35]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by officer name, email, or depot..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#1C212B] border border-[#262B35] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-bold whitespace-nowrap">Filter Level:</span>
          <select
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value)}
            className="bg-[#1C212B] border border-[#262B35] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Administrative Roles</option>
            <option value="super_admin">Super Administrator</option>
            <option value="divisional_controller">Divisional Traffic Controller</option>
            <option value="depot_master">Depot Station Master</option>
            <option value="safety_officer">Fleet Safety & SOS Officer</option>
          </select>
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-[#161920] rounded-3xl border border-[#262B35] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            <span>Loading Administrator Directory...</span>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No administrators match your search query.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#262B35] bg-[#1C212B]/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Officer Details</th>
                    <th className="py-3 px-4">Designation & Role</th>
                    <th className="py-3 px-4">Login Password</th>
                    <th className="py-3 px-4">Depot Assignment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Permissions</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262B35]">
                  {filteredAdmins.map(admin => {
                    const isProtected = admin.email === 'moadimtiyaz@gmail.com';
                    const isPasswordRevealed = revealedPasswords[admin.id];
                    return (
                      <tr key={admin.id} className="hover:bg-[#1C212B]/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{admin.name}</span>
                            {isProtected && (
                              <span className="w-2 h-2 rounded-full bg-amber-400" title="Protected Master Account" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{admin.email}</span>
                            {admin.phone && (
                              <span className="text-slate-500">• {admin.phone}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1 ${
                            admin.admin_level === 'super_admin'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : admin.admin_level === 'divisional_controller'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                : admin.admin_level === 'depot_master'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}>
                            <Shield className="w-3 h-3" />
                            <span>{admin.admin_level?.replace('_', ' ') || 'Admin'}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2 font-mono text-[11px] bg-[#141822] px-2.5 py-1 rounded-lg border border-[#252C3B] w-fit">
                            <Key className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="text-white">
                              {isPasswordRevealed ? (admin.password || 'ksrtc@admin2025') : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(admin.id)}
                              className="text-slate-400 hover:text-white transition-colors ml-1"
                              title={isPasswordRevealed ? 'Hide Password' : 'Show Password'}
                            >
                              {isPasswordRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-slate-200 font-medium">
                            {admin.depot || 'Central Traffic Control HQ'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleStatus(admin)}
                            disabled={isProtected}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                              admin.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            } ${isProtected ? 'cursor-not-allowed opacity-90' : 'cursor-pointer hover:opacity-80'}`}
                            title={isProtected ? 'Protected' : 'Click to toggle status'}
                          >
                            {admin.status}
                          </button>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(admin.permissions || ['all']).slice(0, 3).map(p => (
                              <span
                                key={p}
                                className="text-[9px] bg-[#1C212B] text-slate-300 border border-[#262B35] px-1.5 py-0.5 rounded"
                              >
                                {p.replace('_', ' ')}
                              </span>
                            ))}
                            {(admin.permissions || []).length > 3 && (
                              <span className="text-[9px] text-slate-500 font-mono">
                                +{(admin.permissions || []).length - 3} more
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingAdmin(admin);
                                setEditAdminPassword('');
                              }}
                              className="p-1.5 bg-[#1C212B] hover:bg-[#262D3B] text-slate-300 rounded-lg transition-colors"
                              title="Edit Officer Info"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!isProtected && (
                              <button
                                onClick={() => handleDeleteAdmin(admin)}
                                className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-lg transition-colors border border-red-500/20"
                                title="Delete Administrator"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (eliminates table overflow and horizontal glitch on mobile) */}
            <div className="block md:hidden divide-y divide-[#262B35]">
              {filteredAdmins.map(admin => {
                const isProtected = admin.email === 'moadimtiyaz@gmail.com';
                const isPasswordRevealed = revealedPasswords[admin.id];
                return (
                  <div key={admin.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{admin.name}</span>
                          {isProtected && (
                            <span className="w-2 h-2 rounded-full bg-amber-400" title="Protected Master Account" />
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="break-all">{admin.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setEditingAdmin(admin);
                            setEditAdminPassword('');
                          }}
                          className="p-2 bg-[#1C212B] hover:bg-[#262D3B] text-slate-300 rounded-xl"
                          title="Edit Officer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!isProtected && (
                          <button
                            onClick={() => handleDeleteAdmin(admin)}
                            className="p-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-xl border border-red-500/20"
                            title="Delete Administrator"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={`px-2.5 py-1 rounded-full font-bold uppercase inline-flex items-center gap-1 ${
                        admin.admin_level === 'super_admin'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : admin.admin_level === 'divisional_controller'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        <Shield className="w-3 h-3" />
                        <span>{admin.admin_level?.replace('_', ' ') || 'Admin'}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded bg-[#1C212B] text-slate-300 border border-[#262B35]">
                        {admin.depot || 'HQ Command'}
                      </span>

                      <button
                        onClick={() => handleToggleStatus(admin)}
                        disabled={isProtected}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          admin.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {admin.status}
                      </button>
                    </div>

                    {/* Password field on mobile */}
                    <div className="flex items-center justify-between bg-[#141822] p-2.5 rounded-xl border border-[#252C3B]">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-slate-400">Password:</span>
                        <span className="text-white font-bold">
                          {isPasswordRevealed ? (admin.password || 'ksrtc@admin2025') : '••••••••'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(admin.id)}
                        className="text-xs text-blue-400 hover:text-blue-300 font-bold px-2 py-1 bg-[#1E2330] rounded-lg"
                      >
                        {isPasswordRevealed ? 'Hide' : 'Reveal'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* CREATE ADMIN MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#141720] border border-[#262B35] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#262B35]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Enroll New Administrator</h3>
                  <p className="text-[11px] text-slate-400">Add an authorized officer to the KSRTC control network.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Full Name & Rank</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Gowda (Divisional Traffic Controller)"
                  value={newAdmin.name}
                  onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Official Email ID</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. suresh.gowda@ksrtc.in"
                    value={newAdmin.email}
                    onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Official Mobile (+91)</label>
                  <input
                    type="text"
                    placeholder="+91 98450 12345"
                    value={newAdmin.phone}
                    onChange={e => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                    className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Login Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter officer security password"
                    value={newAdmin.password}
                    onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl pl-3 pr-10 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Tip: Assign a strong security password for officer control room access.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Administrative Role</label>
                  <select
                    value={newAdmin.admin_level}
                    onChange={e => setNewAdmin({ ...newAdmin, admin_level: e.target.value as any })}
                    className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="divisional_controller">Divisional Traffic Controller</option>
                    <option value="depot_master">Depot Station Master</option>
                    <option value="safety_officer">Fleet Safety & SOS Officer</option>
                    <option value="super_admin">Super Administrator (State-wide)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Depot Assignment</label>
                  <select
                    value={newAdmin.depot}
                    onChange={e => setNewAdmin({ ...newAdmin, depot: e.target.value })}
                    className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Kempegowda Majestic Central Depot">Kempegowda Majestic Central Depot</option>
                    <option value="Tumkur Regional Depot">Tumkur Regional Depot</option>
                    <option value="Mysuru Suburban Bus Terminal">Mysuru Suburban Bus Terminal</option>
                    <option value="Hassan Central Division">Hassan Central Division</option>
                    <option value="Hubballi Old Bus Stand Command">Hubballi Old Bus Stand Command</option>
                    <option value="Belagavi North Division">Belagavi North Division</option>
                    <option value="Mangaluru Coastal Division">Mangaluru Coastal Division</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#262B35]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#262B35] text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-amber-600/30 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Enrolling...' : 'Confirm & Save Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ADMIN MODAL */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#141720] border border-[#262B35] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#262B35]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Edit Officer Record</h3>
                  <p className="text-[11px] text-slate-400">{editingAdmin.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAdmin(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAdmin} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Full Name & Designation</label>
                <input
                  type="text"
                  required
                  value={editingAdmin.name}
                  onChange={e => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
                  className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingAdmin.phone || ''}
                    onChange={e => setEditingAdmin({ ...editingAdmin, phone: e.target.value })}
                    className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Status</label>
                  <select
                    value={editingAdmin.status || 'active'}
                    disabled={editingAdmin.email === 'moadimtiyaz@gmail.com'}
                    onChange={e => setEditingAdmin({ ...editingAdmin, status: e.target.value as any })}
                    className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="active">Active (Granted)</option>
                    <option value="suspended">Suspended (Locked Out)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Administrative Role</label>
                  <select
                    value={editingAdmin.admin_level || 'divisional_controller'}
                    disabled={editingAdmin.email === 'moadimtiyaz@gmail.com'}
                    onChange={e => setEditingAdmin({ ...editingAdmin, admin_level: e.target.value as any })}
                    className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="divisional_controller">Divisional Traffic Controller</option>
                    <option value="depot_master">Depot Station Master</option>
                    <option value="safety_officer">Fleet Safety & SOS Officer</option>
                    <option value="super_admin">Super Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Depot Assignment</label>
                  <input
                    type="text"
                    value={editingAdmin.depot || ''}
                    onChange={e => setEditingAdmin({ ...editingAdmin, depot: e.target.value })}
                    className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">
                  Change Officer Login Password
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={`Current password: ${editingAdmin.password || 'ksrtc@admin2025'} (Enter new password to change)`}
                    value={editAdminPassword}
                    onChange={e => setEditAdminPassword(e.target.value)}
                    className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl px-3 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Leave blank if you wish to keep the existing credentials unchanged.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#262B35]">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#262B35] text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Update Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
