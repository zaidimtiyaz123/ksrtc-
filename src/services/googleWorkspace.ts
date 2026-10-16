import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// Mandatory scopes for Google Drive, Tasks, and Docs
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/tasks.readonly',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/documents.readonly'
];

// In-memory token storage (MANDATORY: Never store in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let cachedFirebaseUser: FirebaseUser | null = null;

// Auth state listener: Clear in-memory token on sign out
onAuthStateChanged(auth, (user) => {
  cachedFirebaseUser = user;
  if (!user) {
    cachedAccessToken = null;
  }
});

export const getWorkspaceAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setWorkspaceAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const isWorkspaceConnected = (): boolean => {
  return !!cachedAccessToken;
};

/**
 * Connect to Google Workspace via Firebase GoogleAuthProvider with required scopes
 */
export const connectGoogleWorkspace = async (): Promise<{ user: FirebaseUser; accessToken: string }> => {
  const provider = new GoogleAuthProvider();
  // Add all Workspace scopes
  WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'offline'
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('Google OAuth succeeded, but failed to extract access token.');
    }

    cachedAccessToken = token;
    cachedFirebaseUser = result.user;
    return { user: result.user, accessToken: token };
  } catch (err: any) {
    console.error('[Google Workspace Auth Error]', err);
    throw new Error(err.message || 'Failed to authenticate with Google Workspace.');
  }
};

export const disconnectGoogleWorkspace = () => {
  cachedAccessToken = null;
};

// ---------------------------------------------------------------------------
// 1. GOOGLE DRIVE API
// ---------------------------------------------------------------------------

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
}

export const listDriveFiles = async (query = ''): Promise<DriveFileItem[]> => {
  if (!cachedAccessToken) {
    throw new Error('Google Workspace is not connected. Please connect with Google first.');
  }

  let url = 'https://www.googleapis.com/drive/v3/files?pageSize=30&fields=files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)&orderBy=modifiedTime desc';
  const qTerms = ['trashed = false'];
  if (query.trim()) {
    qTerms.push(`name contains '${query.replace(/'/g, "\\'")}'`);
  }
  url += `&q=${encodeURIComponent(qTerms.join(' and '))}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch Drive files (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
};

export const createDriveTextFile = async (name: string, content: string, mimeType = 'text/plain'): Promise<DriveFileItem> => {
  if (!cachedAccessToken) {
    throw new Error('Google Workspace is not connected.');
  }

  // Create metadata and content via multipart upload
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name,
    mimeType
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create file in Google Drive (HTTP ${res.status})`);
  }

  return await res.json();
};

export const deleteDriveFile = async (fileId: string): Promise<void> => {
  if (!cachedAccessToken) {
    throw new Error('Google Workspace is not connected.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`
    }
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to delete file from Google Drive (HTTP ${res.status})`);
  }
};

// ---------------------------------------------------------------------------
// 2. GOOGLE TASKS API
// ---------------------------------------------------------------------------

export interface TaskListItem {
  id: string;
  title: string;
  updated?: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  updated?: string;
}

export const listTaskLists = async (): Promise<TaskListItem[]> => {
  if (!cachedAccessToken) {
    throw new Error('Google Workspace is not connected.');
  }

  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch Google Task lists (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.items || [];
};

export const listTasks = async (taskListId: string): Promise<GoogleTask[]> => {
  if (!cachedAccessToken) {
    throw new Error('Google Workspace is not connected.');
  }

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=true&showHidden=true`, {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch tasks (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.items || [];
};

export const createGoogleTask = async (
  taskListId: string,
  task: { title: string; notes?: string; due?: string }
): Promise<GoogleTask> => {
  if (!cachedAccessToken) {
    throw new Error('Google Workspace is not connected.');
  }

  const body: any = {
    title: task.title,
    notes: task.notes || ''
  };
  if (task.due) {
    body.due = task.due;
  }

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create task (HTTP ${res.status})`);
  }

  return await res.json();
};

export const updateGoogleTaskStatus = async (
  taskListId: string,
  taskId: string,
  status: 'completed' | 'needsAction'
): Promise<GoogleTask> => {
  if (!cachedAccessToken) {
    throw new Error('Google Workspace is not connected.');
  }

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to update task status (HTTP ${res.status})`);
  }

  return await res.json();
};

export const deleteGoogleTask = async (taskListId: string, taskId: string): Promise<void> => {
  if (!cachedAccessToken) {
    throw new Error('Google Workspace is not connected.');
  }

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`
    }
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to delete task (HTTP ${res.status})`);
  }
};

// ---------------------------------------------------------------------------
// 3. GOOGLE DOCS API
// ---------------------------------------------------------------------------

export interface GoogleDocSummary {
  documentId: string;
  title: string;
  revisionId?: string;
  bodySnippet?: string;
}

export const createGoogleDoc = async (title: string, initialContent?: string): Promise<{ documentId: string; title: string }> => {
  if (!cachedAccessToken) {
    throw new Error('Google Workspace is not connected.');
  }

  // 1. Create document
  const res = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create Google Doc (HTTP ${res.status})`);
  }

  const doc = await res.json();
  const documentId = doc.documentId;

  // 2. If initial content provided, batchUpdate insertText
  if (initialContent && initialContent.trim()) {
    try {
      await appendDocText(documentId, initialContent);
    } catch (appendErr) {
      console.warn('Document created but initial content append failed:', appendErr);
    }
  }

  return { documentId, title: doc.title };
};

export const getGoogleDoc = async (documentId: string): Promise<any> => {
  if (!cachedAccessToken) {
    throw new Error('Google Workspace is not connected.');
  }

  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to read Google Doc (HTTP ${res.status})`);
  }

  return await res.json();
};

export const appendDocText = async (documentId: string, text: string): Promise<void> => {
  if (!cachedAccessToken) {
    throw new Error('Google Workspace is not connected.');
  }

  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            endOfSegmentLocation: {},
            text: `\n${text}\n`
          }
        }
      ]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to update document text (HTTP ${res.status})`);
  }
};
