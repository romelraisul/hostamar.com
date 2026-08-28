/**
 * Storage Dashboard Component
 *
 * Displays customer storage files with upload, download, and delete capabilities.
 *
 * Usage:
 *   <StorageDashboard userId="abc123" />
 *
 * Files are fetched from /api/storage and operations go to the same endpoint.
 */

import { useState, useEffect, useCallback } from 'react'
import { Buffer } from 'buffer'

// Types
interface FileEntry {
  filename: string
  size: number
  createdAt: string
  modified: string
  path: string
}

interface StorageInfo {
  used: number
  quota: number
  remaining: number
  files: number
}

interface UploadResult {
  success: boolean
  filename: string
  size: number
  mimeType: string
  createdAt: string
}

interface StorageService {
  files: FileEntry[]
  storage: StorageInfo
  loading: boolean
  uploadProgress: number
  error: string | null
}

// Helper to format file size
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Helper to format date
function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Main component
export default function StorageDashboard({
  userId,
  planQuotaGb = 5,
}: {
  userId: string
  planQuotaGb?: number
}) {
  const [state, setState] = useState<StorageService>({
    files: [],
    storage: { used: 0, quota: planQuotaGb * 1024 * 1024 * 1024, remaining: planQuotaGb * 1024 * 1024 * 1024, files: 0 },
    loading: false,
    uploadProgress: 0,
    error: null,
  })

  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  // Fetch storage data
  const fetchStorage = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const res = await fetch('/api/storage', {
        headers: {
          'x-user-id': userId,
          'x-user-email': userId,
        },
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      }
      const data = await res.json()
      if (data.ok && data.data) {
        setState(prev => ({
          ...prev,
          files: data.data.files || [],
          storage: data.data.storage || { used: 0, quota: planQuotaGb * 1024 * 1024 * 1024, remaining: planQuotaGb * 1024 * 1024 * 1024, files: 0 },
          loading: false,
        }))
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load storage',
      }))
    }
  }, [userId, planQuotaGb])

  // Delete file
  const deleteFile = useCallback(async (filename: string) => {
    try {
      const res = await fetch(`/api/storage?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId,
          'x-user-email': userId,
        },
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      }
      const data = await res.json()
      if (data.ok && data.data) {
        await fetchStorage()
        setShowDeleteConfirm(false)
        setSelectedFile(null)
      } else {
        throw new Error(data.error || 'Delete failed')
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Delete failed',
      }))
    }
  }, [userId, fetchStorage])

  // Handle file upload
  const handleUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileInput = event.target
    if (!fileInput.files || fileInput.files.length === 0) return

    setUploading(true)
    setState(prev => ({ ...prev, uploadProgress: 10 }))

    const file = fileInput.files[0]
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', userId)
    formData.append('email', userId)

    try {
      const res = await fetch('/api/storage', {
        method: 'POST',
        body: formData,
      })

      setState(prev => ({ ...prev, uploadProgress: 90 }))

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      }

      const data = await res.json()
      if (data.ok && data.data) {
        setState(prev => ({
          ...prev,
          files: [data.data, ...prev.files],
          storage: data.data.storage || prev.storage,
          uploadProgress: 100,
        }))
        setUploading(false)
        fileInput.value = '' // Reset input
        fetchStorage() // Refresh to get accurate data
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Upload failed',
      }))
      setUploading(false)
    }
  }, [userId, fetchStorage])

  // Download file
  const downloadFile = useCallback(async (file: FileEntry) => {
    // Get download URL
    const url = `/api/storage/download/${userId}/${encodeURIComponent(file.filename)}`
    setDownloadUrl(url)

    // Open in new tab or trigger download
    window.open(url, '_blank')
  }, [userId])

  // Initial fetch
  useEffect(() => {
    fetchStorage()
  }, [fetchStorage])

  return (
    <div className="storage-dashboard">
      <h1>My Storage</h1>

      {/* Error display */}
      {state.error && (
        <div className="error-message">
          <strong>Error:</strong> {state.error}
        </div>
      )}

      {/* Quota bar */}
      <div className="quota-section">
        <h2>Storage Quota</h2>
        <div className="quota-bar">
          <div
            className="quota-used"
            style={{ width: `${(state.storage.used / state.storage.quota) * 100}%` }}
          />
          <div className="quota-label">
            {formatSize(state.storage.used)} / {formatSize(state.storage.quota)}
          </div>
        </div>
        <div className="quota-details">
          <span>Files: {state.storage.files}</span>
          <span>Remaining: {formatSize(state.storage.remaining)}</span>
          <span>Plan: {planQuotaGb}GB</span>
        </div>
      </div>

      {/* Upload section */}
      <div className="upload-section">
        <h2>Upload File</h2>
        <input
          type="file"
          onChange={handleUpload}
          disabled={uploading}
          accept="*/*"
        />
        {uploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${state.uploadProgress}%` }}
              />
            </div>
            <span>Uploading... {state.uploadProgress}%</span>
          </div>
        )}
      </div>

      {/* File list */}
      <div className="file-list-section">
        <h2>Files</h2>
        {state.loading ? (
          <div className="loading">Loading files...</div>
        ) : state.files.length === 0 ? (
          <div className="empty-state">
            No files uploaded yet. Use the upload button above.
          </div>
        ) : (
          <div className="file-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.files.map((file, index) => (
                  <tr key={index}>
                    <td>
                      <span className="file-name">{file.filename}</span>
                    </td>
                    <td>{formatSize(file.size)}</td>
                    <td>{formatDate(file.createdAt || file.modified)}</td>
                    <td>
                      <div className="file-actions">
                        <button
                          className="btn btn-download"
                          onClick={() => downloadFile(file)}
                        >
                          Download
                        </button>
                        <button
                          className="btn btn-delete"
                          onClick={() => {
                            setSelectedFile(file)
                            setShowDeleteConfirm(true)
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && selectedFile && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Delete File</h2>
            <p>
              Are you sure you want to delete <strong>{selectedFile.filename}</strong>?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-cancel"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-confirm-delete"
                onClick={() => deleteFile(selectedFile.filename)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download URL display */}
      {downloadUrl && (
        <div className="download-url-display">
          Download URL: <a href={downloadUrl} target="_blank" rel="noopener noreferrer">{downloadUrl}</a>
          <button onClick={() => setDownloadUrl(null)}>Close</button>
        </div>
      )}
    </div>
  )
}
