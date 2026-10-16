import React, { useState, useEffect } from 'react';
import {
  connectGoogleWorkspace,
  disconnectGoogleWorkspace,
  isWorkspaceConnected,
  getWorkspaceAccessToken,
  listDriveFiles,
  createDriveTextFile,
  deleteDriveFile,
  DriveFileItem,
  listTaskLists,
  listTasks,
  createGoogleTask,
  updateGoogleTaskStatus,
  deleteGoogleTask,
  TaskListItem,
  GoogleTask,
  createGoogleDoc,
  getGoogleDoc,
  appendDocText
} from '../services/googleWorkspace';
import {
  FileText,
  CheckSquare,
  HardDrive,
  FolderPlus,
  Trash2,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Calendar,
  Clock,
  UserCheck,
  LogOut,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileCode
} from 'lucide-react';

interface GoogleWorkspaceHubProps {
  onClose?: () => void;
}

export const GoogleWorkspaceHub: React.FC<GoogleWorkspaceHubProps> = ({ onClose }) => {
  const [connected, setConnected] = useState<boolean>(isWorkspaceConnected());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [activeTab, setActiveTab] = useState<'drive' | 'tasks' | 'docs'>('drive');

  // Common Feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Destructive Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    isDanger?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionLabel: '',
    onConfirm: async () => {}
  });

  // --- DRIVE STATE ---
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [driveSearch, setDriveSearch] = useState('');
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('KSRTC_Fleet_Report_' + new Date().toISOString().slice(0, 10) + '.txt');
  const [newFileContent, setNewFileContent] = useState(
    'KSRTC CENTRAL TRAFFIC FLEET REPORT\n' +
    'Date: ' + new Date().toLocaleDateString() + '\n' +
    'Status: Normal Highway Corridor Operations\n' +
    'Route: 152 (Tumkur to Bengaluru Majestic)\n' +
    'Active Telemetry Buses: 18\n' +
    'Notes: GPS geofencing resolution active at 100m.\n'
  );

  // --- TASKS STATE ---
  const [taskLists, setTaskLists] = useState<TaskListItem[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string>('');
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');

  // --- DOCS STATE ---
  const [docsList, setDocsList] = useState<{ documentId: string; title: string; webViewLink?: string }[]>([]);
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('KSRTC Incident & Maintenance Report - ' + new Date().toLocaleDateString());
  const [newDocInitialText, setNewDocInitialText] = useState(
    'KARNATAKA STATE ROAD TRANSPORT CORPORATION\n' +
    'Official Fleet Circular & Maintenance Log\n\n' +
    '1. Fleet Status: Verified GPS Transponders Active\n' +
    '2. Incident Log: Zero critical mechanical failures on NH48 corridor\n' +
    '3. Driver Roster: DRV-101 to DRV-106 active on Morning Express Shift\n'
  );
  const [selectedDocDetails, setSelectedDocDetails] = useState<any | null>(null);
  const [appendNoteText, setAppendNoteText] = useState('');

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Check connection on mount
  useEffect(() => {
    setConnected(isWorkspaceConnected());
  }, []);

  // When connected, load initial data
  useEffect(() => {
    if (connected) {
      if (activeTab === 'drive') {
        loadDriveFiles();
      } else if (activeTab === 'tasks') {
        loadTaskLists();
      } else if (activeTab === 'docs') {
        loadDocs();
      }
    }
  }, [connected, activeTab]);

  // Connect Google Workspace OAuth
  const handleConnect = async () => {
    setIsAuthenticating(true);
    try {
      await connectGoogleWorkspace();
      setConnected(true);
      showStatus('Google Workspace connected successfully! Drive, Tasks, and Docs APIs are enabled.');
    } catch (err: any) {
      showStatus(err.message || 'Failed to connect Google Workspace', 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = () => {
    disconnectGoogleWorkspace();
    setConnected(false);
    setDriveFiles([]);
    setTasks([]);
    setTaskLists([]);
    setDocsList([]);
    showStatus('Disconnected Google Workspace session.');
  };

  // -------------------------------------------------------------
  // DRIVE OPERATIONS
  // -------------------------------------------------------------
  const loadDriveFiles = async () => {
    setLoadingAction(true);
    try {
      const files = await listDriveFiles(driveSearch);
      setDriveFiles(files);
    } catch (err: any) {
      showStatus(err.message || 'Failed to load Google Drive files', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    setLoadingAction(true);
    try {
      await createDriveTextFile(newFileName.trim(), newFileContent);
      setIsNewFileModalOpen(false);
      showStatus(`File "${newFileName}" created in Google Drive!`);
      loadDriveFiles();
    } catch (err: any) {
      showStatus(err.message || 'Failed to create file', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const confirmDeleteFile = (file: DriveFileItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Google Drive File',
      description: `Are you sure you want to delete "${file.name}" from your Google Drive? This operation cannot be undone.`,
      actionLabel: 'Delete File',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteDriveFile(file.id);
          showStatus(`File "${file.name}" deleted from Google Drive.`);
          loadDriveFiles();
        } catch (err: any) {
          showStatus(err.message || 'Failed to delete file', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // -------------------------------------------------------------
  // TASKS OPERATIONS
  // -------------------------------------------------------------
  const loadTaskLists = async () => {
    setLoadingAction(true);
    try {
      const lists = await listTaskLists();
      setTaskLists(lists);
      if (lists.length > 0) {
        const listId = selectedTaskListId || lists[0].id;
        setSelectedTaskListId(listId);
        loadTasksForList(listId);
      }
    } catch (err: any) {
      showStatus(err.message || 'Failed to load Google Task lists', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const loadTasksForList = async (listId: string) => {
    setLoadingAction(true);
    try {
      const taskItems = await listTasks(listId);
      setTasks(taskItems);
    } catch (err: any) {
      showStatus(err.message || 'Failed to load tasks', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedTaskListId) return;

    setLoadingAction(true);
    try {
      await createGoogleTask(selectedTaskListId, {
        title: newTaskTitle.trim(),
        notes: newTaskNotes.trim() || undefined,
        due: newTaskDue ? new Date(newTaskDue).toISOString() : undefined
      });
      setIsNewTaskModalOpen(false);
      setNewTaskTitle('');
      setNewTaskNotes('');
      setNewTaskDue('');
      showStatus('Task created in Google Tasks!');
      loadTasksForList(selectedTaskListId);
    } catch (err: any) {
      showStatus(err.message || 'Failed to create task', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleTaskStatus = async (task: GoogleTask) => {
    const nextStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    try {
      await updateGoogleTaskStatus(selectedTaskListId, task.id, nextStatus);
      showStatus(`Task marked as ${nextStatus === 'completed' ? 'completed' : 'pending'}.`);
      loadTasksForList(selectedTaskListId);
    } catch (err: any) {
      showStatus(err.message || 'Failed to update task status', 'error');
    }
  };

  const confirmDeleteTask = (task: GoogleTask) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Google Task',
      description: `Are you sure you want to permanently delete the task "${task.title}"?`,
      actionLabel: 'Delete Task',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteGoogleTask(selectedTaskListId, task.id);
          showStatus(`Task "${task.title}" deleted.`);
          loadTasksForList(selectedTaskListId);
        } catch (err: any) {
          showStatus(err.message || 'Failed to delete task', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // -------------------------------------------------------------
  // DOCS OPERATIONS
  // -------------------------------------------------------------
  const loadDocs = async () => {
    setLoadingAction(true);
    try {
      // Find docs using Drive files filter for google doc mimeType
      const files = await listDriveFiles('');
      const docs = files.filter(f => f.mimeType === 'application/vnd.google-apps.document');
      setDocsList(docs.map(d => ({ documentId: d.id, title: d.name, webViewLink: d.webViewLink })));
    } catch (err: any) {
      showStatus(err.message || 'Failed to load Google Docs', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    setLoadingAction(true);
    try {
      const created = await createGoogleDoc(newDocTitle.trim(), newDocInitialText);
      setIsNewDocModalOpen(false);
      showStatus(`Google Doc "${created.title}" created successfully!`);
      loadDocs();
    } catch (err: any) {
      showStatus(err.message || 'Failed to create Google Doc', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleInspectDoc = async (docItem: { documentId: string; title: string; webViewLink?: string }) => {
    setLoadingAction(true);
    try {
      const details = await getGoogleDoc(docItem.documentId);
      setSelectedDocDetails({ ...details, webViewLink: docItem.webViewLink });
    } catch (err: any) {
      showStatus(err.message || 'Failed to read Google Doc', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const confirmAppendDoc = () => {
    if (!selectedDocDetails || !appendNoteText.trim()) return;

    setConfirmModal({
      isOpen: true,
      title: 'Update Google Doc Content',
      description: `Append text to "${selectedDocDetails.title}"?\n\nContent to append:\n"${appendNoteText.slice(0, 120)}${appendNoteText.length > 120 ? '...' : ''}"`,
      actionLabel: 'Append Text to Doc',
      isDanger: false,
      onConfirm: async () => {
        try {
          await appendDocText(selectedDocDetails.documentId, appendNoteText);
          showStatus(`Appended content to "${selectedDocDetails.title}"!`);
          setAppendNoteText('');
          handleInspectDoc(selectedDocDetails);
        } catch (err: any) {
          showStatus(err.message || 'Failed to update document', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <div className="bg-[#12151C] border border-[#222735] rounded-3xl p-6 shadow-2xl text-[#E0E0E0] space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222735] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">Google Workspace Fleet Hub</h2>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                Official KSRTC Cloud Ops
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Integrated Google Drive files, Google Tasks dispatch schedules, and Google Docs operational reports.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {connected ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Workspace Connected</span>
              </span>
              <button
                onClick={handleDisconnect}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-[#1A1E29] rounded-xl border border-[#2A3142] transition-colors"
                title="Disconnect Workspace Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Sign in with Google styled button */
            <button
              onClick={handleConnect}
              disabled={isAuthenticating}
              className="flex items-center gap-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold px-4 py-2 rounded-xl shadow-md transition-all text-xs cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isAuthenticating ? 'Authorizing Workspace...' : 'Sign in with Google'}</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-[#222735]"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Global Status Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
              : 'bg-red-500/10 border-red-500/25 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        </div>
      )}

      {/* If not connected, show prominent connect prompt */}
      {!connected ? (
        <div className="bg-[#161922] border border-[#262B3A] rounded-3xl p-8 text-center space-y-5 max-w-2xl mx-auto my-6">
          <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-xl">
            <Layers className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Connect Google Workspace to KSRTC SmartTrack</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-lg mx-auto">
              Authenticate with your Google Account to enable live integration with Google Drive (storing corridor transit permits), Google Tasks (monitoring maintenance schedules), and Google Docs (authoring real-time incident reports).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
            <div className="p-3.5 rounded-2xl bg-[#1A1F2C] border border-[#2A3142] space-y-1">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                <HardDrive className="w-4 h-4" />
                <span>Google Drive</span>
              </div>
              <p className="text-[11px] text-slate-400">Search, upload, and organize KSRTC fleet records securely.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#1A1F2C] border border-[#2A3142] space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckSquare className="w-4 h-4" />
                <span>Google Tasks</span>
              </div>
              <p className="text-[11px] text-slate-400">Manage depot checklists, tyre inspections, and driver duty tasks.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#1A1F2C] border border-[#2A3142] space-y-1">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                <FileText className="w-4 h-4" />
                <span>Google Docs</span>
              </div>
              <p className="text-[11px] text-slate-400">Draft official KSRTC traffic circulars and route incident reports.</p>
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={isAuthenticating}
            className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all text-xs sm:text-sm cursor-pointer disabled:opacity-50"
          >
            <span>{isAuthenticating ? 'Connecting...' : 'Authorize Google Workspace Access'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Connected Workspace Content */
        <div className="space-y-5">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[#222735] pb-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab('drive')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                activeTab === 'drive'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-[#1A1E29]'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Google Drive ({driveFiles.length} Files)</span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                activeTab === 'tasks'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-[#1A1E29]'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Google Tasks ({tasks.length} Tasks)</span>
            </button>

            <button
              onClick={() => setActiveTab('docs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                activeTab === 'docs'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-[#1A1E29]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Google Docs ({docsList.length} Docs)</span>
            </button>
          </div>

          {/* TAB 1: GOOGLE DRIVE */}
          {activeTab === 'drive' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search files in Google Drive..."
                    value={driveSearch}
                    onChange={e => setDriveSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadDriveFiles()}
                    className="w-full bg-[#171B24] border border-[#262B3A] rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={loadDriveFiles}
                    disabled={loadingAction}
                    className="p-2 bg-[#171B24] hover:bg-[#1F2430] border border-[#262B3A] rounded-xl text-slate-300 transition-colors"
                    title="Refresh Files"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingAction ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={() => setIsNewFileModalOpen(true)}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition-colors"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>Create Fleet Document</span>
                  </button>
                </div>
              </div>

              {/* Files Table / List */}
              <div className="bg-[#151821] border border-[#232836] rounded-2xl overflow-hidden">
                <div className="p-3 bg-[#191D28] border-b border-[#232836] flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>File Name</span>
                  <div className="flex items-center gap-8">
                    <span>Modified</span>
                    <span className="w-24 text-right">Actions</span>
                  </div>
                </div>

                <div className="divide-y divide-[#232836] max-h-96 overflow-y-auto">
                  {driveFiles.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      {loadingAction ? 'Loading Google Drive files...' : 'No files found in Google Drive. Click "Create Fleet Document" to add one!'}
                    </div>
                  ) : (
                    driveFiles.map(file => (
                      <div
                        key={file.id}
                        className="p-3 hover:bg-[#1A1F2C] transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            {file.mimeType.includes('document') ? (
                              <FileText className="w-4 h-4" />
                            ) : (
                              <FileCode className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate max-w-sm sm:max-w-md">{file.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">{file.mimeType}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 shrink-0">
                          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                            {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'N/A'}
                          </span>

                          <div className="flex items-center gap-1.5 w-24 justify-end">
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-[#222838] rounded-lg transition-colors"
                                title="Open in Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            <button
                              onClick={() => confirmDeleteFile(file)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-[#222838] rounded-lg transition-colors"
                              title="Delete file (with confirmation)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Task List Selector */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-bold">List:</span>
                  <select
                    value={selectedTaskListId}
                    onChange={e => {
                      setSelectedTaskListId(e.target.value);
                      loadTasksForList(e.target.value);
                    }}
                    className="bg-[#171B24] border border-[#262B3A] rounded-xl px-3 py-1.5 font-bold text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {taskLists.map(list => (
                      <option key={list.id} value={list.id}>
                        {list.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadTasksForList(selectedTaskListId)}
                    disabled={loadingAction}
                    className="p-2 bg-[#171B24] hover:bg-[#1F2430] border border-[#262B3A] rounded-xl text-slate-300 transition-colors"
                    title="Refresh Tasks"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingAction ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={() => setIsNewTaskModalOpen(true)}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Fleet Task</span>
                  </button>
                </div>
              </div>

              {/* Tasks List */}
              <div className="bg-[#151821] border border-[#232836] rounded-2xl divide-y divide-[#232836] max-h-96 overflow-y-auto">
                {tasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    {loadingAction ? 'Loading Google Tasks...' : 'No tasks in this list. Click "Add Fleet Task" to create one!'}
                  </div>
                ) : (
                  tasks.map(task => {
                    const isCompleted = task.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        className={`p-3 hover:bg-[#1A1F2C] transition-colors flex items-start justify-between gap-3 text-xs ${
                          isCompleted ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            onClick={() => handleToggleTaskStatus(task)}
                            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isCompleted
                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                : 'border-[#363E52] hover:border-emerald-400'
                            }`}
                          >
                            {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>

                          <div className="min-w-0 space-y-0.5">
                            <div className={`font-bold text-white ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                              {task.title}
                            </div>
                            {task.notes && (
                              <p className="text-[11px] text-slate-400 whitespace-pre-line">{task.notes}</p>
                            )}
                            {task.due && (
                              <div className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3" />
                                <span>Due: {new Date(task.due).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isCompleted
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {isCompleted ? 'Done' : 'Action'}
                          </span>

                          <button
                            onClick={() => confirmDeleteTask(task)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-[#222838] rounded-lg transition-colors"
                            title="Delete task (with confirmation)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE DOCS */}
          {activeTab === 'docs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  Official KSRTC incident reports, driver circulars, and corridor performance logs synced to Google Docs.
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={loadDocs}
                    disabled={loadingAction}
                    className="p-2 bg-[#171B24] hover:bg-[#1F2430] border border-[#262B3A] rounded-xl text-slate-300 transition-colors"
                    title="Refresh Docs"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingAction ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={() => setIsNewDocModalOpen(true)}
                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Official Google Doc</span>
                  </button>
                </div>
              </div>

              {/* Docs Grid / List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Documents List */}
                <div className="bg-[#151821] border border-[#232836] rounded-2xl p-4 space-y-3">
                  <div className="font-bold text-xs text-white uppercase tracking-wider flex items-center justify-between">
                    <span>Google Documents</span>
                    <span className="text-[10px] text-slate-400 font-mono">{docsList.length} documents</span>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {docsList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        {loadingAction ? 'Searching Google Docs...' : 'No Docs found. Click "Create Official Google Doc" to create one!'}
                      </div>
                    ) : (
                      docsList.map(doc => {
                        const isSelected = selectedDocDetails?.documentId === doc.documentId;
                        return (
                          <div
                            key={doc.documentId}
                            onClick={() => handleInspectDoc(doc)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                              isSelected
                                ? 'bg-purple-600/20 border-purple-500 text-white'
                                : 'bg-[#191D28] border-[#252A38] text-slate-200 hover:border-slate-500'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                              <span className="font-bold truncate">{doc.title}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {doc.webViewLink && (
                                <a
                                  href={doc.webViewLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="p-1 text-slate-400 hover:text-purple-300 transition-colors"
                                  title="Open in Google Docs"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right: Selected Document Detail & Append Note */}
                <div className="bg-[#151821] border border-[#232836] rounded-2xl p-4 space-y-3">
                  <div className="font-bold text-xs text-white uppercase tracking-wider flex items-center justify-between">
                    <span>Document Inspector & Appender</span>
                    {selectedDocDetails?.webViewLink && (
                      <a
                        href={selectedDocDetails.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                      >
                        <span>Open in Google Docs</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {selectedDocDetails ? (
                    <div className="space-y-3 text-xs">
                      <div className="p-3 bg-[#191D28] rounded-xl border border-[#252A38]">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Document Title</div>
                        <div className="font-bold text-white text-sm mt-0.5">{selectedDocDetails.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1">
                          ID: {selectedDocDetails.documentId}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-bold text-slate-300 text-[11px] uppercase">
                          Append Entry / Incident Note
                        </label>
                        <textarea
                          rows={3}
                          value={appendNoteText}
                          onChange={e => setAppendNoteText(e.target.value)}
                          placeholder="e.g. [14:30 IST] Bus KA-01-F-4082 cleared highway inspection corridor at Dobbaspet without delays."
                          className="w-full bg-[#191D28] border border-[#252A38] rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                        />
                        <button
                          onClick={confirmAppendDoc}
                          disabled={!appendNoteText.trim() || loadingAction}
                          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-xl text-xs transition-colors shadow disabled:opacity-50"
                        >
                          Append to Document (with confirmation)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-xs text-slate-400">
                      Select a document on the left to inspect content and append operational notes.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Create Drive File */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#151821] border border-[#2A3142] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2A3142] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-400" />
                <span>Create File in Google Drive</span>
              </h3>
              <button
                onClick={() => setIsNewFileModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFile} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">File Name</label>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  className="w-full bg-[#1B202C] border border-[#2D3548] rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Document Content (Text/Log)</label>
                <textarea
                  rows={6}
                  required
                  value={newFileContent}
                  onChange={e => setNewFileContent(e.target.value)}
                  className="w-full bg-[#1B202C] border border-[#2D3548] rounded-xl p-3 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFileModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:bg-[#1F2533] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow transition-colors"
                >
                  {loadingAction ? 'Uploading to Drive...' : 'Save to Google Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Google Task */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#151821] border border-[#2A3142] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2A3142] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-400" />
                <span>Add Task to Google Tasks</span>
              </h3>
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inspect Airavat Bus Tyre Pressure KA-01-F-4082"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="w-full bg-[#1B202C] border border-[#2D3548] rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Notes / Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Assigned to Depot 4 technician before Route 152 departure."
                  value={newTaskNotes}
                  onChange={e => setNewTaskNotes(e.target.value)}
                  className="w-full bg-[#1B202C] border border-[#2D3548] rounded-xl p-3 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Due Date</label>
                <input
                  type="date"
                  value={newTaskDue}
                  onChange={e => setNewTaskDue(e.target.value)}
                  className="w-full bg-[#1B202C] border border-[#2D3548] rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:bg-[#1F2533] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow transition-colors"
                >
                  {loadingAction ? 'Creating...' : 'Create Google Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create Google Doc */}
      {isNewDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#151821] border border-[#2A3142] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2A3142] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <span>Create Official Google Doc</span>
              </h3>
              <button
                onClick={() => setIsNewDocModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDoc} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={newDocTitle}
                  onChange={e => setNewDocTitle(e.target.value)}
                  className="w-full bg-[#1B202C] border border-[#2D3548] rounded-xl px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Initial Document Text</label>
                <textarea
                  rows={6}
                  value={newDocInitialText}
                  onChange={e => setNewDocInitialText(e.target.value)}
                  className="w-full bg-[#1B202C] border border-[#2D3548] rounded-xl p-3 text-white text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewDocModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:bg-[#1F2533] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow transition-colors"
                >
                  {loadingAction ? 'Creating...' : 'Create Google Doc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY CONFIRMATION MODAL FOR DESTRUCTIVE WORKSPACE OPERATIONS */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#151821] border border-red-500/30 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
                <p className="text-[11px] text-slate-400">Explicit confirmation required for cloud mutation</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed bg-[#191E2A] p-3.5 rounded-2xl border border-[#283144]">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-[#1F2533] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow transition-colors ${
                  confirmModal.isDanger
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                    : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30'
                }`}
              >
                {confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
