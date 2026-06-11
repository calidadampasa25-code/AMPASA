'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from './ui/button';
import { SupabaseSidebar, type SidebarItem } from './ui/sidebar';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
}

interface DriveBrowserProps {
  folderId: string;
}

export default function DriveBrowser({ folderId }: DriveBrowserProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<DriveFile[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchScope, setSearchScope] = useState<'current' | 'global'>('current');
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [isGlobalResults, setIsGlobalResults] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Folder navigation support
  const rootFolderId = folderId;
  const [currentFolderId, setCurrentFolderId] = useState<string>(folderId);
  const [folderPath, setFolderPath] = useState<Array<{id: string, name: string}>>([{id: folderId, name: 'Raíz'}]);
  const initialLoaded = useRef(false);

  // Rename state
  const [renamingFile, setRenamingFile] = useState<DriveFile | null>(null);
  const [newName, setNewName] = useState('');

  // Share modal state
  const [shareFile, setShareFile] = useState<DriveFile | null>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'reader' | 'commenter' | 'writer'>('reader');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Context menu for Drive-like right click
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: DriveFile } | null>(null);

  // Upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme and profile menu
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Star/favorite (local for now)
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  // Drag drop visual
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Undo for delete (trash)
  const [lastDeleted, setLastDeleted] = useState<{file: DriveFile, folderId: string} | null>(null);

  // Per-row action menu (three dots like Google Drive)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // View filter for left menu / master list
  const [viewFilter, setViewFilter] = useState<'all' | 'starred' | 'recent'>('all');

  // Create folder modal (Drive-like, nicer than prompt)
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Move destination picker (GD-like folder chooser, no more raw ID prompt)
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [moveFile, setMoveFile] = useState<DriveFile | null>(null); // single file mode
  const [moveBulkIds, setMoveBulkIds] = useState<string[]>([]);
  const [pickerFolders, setPickerFolders] = useState<DriveFile[]>([]);
  const [pickerCurrentId, setPickerCurrentId] = useState<string>('');
  const [pickerPath, setPickerPath] = useState<Array<{id: string; name: string}>>([]);

  // Master computed list for filters (starred/recent) + search results; used in list+grid
  const displayedFiles = useMemo(() => {
    let items = [...files];
    if (viewFilter === 'starred') {
      items = items.filter(f => starredIds.has(f.id));
    }
    if (viewFilter === 'recent') {
      items = [...items].sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
    }
    return items;
  }, [files, viewFilter, starredIds]);

  const fetchFiles = async (searchTerm?: string, scope?: 'current' | 'global', options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    setError(null);

    const cacheKey = `${currentFolderId}:${searchTerm || ''}:${scope || searchScope}`;
    const winCache = (window as any).__driveListCache;
    if (winCache && winCache.key === cacheKey && Date.now() - winCache.time < 30000) {
      const cached = winCache.data;
      setFiles(cached);
      setFilteredFiles(cached);
      if (!silent) setLoading(false);
      setIsGlobalResults(!!searchTerm && (scope || searchScope) === 'global');
      return;
    }

    try {
      const effectiveScope = scope || searchScope;
      const effectiveSearch = (searchTerm ?? '').trim();

      const params = new URLSearchParams();
      if (effectiveSearch) {
        params.set('search', effectiveSearch);
      }
      // Include folderId only for current-folder context (or when no search)
      if (!effectiveSearch || effectiveScope === 'current') {
        params.set('folderId', currentFolderId);
      }
      // For global + search: no folderId -> fullText across accessible Drive

      const query = params.toString();
      const res = await fetch(`/api/drive/list${query ? `?${query}` : ''}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al obtener documentos de Google Drive.');
      }
      const data = await res.json();
      const fetchedFiles: DriveFile[] = data.files || [];
      setFiles(fetchedFiles);
      setFilteredFiles(fetchedFiles);
      setIsGlobalResults(!!effectiveSearch && effectiveScope === 'global');
      // cache
      (window as any).__driveListCache = { key: cacheKey, data: fetchedFiles, time: Date.now() };
    } catch (err: any) {
      setError(err.message || 'Error al cargar documentos de Drive. Verifica que el service account tenga acceso a la carpeta.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialLoaded.current) {
      initialLoaded.current = true;
      // @ts-ignore clear client cache on mount to destroy any ghost folders from previous sessions or external deletes
      (window as any).__driveListCache = null;
      fetchFilesForFolder(currentFolderId);
    }
  }, []);

  // Theme init and persist
  useEffect(() => {
    const saved = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    setTheme(saved);
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Load starred from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('starredIds');
    if (saved) setStarredIds(new Set(JSON.parse(saved)));
  }, []);

  const toggleStar = (id: string) => {
    const newSet = new Set(starredIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setStarredIds(newSet);
    localStorage.setItem('starredIds', JSON.stringify([...newSet]));
  };

  // Bulk select
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.size} elementos?`)) return;
    for (const id of selectedIds) {
      await fetch(`/api/drive/delete?fileId=${id}`, { method: 'DELETE' });
    }
    clearSelection();
    fetchFilesForFolder(currentFolderId);
  };

  const bulkMove = async () => {
    if (selectedIds.size === 0) return;
    openMovePicker(); // will use moveBulkIds
  };

  // Debounced search - always global for better findability (like real Google Drive)
  // Silent to avoid hiding the list
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search.trim() === '') {
        fetchFilesForFolder(currentFolderId, true);
      } else {
        // Force global scope when searching so it finds files in subfolders (Formatos, etc.)
        fetchFiles(search, 'global', { silent: true });
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, currentFolderId]);

  // Close context menu on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      // Close unless click inside a menu item (the menu itself handles)
      if (contextMenu) {
        // simple: close on any click not from the menu (menu stops)
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('click', handleOutside, { once: true });
    }
    return () => document.removeEventListener('click', handleOutside);
  }, [contextMenu]);

  // Auto sync with Drive on tab focus/visibility (fixes stale folders deleted externally) - silent background refresh
  useEffect(() => {
    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        // Silent refresh: don't show full loading or clear UI, just update data in background
        fetchFilesForFolder(currentFolderId, true); // true = silent
      }
    };
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);
    return () => {
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, [currentFolderId]);

  // Upload handler
  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      if (!confirm(`El archivo es grande (${(file.size / 1024 / 1024).toFixed(1)} MB). La subida puede tardar mucho o usar mucha memoria. ¿Continuar?`)) return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', currentFolderId);
    try {
      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al subir archivo');
      }
      fetchFilesForFolder(currentFolderId);
    } catch (e: any) {
      alert('Error subiendo: ' + e.message);
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId: currentFolderId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al crear carpeta');
      }
      setShowCreateFolder(false);
      setNewFolderName('');
      fetchFilesForFolder(currentFolderId);
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const openCreateFolder = () => {
    setNewFolderName('');
    setShowCreateFolder(true);
  };

  const closeCreateFolder = () => {
    setShowCreateFolder(false);
    setNewFolderName('');
  };

  // Folder picker for move destination
  const loadPickerFolders = async (folderId: string) => {
    try {
      const res = await fetch(`/api/drive/list?folderId=${folderId}`);
      if (!res.ok) throw new Error('No se pudieron cargar carpetas');
      const data = await res.json();
      const folders = (data.files || []).filter((f: DriveFile) => isFolder(f));
      setPickerFolders(folders);
    } catch (e) {
      setPickerFolders([]);
    }
  };

  const openMovePicker = (file?: DriveFile) => {
    const startId = currentFolderId;
    const startName = folderPath[folderPath.length-1]?.name || 'Actual';
    setPickerCurrentId(startId);
    setPickerPath([{ id: startId, name: startName }]);
    setMoveFile(file || null);
    setMoveBulkIds(file ? [] : Array.from(selectedIds));
    setShowMovePicker(true);
    setContextMenu(null);
    loadPickerFolders(startId);
  };

  const closeMovePicker = () => {
    setShowMovePicker(false);
    setMoveFile(null);
    setMoveBulkIds([]);
    setPickerFolders([]);
    setPickerPath([]);
  };

  const navigatePicker = (folderId: string, folderName: string) => {
    const newPath = [...pickerPath, { id: folderId, name: folderName }];
    setPickerPath(newPath);
    setPickerCurrentId(folderId);
    loadPickerFolders(folderId);
  };

  const goPickerBack = () => {
    if (pickerPath.length <= 1) return;
    const newPath = pickerPath.slice(0, -1);
    const prev = newPath[newPath.length-1];
    setPickerPath(newPath);
    setPickerCurrentId(prev.id);
    loadPickerFolders(prev.id);
  };

  const goPickerRoot = () => {
    const rootId = rootFolderId;
    setPickerCurrentId(rootId);
    setPickerPath([{ id: rootId, name: 'Raíz' }]);
    loadPickerFolders(rootId);
  };

  const confirmMove = async (targetId: string) => {
    if (!targetId) return;
    if (targetId === currentFolderId && !moveBulkIds.length && moveFile && isFolder(moveFile)) {
      // no-op for folders sometimes
    }
    try {
      if (moveBulkIds.length > 0) {
        for (const id of moveBulkIds) {
          await fetch('/api/drive/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId: id, newParentId: targetId, removeParents: currentFolderId }),
          });
        }
        clearSelection();
      } else if (moveFile) {
        const res = await fetch('/api/drive/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: moveFile.id, newParentId: targetId, removeParents: currentFolderId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Error al mover');
        }
        if (selectedFile?.id === moveFile.id) setSelectedFile(null);
      }
      fetchFilesForFolder(currentFolderId);
      closeMovePicker();
    } catch (e: any) {
      alert('Error al mover: ' + e.message);
    }
  };

  const selectCurrentAsTarget = () => {
    confirmMove(pickerCurrentId);
  };

  const handleDelete = async (file: DriveFile) => {
    if (!confirm(`¿Eliminar "${file.name}"? Se moverá a la papelera de Drive.`)) return;
    const folderAtDelete = currentFolderId;
    try {
      const res = await fetch(`/api/drive/delete?fileId=${file.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      fetchFilesForFolder(currentFolderId);
      if (selectedFile?.id === file.id) setSelectedFile(null);
      if (shareFile?.id === file.id) closeShare();
      if (renamingFile?.id === file.id) cancelRename();
      // Save for undo
      setLastDeleted({ file, folderId: folderAtDelete });
      // Auto clear undo after 10s
      setTimeout(() => setLastDeleted(null), 10000);
    } catch (e: any) {
      alert('Error eliminando: ' + e.message);
    }
  };

  const undoDelete = async () => {
    if (!lastDeleted) return;
    try {
      await fetch(`/api/drive/delete?fileId=${lastDeleted.file.id}&restore=true`, { method: 'DELETE' });
      fetchFilesForFolder(lastDeleted.folderId);
      setLastDeleted(null);
    } catch (e: any) {
      alert('No se pudo deshacer: ' + e.message);
    }
  };

  const handleMove = async (file: DriveFile) => {
    openMovePicker(file);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', { 
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatSize = (size?: string) => {
    if (!size) return '-';
    const bytes = parseInt(size);
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (file: DriveFile) => {
    if (file.iconLink) return file.iconLink;
    if (file.mimeType.includes('folder')) return '📁';
    if (file.mimeType.includes('pdf')) return '📄';
    if (file.mimeType.includes('spreadsheet')) return '📊';
    if (file.mimeType.includes('document')) return '📝';
    return '📄';
  };

  const isFolder = (file: DriveFile) => file.mimeType.includes('folder');

  // Drag & drop for internal moves (GD-like: drag items onto folders to move)
  const handleDragStart = (e: React.DragEvent, file: DriveFile) => {
    setDraggedItemId(file.id);
    e.dataTransfer.setData('text/plain', file.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverFolderId(null);
  };
  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    if (draggedItemId === folderId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };
  const handleFolderDragLeave = () => setDragOverFolderId(null);
  const handleFolderDrop = async (e: React.DragEvent, targetFolder: DriveFile) => {
    e.preventDefault();
    setDragOverFolderId(null);
    const id = e.dataTransfer.getData('text/plain') || draggedItemId;
    setDraggedItemId(null);
    if (!id || id === targetFolder.id) return;
    try {
      await fetch('/api/drive/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: id, newParentId: targetFolder.id, removeParents: currentFolderId }),
      });
      fetchFilesForFolder(currentFolderId);
      if (selectedFile?.id === id) setSelectedFile(null);
      if (selectedIds.has(id)) {
        const ns = new Set(selectedIds); ns.delete(id); setSelectedIds(ns);
      }
    } catch {
      alert('No se pudo mover el elemento');
    }
  };

  const handleFileClick = (file: DriveFile) => {
    setSelectedFile(file);
  };

  const closeDetails = () => setSelectedFile(null);

  const openPreview = (file: DriveFile) => {
    if (isFolder(file)) return;
    setPreviewFile(file);
    setPreviewLoading(true);
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewLoading(false);
  };

  // Navigation helpers
  const navigateIntoFolder = (folderIdToOpen: string, folderName?: string) => {
    const name = folderName || 'Carpeta';
    setFolderPath(prev => [...prev, {id: folderIdToOpen, name}]);
    setCurrentFolderId(folderIdToOpen);
    setSearch('');
    setIsGlobalResults(false);
    setSelectedFile(null);
    fetchFilesForFolder(folderIdToOpen);
  };

  const goBack = () => {
    if (folderPath.length <= 1) return;
    const newPath = folderPath.slice(0, -1);
    const prev = newPath[newPath.length - 1];
    setFolderPath(newPath);
    setCurrentFolderId(prev.id);
    setSearch('');
    setIsGlobalResults(false);
    setSelectedFile(null);
    fetchFilesForFolder(prev.id);
  };

  const navigateToPathIndex = (index: number) => {
    if (index < 0 || index >= folderPath.length) return;
    const target = folderPath[index];
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    setCurrentFolderId(target.id);
    setSearch('');
    setIsGlobalResults(false);
    setSelectedFile(null);
    fetchFilesForFolder(target.id);
  };

  const goToRoot = () => {
    setFolderPath([{ id: rootFolderId, name: 'Raíz' }]);
    setCurrentFolderId(rootFolderId);
    setSearch('');
    setIsGlobalResults(false);
    setSelectedFile(null);
    setViewFilter('all');
    fetchFilesForFolder(rootFolderId);
  };

  const fetchFilesForFolder = async (folderIdToLoad: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ folderId: folderIdToLoad });
      const res = await fetch(`/api/drive/list?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al cargar la carpeta.');
      }
      const data = await res.json();
      const fetchedFiles: DriveFile[] = data.files || [];
      setFiles(fetchedFiles);
      setFilteredFiles(fetchedFiles);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la carpeta de Drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileOrFolderDoubleClick = (file: DriveFile) => {
    if (isFolder(file)) {
      navigateIntoFolder(file.id, file.name);
    } else {
      openPreview(file);
    }
  };

  // Rename
  const startRename = (file: DriveFile) => {
    setRenamingFile(file);
    setNewName(file.name);
    closeShare();
    setContextMenu(null);
  };

  const cancelRename = () => {
    setRenamingFile(null);
    setNewName('');
  };

  const saveRename = async () => {
    if (!renamingFile || !newName.trim()) return;
    try {
      const res = await fetch('/api/drive/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: renamingFile.id, name: newName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al renombrar');
      }
      const updatedName = newName.trim();
      // Optimistic update
      setFiles(prev => prev.map(f => f.id === renamingFile.id ? { ...f, name: updatedName } : f));
      setFilteredFiles(prev => prev.map(f => f.id === renamingFile.id ? { ...f, name: updatedName } : f));
      if (selectedFile?.id === renamingFile.id) {
        setSelectedFile({ ...selectedFile, name: updatedName });
      }
      if (shareFile?.id === renamingFile.id) {
        setShareFile({ ...shareFile, name: updatedName });
      }
      cancelRename();
    } catch (e: any) {
      alert('Error al renombrar: ' + e.message);
    }
  };

  // Share
  const openShare = async (file: DriveFile) => {
    setShareFile(file);
    setShareEmail('');
    setShareRole('reader');
    setShareError(null);
    setPermissions([]);
    setContextMenu(null);
    setRenamingFile(null);
    await loadPermissions(file.id);
  };

  const closeShare = () => {
    setShareFile(null);
    setPermissions([]);
    setShareEmail('');
    setShareError(null);
    setShareLoading(false);
  };

  const loadPermissions = async (fileId: string) => {
    setShareLoading(true);
    try {
      const res = await fetch(`/api/drive/permissions?fileId=${fileId}`);
      if (!res.ok) throw new Error('Error al cargar permisos');
      const data = await res.json();
      setPermissions(data.permissions || []);
    } catch (e: any) {
      setShareError(e.message);
    } finally {
      setShareLoading(false);
    }
  };

  const addPermission = async () => {
    if (!shareFile) return;
    if (!shareEmail.trim()) {
      setShareError('Ingresa un email');
      return;
    }
    setShareLoading(true);
    setShareError(null);
    try {
      const res = await fetch('/api/drive/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: shareFile.id,
          emailAddress: shareEmail.trim(),
          role: shareRole,
          type: 'user',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al compartir');
      }
      setShareEmail('');
      await loadPermissions(shareFile.id);
    } catch (e: any) {
      setShareError(e.message);
    } finally {
      setShareLoading(false);
    }
  };

  const removePermission = async (permissionId: string) => {
    if (!shareFile) return;
    setShareLoading(true);
    try {
      const res = await fetch(`/api/drive/permissions?fileId=${shareFile.id}&permissionId=${permissionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error al quitar el permiso');
      await loadPermissions(shareFile.id);
    } catch (e: any) {
      setShareError(e.message);
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareFile?.webViewLink) return;
    try {
      await navigator.clipboard.writeText(shareFile.webViewLink);
      // Simple feedback
      const original = shareFile.webViewLink;
      // Could use a temp state, but for now alert is fine or just do it
    } catch {
      // fallback
      prompt('Copia este enlace:', shareFile.webViewLink);
    }
  };

  // Context menu
  const closeContextMenu = () => setContextMenu(null);

  // Close context on outside click (simple)
  // We'll add a global listener in useEffect later if needed, for now menu closes on action or next click on items.

  const getDownloadUrl = (file: DriveFile) => {
    const params = new URLSearchParams({
      fileId: file.id,
      name: file.name,
      mimeType: file.mimeType,
    });
    return `/api/drive/download?${params.toString()}`;
  };

  const getPreviewUrl = (file: DriveFile) => {
    const params = new URLSearchParams({
      fileId: file.id,
      name: file.name,
      mimeType: file.mimeType,
      inline: 'true',
    });
    return `/api/drive/download?${params.toString()}`;
  };

  const handlePreview = (file: DriveFile) => {
    openPreview(file);
  };

  const handlePrint = (file: DriveFile) => {
    openPreview(file);
    // Print will be triggered from within the modal after iframe loads (user can also click Imprimir there)
  };

  const handleDownload = async (file: DriveFile) => {
    try {
      const url = getDownloadUrl(file);
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo descargar el archivo');
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (e: any) {
      alert('Error al descargar: ' + (e.message || 'Intenta de nuevo'));
    }
  };

  // Print the content inside the preview iframe (called from modal)
  const printPreviewContent = () => {
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch {
        // Fallback
        window.print();
      }
    } else {
      window.print();
    }
  };

  if (loading && files.length === 0) {
    return <div className="p-8 text-center">Cargando documentos de Google Drive...</div>;
  }

  if (error) {
    let title = "Error al cargar documentos";
    let message = error;
    let advice = "Asegúrate de que el archivo service-account-key.json esté en la raíz del proyecto y que la carpeta de Drive esté compartida con el service account (email: ampasa-drive-service@cosmic-micron-483919-p5.iam.gserviceaccount.com).";

    if (error.includes('Unauthorized') || error === 'Unauthorized') {
      title = "Error de sesión";
      message = "No se pudo verificar la sesión.";
      advice = "Por favor, inicia sesión de nuevo o refresca la página.";
    } else if (error.includes('Drive API error') || error.includes('401') || error.includes('403') || error.includes('permission') || error.includes('not accessible') || error.includes('Connect Timeout')) {
      title = "Carpeta no accesible";
      message = "No se pudo acceder a la carpeta.";
      advice = "La carpeta no está compartida con la cuenta de servicio. Comparte la carpeta con ampasa-drive-service@cosmic-micron-483919-p5.iam.gserviceaccount.com para acceder desde la aplicación.";
    }

    return (
      <div className="bg-gray-800 dark:bg-gray-800 rounded-3xl shadow-lg p-10 text-center max-w-2xl mx-auto border border-red-900">
        <div className="text-6xl mb-6">⚠️</div>
        <h3 className="text-2xl font-bold text-red-400 mb-4">{title}</h3>
        <p className="text-gray-200 mb-4">{message}</p>
        <p className="text-sm text-gray-400">{advice}</p>
        <button onClick={() => fetchFiles('')} className="mt-6 px-8 py-3 bg-[#3ecf8e] text-black rounded-xl hover:brightness-105">
          Reintentar
        </button>
      </div>
    );
  }

  const clearSearch = () => {
    setSearch('');
    setSearchScope('current');
    // fetch base will happen via effect
  };

  // Supabase-style sidebar items (master list)
  const sidebarItems: SidebarItem[] = [
    { id: 'all', label: 'Mi unidad', icon: '📁' },
    { id: 'starred', label: 'Favoritos', icon: '★' },
    { id: 'recent', label: 'Recientes', icon: '🕒' },
  ];

  const handleSidebarChange = (id: string) => {
    if (id === 'all') {
      setViewFilter('all');
      if (currentFolderId !== rootFolderId) goToRoot();
    } else if (id === 'starred') {
      setViewFilter('starred');
      if (currentFolderId !== rootFolderId) goToRoot();
    } else if (id === 'recent') {
      setViewFilter('recent');
    }
  };

  const currentSidebarId = viewFilter === 'all' ? 'all' : viewFilter === 'starred' ? 'starred' : 'recent';

  return (
    <div className="workspace bg-[#0a0a0a] text-[#f1f1f1]">
      {/* Profile dropdown (upper-left style, Supabase account menu) */}
      {showProfileMenu && (
        <div className="fixed left-4 top-[60px] w-56 profile-menu p-2 text-sm z-[80]">
          <div className="px-3 py-2 font-medium border-b border-[#2e2e2e] text-[#f1f1f1]">Tu cuenta</div>
          <button onClick={toggleTheme} className="w-full text-left px-3 py-2 hover:bg-[#1f1f1f] rounded flex items-center gap-2 text-[#a1a1aa] hover:text-[#f1f1f1]">
            {theme === 'light' ? '🌙 Modo oscuro' : '☀️ Modo claro'}
          </button>
          <a href="/profile" className="block px-3 py-2 hover:bg-[#1f1f1f] rounded text-[#a1a1aa] hover:text-[#f1f1f1]">Configuración de cuenta</a>
          <form action="/auth/signout" method="post" className="mt-1">
            <button type="submit" className="w-full text-left px-3 py-2 hover:bg-[#1f1f1f] rounded text-red-400">Cerrar sesión</button>
          </form>
          <div className="text-[10px] text-[#666] px-3 mt-2">AMPASA CALIDAD • Drive • Supabase UI</div>
        </div>
      )}

      {/* Top thin workspace header (Supabase style) */}
      <div className="workspace-header">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div 
            onClick={() => setShowProfileMenu(!showProfileMenu)} 
            className="flex items-center gap-2 cursor-pointer px-2 py-1 -ml-1 rounded hover:bg-[#1f1f1f]"
            title="Perfil y configuración (superior izquierda)"
          >
            <div className="w-6 h-6 bg-[#3ecf8e] rounded-full flex items-center justify-center text-[11px] text-black font-medium">A</div>
            <div className="text-sm font-medium truncate text-[#f1f1f1]">Mi cuenta</div>
          </div>

          <div className="h-4 w-px bg-[#2e2e2e]" />

          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#f1f1f1]">Documentos</div>
            {isGlobalResults && <span className="text-xs accent-green">• Búsqueda global</span>}
          </div>

          {/* Breadcrumbs inline in header */}
          <div className="flex items-center gap-1 text-xs text-[#a1a1aa] ml-3 min-w-0 overflow-x-auto">
            {folderPath.map((p, idx) => (
              <span key={idx} className="flex items-center gap-1 shrink-0">
                <button 
                  onClick={() => navigateToPathIndex(idx)}
                  className={`hover:text-[#f1f1f1] ${idx === folderPath.length-1 ? 'text-[#f1f1f1] font-medium' : ''}`}
                >
                  {p.name}
                </button>
                {idx < folderPath.length-1 && <span>/</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Top right actions */}
        <div className="flex gap-2 items-center">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => { 
              (window as any).__driveListCache = null; 
              setSearch(''); setSearchScope('current'); fetchFilesForFolder(currentFolderId); 
            }}
          >
            Actualizar
          </Button>
          <Button variant="secondary" size="sm" onClick={openCreateFolder}>
            Nueva carpeta
          </Button>
          <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()}>
            Subir archivo
          </Button>
          <input 
            ref={fileInputRef} 
            type="file" 
            className="hidden" 
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              if (e.target) e.target.value = '';
            }} 
          />
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="mx-4 mt-3 mb-1 flex items-center gap-3 bg-[#1a1a1a] border border-[#2e2e2e] px-4 py-2 rounded-lg text-sm">
          <span className="text-[#f1f1f1]">{selectedIds.size} seleccionados</span>
          <button onClick={bulkDelete} className="text-red-400 hover:underline">Eliminar</button>
          <button onClick={bulkMove} className="text-[#3ecf8e] hover:underline">Mover</button>
          <button onClick={clearSelection} className="ml-auto text-[#a1a1aa] hover:text-[#f1f1f1]">Cancelar</button>
        </div>
      )}

      {/* Search bar (clean Supabase input) */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder={searchScope === 'current' ? "Buscar en la carpeta actual..." : "Buscar en todo el Drive (full-text)..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-supabase flex-1"
          />
          <div className="flex gap-1 bg-[#111] rounded-md p-0.5 self-start border border-[#2e2e2e]">
            <button
              onClick={() => setSearchScope('current')}
              className={`px-3 py-1.5 text-xs rounded font-medium transition ${searchScope === 'current' ? 'bg-[#1f1f1f] text-[#3ecf8e]' : 'text-[#a1a1aa] hover:text-[#f1f1f1]'}`}
            >
              Carpeta actual
            </button>
            <button
              onClick={() => setSearchScope('global')}
              className={`px-3 py-1.5 text-xs rounded font-medium transition ${searchScope === 'global' ? 'bg-[#1f1f1f] text-[#3ecf8e]' : 'text-[#a1a1aa] hover:text-[#f1f1f1]'}`}
            >
              Todo el Drive
            </button>
          </div>
        </div>
        {(search || isGlobalResults) && (
          <button onClick={clearSearch} className="mt-1.5 text-xs accent-green hover:underline">Limpiar búsqueda y volver</button>
        )}
        <p className="text-[10px] text-[#666] mt-1">Búsqueda full-text de Google Drive (nombres + contenido). Usa "Actualizar" después de cambios externos.</p>
      </div>

      {/* Main workspace: left Supabase sidebar + content */}
      <div className="flex flex-1 min-h-0">
        {/* LEFT SIDEBAR - now using clean Supabase component (green active, thin borders) */}
        <SupabaseSidebar
          title="VISTAS"
          items={sidebarItems}
          activeId={currentSidebarId}
          onChange={handleSidebarChange}
          footer={
            <div className="text-[10px] text-[#666]">
              AMPASA Drive • Supabase style
            </div>
          }
        />

        <div className="flex-1 min-w-0 flex flex-col bg-[#0a0a0a]">
          {/* View mode + list/grid toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#2e2e2e] bg-[#0f0f0f]">
            <div className="flex items-center gap-1">
              <Button 
                variant={viewMode === 'list' ? 'primary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('list')}
              >
                Lista
              </Button>
              <Button 
                variant={viewMode === 'grid' ? 'primary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('grid')}
              >
                Cuadrícula
              </Button>
            </div>
            <div className="text-xs text-[#a1a1aa]">
              {displayedFiles.length} elementos
            </div>
          </div>

          {/* The drag / content area */}
          <div 
            className={`relative flex-1 p-4 ${isDragging ? 'ring-1 ring-[#3ecf8e]' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => { setIsDragging(false); setDragOverFolderId(null); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              setDragOverFolderId(null);
              const f = e.dataTransfer.files[0];
              const internalId = e.dataTransfer.getData('text/plain');
              if (f) {
                handleUpload(f);
              } else if (internalId && internalId !== currentFolderId) {
                // dropped on background: no-op
              }
              setDraggedItemId(null);
            }}
          >
          {isDragging && (
            <div className="absolute inset-0 bg-[#1a1a1a]/80 flex flex-col items-center justify-center z-10 rounded-lg border-2 border-dashed border-[#3ecf8e]">
              <div className="text-5xl mb-3">📤</div>
              <div className="text-xl font-semibold accent-green">Suelta los archivos aquí</div>
              <div className="text-sm text-[#a1a1aa] mt-1">Se subirán a la carpeta actual</div>
            </div>
          )}

          {viewMode === 'list' ? (
            <div className="card overflow-hidden">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="w-8"><input type="checkbox" onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(displayedFiles.map(f => f.id)));
                      } else {
                        clearSelection();
                      }
                    }} /></th>
                    <th>Nombre</th>
                    <th>Modificado</th>
                    <th>Tamaño</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2e2e2e]">
                  {displayedFiles.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-[#a1a1aa]">No se encontraron documentos.</td></tr>
                  )}
                  {displayedFiles.map((file) => {
                    const isSelected = selectedFile?.id === file.id;
                    const isDragOver = dragOverFolderId === file.id;
                    return (
                      <tr 
                        key={file.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, file)}
                        onDragEnd={handleDragEnd}
                        onDragOver={isFolder(file) ? (e) => handleFolderDragOver(e, file.id) : undefined}
                        onDragLeave={isFolder(file) ? handleFolderDragLeave : undefined}
                        onDrop={isFolder(file) ? (e) => handleFolderDrop(e, file) : undefined}
                        className={`cursor-pointer transition-colors ${isSelected ? 'selected' : ''} ${isDragOver ? 'ring-1 ring-[#3ecf8e] bg-[#1a1a1a]' : ''}`}
                        onClick={(e) => {
                          // Left click only selects (checkbox + highlight). Does NOT open right sidebar.
                          if (!e.target.closest('button, input')) {
                            toggleSelect(file.id);
                          }
                        }}
                        onDoubleClick={() => handleFileOrFolderDoubleClick(file)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, file });
                          // Right click opens context menu (rich actions). Sidebar only from menu "Detalles".
                        }}
                      >
                        <td><input type="checkbox" checked={selectedIds.has(file.id)} onChange={() => toggleSelect(file.id)} onClick={e => e.stopPropagation()} /></td>
                        <td className="flex items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); toggleStar(file.id); }} className="text-lg leading-none accent-green">
                            {starredIds.has(file.id) ? '★' : '☆'}
                          </button>
                          <img src={file.iconLink} alt="" className="w-5 h-5" onError={(e) => (e.currentTarget.style.display = 'none')} />
                          <span className="font-medium text-[#f1f1f1] select-text cursor-text">{file.name}</span>
                        </td>
                        <td className="text-sm text-[#a1a1aa]">{formatDate(file.modifiedTime)}</td>
                        <td className="text-sm text-[#a1a1aa]">{formatSize(file.size)}</td>
                        <td>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === file.id ? null : file.id);
                              }}
                              className="px-2 py-1 text-[#a1a1aa] hover:text-[#f1f1f1] hover:bg-[#1f1f1f] rounded"
                              title="Más acciones"
                            >
                              ⋮
                            </button>

                            {openMenuId === file.id && (
                              <div
                                className="absolute right-0 mt-1 z-50 bg-[#161616] border border-[#2e2e2e] rounded shadow-lg py-1 text-sm min-w-[140px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {!isFolder(file) && (
                                  <>
                                    <button onClick={() => { handlePreview(file); setOpenMenuId(null); }} className="block w-full text-left px-3 py-1 hover:bg-[#1f1f1f]">Previsualizar</button>
                                    <button onClick={() => { handlePrint(file); setOpenMenuId(null); }} className="block w-full text-left px-3 py-1 hover:bg-[#1f1f1f]">Imprimir</button>
                                    <button onClick={() => { handleDownload(file); setOpenMenuId(null); }} className="block w-full text-left px-3 py-1 hover:bg-[#1f1f1f]">Descargar</button>
                                  </>
                                )}
                                {isFolder(file) && (
                                  <button onClick={() => { navigateIntoFolder(file.id); setOpenMenuId(null); }} className="block w-full text-left px-3 py-1 hover:bg-[#1f1f1f]">Abrir</button>
                                )}
                                <button onClick={() => { startRename(file); setOpenMenuId(null); }} className="block w-full text-left px-3 py-1 hover:bg-[#1f1f1f]">Renombrar</button>
                                <button onClick={() => { openShare(file); setOpenMenuId(null); }} className="block w-full text-left px-3 py-1 hover:bg-[#1f1f1f]">Compartir</button>
                                <div className="h-px bg-[#2e2e2e] my-1" />
                                <button onClick={() => { handleDelete(file); setOpenMenuId(null); }} className="block w-full text-left px-3 py-1 hover:bg-[#1f1f1f] text-red-400">Eliminar</button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {displayedFiles.length === 0 && <div className="col-span-full text-center text-[#a1a1aa] p-8">No se encontraron documentos.</div>}
              {displayedFiles.map((file) => (
                <div 
                  key={file.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, file)}
                  onDragEnd={handleDragEnd}
                  onDragOver={isFolder(file) ? (e) => handleFolderDragOver(e, file.id) : undefined}
                  onDragLeave={isFolder(file) ? handleFolderDragLeave : undefined}
                  onDrop={isFolder(file) ? (e) => handleFolderDrop(e, file) : undefined}
                  onClick={(e) => {
                    if (!e.target.closest('button, input')) {
                      toggleSelect(file.id);
                    }
                  }}
                  onDoubleClick={() => handleFileOrFolderDoubleClick(file)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, file });
                    handleFileClick(file);
                  }}
                  className={`card p-4 cursor-pointer border border-[#2e2e2e] hover:border-[#3a3a3a] relative ${selectedFile?.id === file.id ? 'ring-1 ring-[#3ecf8e]' : ''} ${dragOverFolderId === file.id ? 'ring-2 ring-[#3ecf8e]' : ''}`}
                >
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(file.id)} 
                    onChange={() => toggleSelect(file.id)} 
                    onClick={e => e.stopPropagation()} 
                    className="absolute top-2 right-2" 
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === file.id ? null : file.id);
                    }}
                    className="absolute top-2 right-8 text-[#a1a1aa] hover:text-[#f1f1f1] px-1"
                    title="Más acciones"
                  >
                    ⋮
                  </button>

                  {openMenuId === file.id && (
                    <div
                      className="absolute right-2 top-10 z-50 bg-[#161616] border border-[#2e2e2e] rounded shadow-lg py-1 text-sm min-w-[160px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!isFolder(file) && (
                        <>
                          <button onClick={() => { handlePreview(file); setOpenMenuId(null); }} className="block w-full text-left px-3 py-1 hover:bg-[#1f1f1f]">Previsualizar</button>
                          <button onClick={() => { handlePrint(file); setOpenMenuId(null); }} className="block w-full text-left px-3 py-1 hover:bg-[#1f1f1f]">Imprimir</button>
                          <button onClick={() => { handleDownload(file); setOpenMenuId(null); }} className="block w-full text-left px-3 py-1 hover:bg-[#1f1f1f]">Descargar</button>
                        </>
                      )}
                      {isFolder(file) && (
                        <button onClick={() => { navigateIntoFolder(file.id); setOpenMenuId(null); }} className="block w-full text-left px-3 py-1 hover:bg-[#1f1f1f]">Abrir</button>
                      )}
                      <button onClick={() => { startRename(file); setOpenMenuId(null); }} className="block w-full text-left px-3 py-1 hover:bg-[#1f1f1f]">Renombrar</button>
                      <button onClick={() => { openShare(file); setOpenMenuId(null); }} className="block w-full text-left px-3 py-1 hover:bg-[#1f1f1f]">Compartir</button>
                      <button onClick={() => { handleMove(file); setOpenMenuId(null); }} className="block w-full text-left px-3 py-1 hover:bg-[#1f1f1f]">Mover a...</button>
                      <div className="h-px bg-[#2e2e2e] my-1" />
                      <button onClick={() => { handleDelete(file); setOpenMenuId(null); }} className="block w-full text-left px-3 py-1 hover:bg-[#1f1f1f] text-red-400">Eliminar</button>
                      <div className="h-px bg-[#2e2e2e] my-1" />
                      <button onClick={() => { setSelectedFile(file); setOpenMenuId(null); }} className="block w-full text-left px-3 py-1 hover:bg-[#1f1f1f]">Detalles / Información</button>
                    </div>
                  )}
                  <div className="flex items-start gap-3 mb-3">
                    <button onClick={(e) => { e.stopPropagation(); toggleStar(file.id); }} className="text-lg leading-none self-start accent-green">
                      {starredIds.has(file.id) ? '★' : '☆'}
                    </button>
                    {file.thumbnailLink ? (
                      <img src={file.thumbnailLink} alt="" className="w-12 h-12 object-cover rounded border border-[#2e2e2e]" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <img src={file.iconLink} alt="" className="w-8 h-8 mt-1" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate text-[#f1f1f1] select-text cursor-text">{file.name}</div>
                      <div className="text-xs text-[#a1a1aa] mt-1">{formatDate(file.modifiedTime)}</div>
                      <div className="text-xs text-[#a1a1aa]">{formatSize(file.size)}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2 text-xs">
                    {!isFolder(file) ? (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); handlePreview(file); }} className="px-2 py-0.5 bg-blue-600 text-white hover:bg-blue-700 rounded transition">Previsualizar</button>
                        <button onClick={(e) => { e.stopPropagation(); handlePrint(file); }} className="px-2 py-0.5 bg-green-600 text-white hover:bg-green-700 rounded transition">Imprimir</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }} className="px-2 py-0.5 bg-gray-700 text-white hover:bg-gray-800 rounded transition">Descargar</button>
                      </>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigateIntoFolder(file.id); }} 
                        className="px-2 py-0.5 bg-[#1f1f1f] text-[#a1a1aa] hover:bg-[#27272a] rounded"
                      >
                        Abrir
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); startRename(file); }} className="px-2 py-0.5 bg-[#1f1f1f] text-[#a1a1aa] hover:bg-[#27272a] border border-[#2e2e2e] rounded">Renombrar</button>
                    <button onClick={(e) => { e.stopPropagation(); openShare(file); }} className="px-2 py-0.5 bg-[#1f1f1f] text-[#a1a1aa] hover:bg-[#27272a] border border-[#2e2e2e] rounded">Compartir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div> {/* close drag relative */}
        </div> {/* close center flex-1 */}

        {/* Details Sidebar - Supabase / clean dark right pane */}
        {selectedFile && (
          <div className="w-80 bg-[#161616] border-l border-[#2e2e2e] flex-shrink-0 overflow-auto p-4 text-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="text-xs uppercase tracking-widest text-[#3ecf8e]">Detalles</div>
              <button onClick={closeDetails} className="text-[#a1a1aa] hover:text-[#f1f1f1] text-lg leading-none">✕</button>
            </div>

            <div className="flex items-start gap-3 mb-4">
              <img src={selectedFile.iconLink} alt="" className="w-9 h-9 mt-0.5" onError={(e) => (e.currentTarget.style.display = 'none')} />
              <div className="min-w-0 flex-1">
                {renamingFile && renamingFile.id === selectedFile.id ? (
                  <div className="flex gap-1">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') cancelRename(); }}
                      className="input-supabase flex-1 text-sm"
                      autoFocus
                    />
                    <button onClick={saveRename} className="text-[#3ecf8e] px-1">✓</button>
                    <button onClick={cancelRename} className="text-red-400 px-1">✕</button>
                  </div>
                ) : (
                  <div className="font-medium text-[#f1f1f1] break-words leading-tight flex items-center gap-1">
                    {selectedFile.name}
                    <button onClick={() => startRename(selectedFile)} className="text-xs text-[#3ecf8e] hover:underline ml-1">Renombrar</button>
                  </div>
                )}
                <div className="text-xs text-[#a1a1aa] mt-0.5">{formatDate(selectedFile.modifiedTime)}</div>
              </div>
            </div>

            {/* Quick actions - Supabase style */}
            <div className="flex flex-wrap gap-2 mb-4">
              {!isFolder(selectedFile) && (
                <>
                  <button onClick={() => handlePreview(selectedFile)} className="flex-1 text-xs py-1.5 bg-[#3ecf8e] text-black rounded hover:brightness-105">Abrir</button>
                  <button onClick={() => handleDownload(selectedFile)} className="flex-1 text-xs py-1.5 bg-[#1f1f1f] text-[#f1f1f1] rounded hover:bg-[#27272a] border border-[#2e2e2e]">Descargar</button>
                </>
              )}
              <button onClick={() => openShare(selectedFile)} className="flex-1 text-xs py-1.5 bg-[#1f1f1f] text-[#f1f1f1] rounded hover:bg-[#27272a] border border-[#2e2e2e]">Compartir</button>
              <button onClick={() => handleMove(selectedFile)} className="flex-1 text-xs py-1.5 bg-[#1f1f1f] text-[#f1f1f1] rounded hover:bg-[#27272a] border border-[#2e2e2e]">Mover</button>
              {isFolder(selectedFile) && (
                <button onClick={() => navigateIntoFolder(selectedFile.id)} className="flex-1 text-xs py-1.5 bg-[#3ecf8e] text-black rounded">Abrir carpeta</button>
              )}
            </div>

            <div className="border-t border-[#2e2e2e] pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-[#a1a1aa]">
                <span>Tipo</span>
                <span className="text-[#f1f1f1] text-right break-all">{selectedFile.mimeType.split('/').pop()}</span>
              </div>
              <div className="flex justify-between text-[#a1a1aa]">
                <span>Tamaño</span>
                <span className="text-[#f1f1f1]">{formatSize(selectedFile.size)}</span>
              </div>
              <div className="flex justify-between text-[#a1a1aa]">
                <span>Modificado</span>
                <span className="text-[#f1f1f1] text-right">{formatDate(selectedFile.modifiedTime)}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#2e2e2e] flex gap-2">
              <button onClick={() => startRename(selectedFile)} className="text-xs flex-1 py-1 border border-[#2e2e2e] rounded hover:bg-[#1f1f1f]">Renombrar</button>
              <button onClick={() => handleMove(selectedFile)} className="text-xs flex-1 py-1 border border-[#2e2e2e] rounded hover:bg-[#1f1f1f]">Mover</button>
              <button onClick={() => handleDelete(selectedFile)} className="text-xs flex-1 py-1 border border-red-900 text-red-400 rounded hover:bg-red-950">Eliminar</button>
            </div>
          </div>
        )}
      </div> {/* close outer left+center+details flex */}

      {files.length === 0 && !loading && !error && search.trim() === '' && (
        <div className="text-center py-12 text-gray-200 dark:text-gray-200 dark:text-gray-300 dark:text-gray-300">No se encontraron documentos en esta carpeta de Drive.</div>
      )}

      {/* Undo bar - dark Supabase toast */}
      {lastDeleted && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#161616] border border-[#2e2e2e] text-[#f1f1f1] px-4 py-2 rounded-lg shadow flex items-center gap-3 text-sm z-50">
          <span>Elemento movido a la papelera.</span>
          <button onClick={undoDelete} className="font-medium text-[#3ecf8e] hover:underline">Deshacer</button>
          <button onClick={() => setLastDeleted(null)} className="text-[#a1a1aa]">✕</button>
        </div>
      )}

      {/* Preview Modal - clean dark Supabase shell */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={closePreview}>
          <div 
            className="modal w-full max-w-[min(95vw,1400px)] h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2e2e2e]">
              <div className="min-w-0 pr-4">
                <div className="font-semibold text-lg text-[#f1f1f1] truncate">{previewFile.name}</div>
                <div className="text-xs text-[#a1a1aa]">{formatDate(previewFile.modifiedTime)} · {formatSize(previewFile.size)}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 text-sm">
                {previewFile.webViewLink && (
                  <a href={previewFile.webViewLink} target="_blank" className="px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#27272a] border border-[#2e2e2e] rounded text-[#f1f1f1]">Abrir en Drive (rápido)</a>
                )}
                <Button variant="secondary" size="sm" onClick={() => handleDownload(previewFile)}>Descargar</Button>
                <Button variant="primary" size="sm" onClick={printPreviewContent}>Imprimir</Button>
                <Button variant="ghost" size="sm" onClick={closePreview}>Cerrar</Button>
              </div>
            </div>

            <div className="flex-1 bg-[#111] p-3 overflow-hidden relative">
              {previewLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#161616]/95 p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#3ecf8e] border-t-transparent mb-4" />
                  <div className="text-sm text-[#a1a1aa] mb-4">
                    Generando vista previa desde Google Drive...<br />
                    (Puede tardar para hojas grandes)
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      const file = previewFile;
                      closePreview();
                      if (file) handleDownload(file);
                    }}
                  >
                    Cancelar y descargar directamente
                  </Button>
                </div>
              )}
              <iframe
                id="preview-iframe"
                src={getPreviewUrl(previewFile)}
                className="w-full h-full rounded border border-[#2e2e2e] bg-[#0a0a0a]"
                title={`Vista previa de ${previewFile.name}`}
                onLoad={() => setPreviewLoading(false)}
              />
            </div>

            <div className="px-6 py-2 text-xs text-[#666] border-t border-[#2e2e2e] flex items-center justify-between bg-[#0f0f0f]">
              <span>Vista previa vía servidor seguro. Para nativos de Google se exporta a PDF.</span>
              <button onClick={closePreview} className="hover:text-[#a1a1aa]">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal - Supabase dark */}
      {shareFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={closeShare}>
          <div 
            className="modal w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#2e2e2e] flex items-center justify-between">
              <div>
                <div className="font-semibold">Compartir</div>
                <div className="text-xs text-[#a1a1aa] truncate max-w-[260px]">{shareFile.name}</div>
              </div>
              <button onClick={closeShare} className="text-[#a1a1aa] hover:text-[#f1f1f1]">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm font-medium mb-2 text-[#f1f1f1]">Compartir con personas</div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="email@ejemplo.com"
                    value={shareEmail}
                    onChange={e => setShareEmail(e.target.value)}
                    className="input-supabase flex-1"
                    onKeyDown={e => { if (e.key === 'Enter') addPermission(); }}
                  />
                  <select 
                    value={shareRole} 
                    onChange={e => setShareRole(e.target.value as any)}
                    className="input-supabase"
                  >
                    <option value="reader">Lector</option>
                    <option value="commenter">Comentador</option>
                    <option value="writer">Editor</option>
                  </select>
                  <Button size="sm" onClick={addPermission} disabled={shareLoading || !shareEmail.trim()}>
                    {shareLoading ? '...' : 'Compartir'}
                  </Button>
                </div>
                {shareError && <div className="text-xs text-red-400 mt-1">{shareError}</div>}
              </div>

              <div>
                <div className="text-sm font-medium mb-2 text-[#f1f1f1]">Acceso con enlace</div>
                <div className="flex gap-2">
                  <button onClick={copyShareLink} className="flex-1 py-2 border border-[#2e2e2e] rounded text-sm hover:bg-[#1f1f1f]">
                    Copiar enlace
                  </button>
                  <button 
                    onClick={async () => {
                      if (!shareFile) return;
                      setShareLoading(true);
                      try {
                        await fetch('/api/drive/permissions', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ fileId: shareFile.id, type: 'anyone', role: 'reader' }),
                        });
                        await loadPermissions(shareFile.id);
                      } catch {}
                      setShareLoading(false);
                    }}
                    className="flex-1 py-2 border border-[#2e2e2e] rounded text-sm hover:bg-[#1f1f1f]"
                  >
                    Compartir enlace (cualquiera)
                  </button>
                </div>
                <div className="text-[10px] text-[#666] mt-1">El enlace actual está en los detalles del archivo.</div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2 text-[#f1f1f1]">Personas con acceso</div>
                {shareLoading && <div className="text-xs text-[#a1a1aa]">Cargando...</div>}
                <div className="max-h-48 overflow-auto space-y-1 text-sm">
                  {permissions.length === 0 && !shareLoading && <div className="text-[#a1a1aa] text-xs">Sin permisos adicionales.</div>}
                  {permissions.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-[#1f1f1f] rounded px-3 py-1.5">
                      <div className="truncate">
                        {p.emailAddress || (p.type === 'anyone' ? 'Cualquier persona con el enlace' : p.displayName || 'Usuario')}
                        <span className="ml-2 text-xs text-[#666]">({p.role})</span>
                      </div>
                      {p.type !== 'owner' && (
                        <button onClick={() => removePermission(p.id)} className="text-red-400 text-xs hover:underline">Quitar</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-[#2e2e2e] text-right">
              <Button variant="ghost" size="sm" onClick={closeShare}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal - Supabase dark */}
      {showCreateFolder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={closeCreateFolder}>
          <div
            className="modal w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#2e2e2e]">
              <div className="font-semibold text-lg">Nueva carpeta</div>
              <div className="text-xs text-[#a1a1aa]">Se creará en la carpeta actual</div>
            </div>
            <div className="p-6">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') closeCreateFolder(); }}
                placeholder="Nombre de la carpeta"
                className="input-supabase w-full"
                autoFocus
              />
            </div>
            <div className="px-6 py-4 border-t border-[#2e2e2e] flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeCreateFolder}>Cancelar</Button>
              <Button variant="primary" size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                Crear
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Move Picker Modal - Supabase dark */}
      {showMovePicker && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/80 p-4" onClick={closeMovePicker}>
          <div className="modal w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#2e2e2e] flex items-center justify-between">
              <div>
                <div className="font-semibold">Mover a...</div>
                <div className="text-xs text-[#a1a1aa]">Elige la carpeta de destino</div>
              </div>
              <button onClick={closeMovePicker} className="text-[#a1a1aa] hover:text-[#f1f1f1]">✕</button>
            </div>

            <div className="px-6 pt-3 flex items-center gap-2 text-sm">
              <button onClick={goPickerRoot} className="px-2 py-1 rounded bg-[#1f1f1f] hover:bg-[#27272a] border border-[#2e2e2e]">Raíz</button>
              <button onClick={goPickerBack} disabled={pickerPath.length <= 1} className="px-2 py-1 rounded bg-[#1f1f1f] hover:bg-[#27272a] border border-[#2e2e2e] disabled:opacity-50">← Atrás</button>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={selectCurrentAsTarget}>Usar carpeta actual</Button>
            </div>

            <div className="px-6 py-2 text-xs text-[#a1a1aa] flex gap-1 overflow-auto">
              {pickerPath.map((p, i) => (
                <span key={i}>{p.name}{i < pickerPath.length-1 ? ' / ' : ''}</span>
              ))}
            </div>

            <div className="p-2 max-h-[50vh] overflow-auto border-t border-[#2e2e2e]">
              {pickerFolders.length === 0 && (
                <div className="p-6 text-center text-sm text-[#a1a1aa]">No hay subcarpetas aquí. Usa "Usar carpeta actual".</div>
              )}
              {pickerFolders.map(f => (
                <div
                  key={f.id}
                  onClick={() => navigatePicker(f.id, f.name)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#1f1f1f] rounded cursor-pointer"
                >
                  <span className="text-xl">📁</span>
                  <span className="flex-1 truncate font-medium">{f.name}</span>
                  <span className="text-xs text-[#a1a1aa]">Entrar →</span>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-[#2e2e2e] flex justify-between text-sm">
              <Button variant="ghost" size="sm" onClick={closeMovePicker}>Cancelar</Button>
              <Button variant="primary" size="sm" onClick={selectCurrentAsTarget}>Seleccionar esta carpeta</Button>
            </div>
            <div className="px-6 pb-3 text-[10px] text-[#666]">Los elementos se moverán aquí. Arrastra en la lista para mover rápidamente.</div>
          </div>
        </div>
      )}

      {/* Context menu - dark Supabase style */}
      {contextMenu && (
        <div
          className="fixed z-[70] bg-[#161616] border border-[#2e2e2e] shadow-lg rounded-lg py-1 text-sm min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={closeContextMenu}
        >
          <div onClick={() => { startRename(contextMenu.file); closeContextMenu(); }} className="px-4 py-1.5 hover:bg-[#1f1f1f] cursor-pointer">Renombrar</div>
          <div onClick={() => { openShare(contextMenu.file); closeContextMenu(); }} className="px-4 py-1.5 hover:bg-[#1f1f1f] cursor-pointer">Compartir</div>
          <div onClick={() => { handleMove(contextMenu.file); closeContextMenu(); }} className="px-4 py-1.5 hover:bg-[#1f1f1f] cursor-pointer">Mover a...</div>
          {!isFolder(contextMenu.file) && (
            <>
              <div className="h-px bg-[#2e2e2e] my-1" />
              <div onClick={() => { handlePreview(contextMenu.file); closeContextMenu(); }} className="px-4 py-1.5 hover:bg-[#1f1f1f] cursor-pointer">Previsualizar</div>
              <div onClick={() => { handleDownload(contextMenu.file); closeContextMenu(); }} className="px-4 py-1.5 hover:bg-[#1f1f1f] cursor-pointer">Descargar</div>
            </>
          )}
          {isFolder(contextMenu.file) && (
            <div onClick={() => { navigateIntoFolder(contextMenu.file.id); closeContextMenu(); }} className="px-4 py-1.5 hover:bg-[#1f1f1f] cursor-pointer">Abrir carpeta</div>
          )}
          <div className="h-px bg-[#2e2e2e] my-1" />
          <div onClick={() => { handleDelete(contextMenu.file); closeContextMenu(); }} className="px-4 py-1.5 hover:bg-[#1f1f1f] text-red-400 cursor-pointer">Eliminar</div>
        </div>
      )}
    </div>
  );
}
