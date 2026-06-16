'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Server, Cloud, Terminal, HardDrive, Power, MoreVertical,
  Trash2, RefreshCw, Globe, Database, Shield, FileText, Upload,
  Folder, FolderOpen, File, Copy, Download, Trash, Edit3,
  CheckCircle2, XCircle, AlertCircle, ChevronRight, Search,
  Key, Link2, Wifi, Cpu, Clock, Zap, Star, ArrowLeft,
  PanelLeftClose, PanelLeft, Settings, Users, Activity,
  Code, TerminalSquare, Eye, EyeOff, Globe2, Lock, Unlock,
  Check, X, ExternalLink, Rocket, GitBranch, Box, Package
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Service {
  id: string
  type: string
  name: string
  status: string
  specs: string
  price: number
  serverIp: string | null
  createdAt: string
  expiresAt: string | null
}

interface FileItem {
  name: string
  type: 'file' | 'folder'
  size?: number
  modified: string
  permissions: string
}

interface DatabaseEntry {
  name: string
  user: string
  size: string
  tables: number
}

interface DomainEntry {
  domain: string
  status: 'active' | 'pending' | 'expired'
  expires: string
  ssl: boolean
}

interface SSLInfo {
  domain: string
  issued: string
  expires: string
  provider: string
  autoRenew: boolean
}

type Tab = 'overview' | 'files' | 'databases' | 'domains' | 'ssl' | 'wordpress' | 'deploy'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_FILES: FileItem[] = [
  { name: 'public_html', type: 'folder', modified: '2026-06-15 10:30', permissions: 'drwxr-xr-x' },
  { name: 'wp-config.php', type: 'file', size: 4213, modified: '2026-06-14 08:00', permissions: '-rw-r--r--' },
  { name: 'index.php', type: 'file', size: 892, modified: '2026-06-14 08:00', permissions: '-rw-r--r--' },
  { name: '.htaccess', type: 'file', size: 2140, modified: '2026-06-10 15:22', permissions: '-rw-r--r--' },
  { name: 'wp-content', type: 'folder', modified: '2026-06-15 09:00', permissions: 'drwxr-xr-x' },
  { name: 'error_log', type: 'file', size: 48291, modified: '2026-06-16 06:00', permissions: '-rw-r--r--' },
]

const MOCK_DATABASES: DatabaseEntry[] = [
  { name: 'hostamar_wp', user: 'hostamar_admin', size: '48.2 MB', tables: 14 },
  { name: 'hostamar_blog', user: 'hostamar_blog', size: '12.7 MB', tables: 8 },
  { name: 'hostamar_analytics', user: 'hostamar_analytics', size: '3.1 GB', tables: 22 },
]

const MOCK_DOMAINS: DomainEntry[] = [
  { domain: 'mysite.hostamar.com', status: 'active', expires: '2027-06-16', ssl: true },
  { domain: 'client1.hostamar.com', status: 'active', expires: '2026-12-01', ssl: true },
  { domain: 'newproject.xyz', status: 'pending', expires: '2026-08-20', ssl: false },
]

const MOCK_SSL: SSLInfo[] = [
  { domain: 'mysite.hostamar.com', issued: '2026-01-16', expires: '2027-01-16', provider: "Let's Encrypt", autoRenew: true },
  { domain: 'client1.hostamar.com', issued: '2026-03-01', expires: '2026-09-01', provider: "Let's Encrypt", autoRenew: true },
]

const BDIX_SERVERS = [
  { name: 'BDIX-DC-01', location: 'Dhaka, Bangladesh', latency: '4ms', load: '23%', uptime: '99.98%' },
  { name: 'BDIX-DC-02', location: 'Chittagong, Bangladesh', latency: '18ms', load: '41%', uptime: '99.95%' },
  { name: 'BDIX-DC-03', location: 'Sylhet, Bangladesh', latency: '22ms', load: '15%', uptime: '99.99%' },
]

// ─── WordPress Install Flow ───────────────────────────────────────────────────

const WP_STEPS = ['Choose Domain', 'Configure Site', 'Install', 'Complete']

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  // File manager state
  const [files, setFiles] = useState<FileItem[]>(MOCK_FILES)
  const [currentPath, setCurrentPath] = useState('/')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [draggedFile, setDraggedFile] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  // Database state
  const [dbSearch, setDbSearch] = useState('')
  const [showDbModal, setShowDbModal] = useState(false)
  const [newDb, setNewDb] = useState({ name: '', user: '', pass: '' })

  // Domain state
  const [showDomainModal, setShowDomainModal] = useState(false)
  const [newDomain, setNewDomain] = useState('')

  // WordPress install state
  const [wpStep, setWpStep] = useState(0)
  const [wpConfig, setWpConfig] = useState({ domain: '', title: '', user: '', pass: '', email: '' })
  const [wpInstalling, setWpInstalling] = useState(false)
  const [wpComplete, setWpComplete] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [])

  async function fetchServices() {
    try {
      const res = await fetch('/api/dashboard/services')
      if (res.ok) {
        const data = await res.json()
        setServices(data.services || [])
      }
    } catch (error) {
      console.error('Failed to fetch services:', error)
    } finally {
      setLoading(false)
    }
  }

  // ─── File Manager ──────────────────────────────────────────────────────────

  function handleFileClick(item: FileItem) {
    if (item.type === 'folder') {
      setCurrentPath(prev => prev === '/' ? `/${item.name}` : `${prev}/${item.name}`)
      setSelectedFiles(new Set())
    } else {
      toggleSelect(item.name)
    }
  }

  function toggleSelect(name: string) {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDraggedFile(null)
    setUploadingFile(true)
    setTimeout(() => setUploadingFile(false), 2000)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function goBack() {
    if (currentPath === '/') return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    setCurrentPath(parts.length ? '/' + parts.join('/') : '/')
  }

  // ─── WordPress Install ─────────────────────────────────────────────────────

  function startWpInstall() {
    setWpStep(0)
    setWpConfig({ domain: '', title: '', user: '', pass: '', email: '' })
    setWpInstalling(false)
    setWpComplete(false)
  }

  async function submitWpInstall() {
    if (wpStep < WP_STEPS.length - 2) {
      setWpStep(prev => prev + 1)
      return
    }
    setWpInstalling(true)
    await new Promise(r => setTimeout(r, 3000))
    setWpInstalling(false)
    setWpComplete(true)
    setWpStep(WP_STEPS.length - 1)
  }

  // ─── Status Helpers ────────────────────────────────────────────────────────

  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    active: { color: 'text-green-600 bg-green-50 border-green-200', icon: <CheckCircle2 className="w-3 h-3" /> },
    suspended: { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: <AlertCircle className="w-3 h-3" /> },
    terminated: { color: 'text-red-600 bg-red-50 border-red-200', icon: <XCircle className="w-3 h-3" /> },
    pending: { color: 'text-blue-600 bg-blue-50 border-blue-200', icon: <Clock className="w-3 h-3" /> },
    expired: { color: 'text-gray-600 bg-gray-50 border-gray-200', icon: <XCircle className="w-3 h-3" /> },
  }

  // ─── Tabs ─────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'files', label: 'File Manager', icon: <FileText className="w-4 h-4" /> },
    { id: 'databases', label: 'Databases', icon: <Database className="w-4 h-4" /> },
    { id: 'domains', label: 'Domains', icon: <Globe className="w-4 h-4" /> },
    { id: 'ssl', label: 'SSL', icon: <Shield className="w-4 h-4" /> },
    { id: 'wordpress', label: 'WordPress', icon: <Box className="w-4 h-4" /> },
    { id: 'deploy', label: 'Deploy', icon: <Rocket className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5 text-gray-500" /> : <PanelLeft className="w-5 h-5 text-gray-500" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <Cloud className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900">Cloud Panel</span>
              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">Bangla cPanel</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('wordpress'); startWpInstall() }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm font-medium"
            >
              <Zap className="w-3.5 h-3.5" />
              WordPress Install
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Order</span>
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 px-4 overflow-x-auto scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 lg:p-6 max-w-screen-2xl mx-auto">

        {/* ── OVERVIEW ─────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Active Services', value: services.filter(s => s.status === 'active').length, icon: <Server className="w-5 h-5" />, color: 'from-green-500 to-emerald-500', bg: 'bg-green-50' },
                { label: 'Domains', value: MOCK_DOMAINS.length, icon: <Globe className="w-5 h-5" />, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50' },
                { label: 'Databases', value: MOCK_DATABASES.length, icon: <Database className="w-5 h-5" />, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-50' },
                { label: 'SSL Certificates', value: MOCK_SSL.length, icon: <Shield className="w-5 h-5" />, color: 'from-orange-500 to-amber-500', bg: 'bg-orange-50' },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center ${stat.color.split(' ')[0].replace('from-', 'text-')}`}>
                      {stat.icon}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* BDIX Servers */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3">
                <h2 className="text-white font-bold flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  BDiX Server Connectivity — Ultra-low latency within Bangladesh
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-5 py-3 font-semibold text-gray-700">Server</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-700">Location</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-700">Latency</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-700">Load</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-700">Uptime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BDIX_SERVERS.map((srv, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50 transition">
                        <td className="px-5 py-3 font-medium text-gray-900">{srv.name}</td>
                        <td className="px-5 py-3 text-gray-600">{srv.location}</td>
                        <td className="px-5 py-3">
                          <span className="text-green-600 font-bold">{srv.latency}</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full" style={{ width: srv.load }} />
                            </div>
                            <span className="text-gray-600">{srv.load}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-green-600 font-medium">{srv.uptime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Services */}
              <div className="bg-white rounded-xl border">
                <div className="px-5 py-3 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Your Services</h3>
                  <button onClick={() => setActiveTab('overview')} className="text-sm text-blue-600 hover:text-blue-700">View all</button>
                </div>
                <div className="divide-y">
                  {services.slice(0, 3).map((svc) => {
                    const s = statusConfig[svc.status] || statusConfig.pending
                    return (
                      <div key={svc.id} className="px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Server className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{svc.name}</div>
                            <div className="text-xs text-gray-500">{svc.serverIp || 'No IP assigned'}</div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${s.color}`}>
                          {s.icon} {svc.status}
                        </span>
                      </div>
                    )
                  })}
                  {services.length === 0 && (
                    <div className="px-5 py-8 text-center text-gray-400 text-sm">
                      No services yet — order your first one!
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Deploy */}
              <div className="bg-white rounded-xl border">
                <div className="px-5 py-3 border-b">
                  <h3 className="font-semibold text-gray-900">⚡ Quick Deploy</h3>
                </div>
                <div className="p-5 space-y-3">
                  {[
                    { name: 'WordPress', desc: 'One-click install with Bangla support', icon: <Box className="w-5 h-5" />, color: 'from-orange-400 to-red-500', action: () => { setActiveTab('wordpress'); startWpInstall() } },
                    { name: 'Node.js App', desc: 'Git deploy with custom domain', icon: <Code className="w-5 h-5" />, color: 'from-green-400 to-emerald-500', action: () => setActiveTab('deploy') },
                    { name: 'Static Site', desc: 'Push to deploy from GitHub', icon: <GitBranch className="w-5 h-5" />, color: 'from-blue-400 to-cyan-500', action: () => setActiveTab('deploy') },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={item.action}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border hover:border-gray-300 hover:bg-gray-50 transition text-left"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-white shrink-0`}>
                        {item.icon}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.desc}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── FILE MANAGER ───────────────────────────────────────────── */}
        {activeTab === 'files' && (
          <div className="bg-white rounded-xl border overflow-hidden">
            {/* Toolbar */}
            <div className="px-4 py-3 border-b bg-gray-50 flex flex-wrap items-center gap-2">
              <button onClick={goBack} disabled={currentPath === '/'} className="p-2 hover:bg-white rounded-lg disabled:opacity-30 transition">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-48">
                <div className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg text-sm">
                  <Folder className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 font-mono">{currentPath}</span>
                </div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                <Upload className="w-3.5 h-3.5" />
                Upload
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg hover:bg-white transition text-sm">
                <Folder className="w-3.5 h-3.5" />
                New Folder
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg hover:bg-white transition text-sm">
                <FileText className="w-3.5 h-3.5" />
                New File
              </button>
            </div>

            {/* Drop Zone */}
            <div
              className={`m-4 border-2 border-dashed rounded-xl transition-all ${uploadingFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="py-8 text-center">
                <Upload className={`w-8 h-8 mx-auto mb-2 ${uploadingFile ? 'text-green-500' : 'text-gray-300'}`} />
                <p className="text-sm text-gray-500">
                  {uploadingFile ? (
                    <span className="text-green-600 font-medium">Uploading... please wait</span>
                  ) : (
                    <>Drag & drop files here, or <button className="text-blue-600 hover:underline">browse</button></>
                  )}
                </p>
              </div>
            </div>

            {/* File List */}
            <div className="divide-y">
              {files.map((file, i) => {
                const isSelected = selectedFiles.has(file.name)
                return (
                  <div
                    key={i}
                    onClick={() => handleFileClick(file)}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      file.type === 'folder' ? 'bg-yellow-100' : 'bg-gray-100'
                    }`}>
                      {file.type === 'folder' ? (
                        <FolderOpen className="w-4 h-4 text-yellow-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-1.5">
                        {file.name}
                        {file.type === 'folder' && <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />}
                      </div>
                      <div className="text-xs text-gray-400">
                        {file.modified} · {file.permissions}
                        {file.size && ` · ${(file.size / 1024).toFixed(1)} KB`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button className="p-1.5 hover:bg-gray-200 rounded"><Copy className="w-3.5 h-3.5 text-gray-400" /></button>
                      <button className="p-1.5 hover:bg-gray-200 rounded"><Download className="w-3.5 h-3.5 text-gray-400" /></button>
                      <button className="p-1.5 hover:bg-red-50 rounded"><Trash className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(file.name)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </div>
                )
              })}
            </div>

            {/* File Actions Bar */}
            {selectedFiles.size > 0 && (
              <div className="px-4 py-3 border-t bg-blue-50 flex items-center gap-3">
                <span className="text-sm text-blue-700 font-medium">{selectedFiles.size} selected</span>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-50 transition text-sm">
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-50 transition text-sm">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition text-sm">
                  <Trash className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── DATABASES ─────────────────────────────────────────────── */}
        {activeTab === 'databases' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search databases..."
                  value={dbSearch}
                  onChange={e => setDbSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
                />
              </div>
              <button
                onClick={() => setShowDbModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> New Database
              </button>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-5 py-3 font-semibold text-gray-700">Database Name</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-700">Username</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-700">Tables</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-700">Size</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_DATABASES.filter(db => db.name.includes(dbSearch)).map((db, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50 transition">
                      <td className="px-5 py-3 font-mono text-gray-900">{db.name}</td>
                      <td className="px-5 py-3 font-mono text-gray-600">{db.user}</td>
                      <td className="px-5 py-3 text-gray-600">{db.tables}</td>
                      <td className="px-5 py-3 text-gray-600">{db.size}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="PHPMyAdmin">
                            <Database className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Backup">
                            <Download className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Delete">
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* phpMyAdmin CTA */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">phpMyAdmin Access</h3>
                <p className="text-sm opacity-90">Manage your MySQL databases with full phpMyAdmin interface</p>
              </div>
              <button className="px-5 py-2.5 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition text-sm">
                Open phpMyAdmin
              </button>
            </div>
          </div>
        )}

        {/* ── DOMAINS ───────────────────────────────────────────────── */}
        {activeTab === 'domains' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Domain Manager</h2>
              <button
                onClick={() => setShowDomainModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add Domain
              </button>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-5 py-3 font-semibold text-gray-700">Domain</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-700">Status</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-700">Expires</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-700">SSL</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_DOMAINS.map((dom, i) => {
                    const s = statusConfig[dom.status] || statusConfig.pending
                    return (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50 transition">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-blue-500" />
                            <span className="font-medium text-gray-900">{dom.domain}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${s.color}`}>
                            {s.icon} {dom.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-600">{dom.expires}</td>
                        <td className="px-5 py-3">
                          {dom.ssl ? (
                            <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                              <Lock className="w-3 h-3" /> Secured
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium">
                              <Unlock className="w-3 h-3" /> Unprotected
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="DNS Settings">
                              <Settings className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Manage">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Free Subdomain CTA */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-300" />
                  Free .hostamar.com Subdomain
                </h3>
                <p className="text-sm opacity-90">Get a free branded subdomain for your project</p>
              </div>
              <button className="px-5 py-2.5 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition text-sm">
                Claim Free Subdomain
              </button>
            </div>
          </div>
        )}

        {/* ── SSL ───────────────────────────────────────────────────── */}
        {activeTab === 'ssl' && (
          <div className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              {/* SSL Status */}
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-4">SSL Certificates</h3>
                <div className="space-y-3">
                  {MOCK_SSL.map((ssl, i) => {
                    const daysLeft = Math.ceil((new Date(ssl.expires).getTime() - Date.now()) / 86400000)
                    const isExpiring = daysLeft < 30
                    return (
                      <div key={i} className={`p-4 rounded-xl border ${isExpiring ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {ssl.autoRenew ? <Lock className="w-4 h-4 text-green-600" /> : <Unlock className="w-4 h-4 text-yellow-600" />}
                            <span className="font-semibold text-gray-900">{ssl.domain}</span>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isExpiring ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                            {daysLeft}d left
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <span>Provider: <strong>{ssl.provider}</strong></span>
                          <span>Issued: <strong>{ssl.issued}</strong></span>
                          <span>Expires: <strong>{ssl.expires}</strong></span>
                          <span>Auto-renew: <strong>{ssl.autoRenew ? 'Yes ✓' : 'No'}</strong></span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* SSL Info */}
              <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 rounded-xl border border-white/10 p-6 text-white">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Free SSL via Let's Encrypt</h3>
                    <p className="text-sm text-gray-400">All hostamar domains get free SSL</p>
                  </div>
                </div>
                <ul className="space-y-2.5 text-sm">
                  {[
                    'Auto-provision & renewal (90-day cycles)',
                    'Wildcard certificates supported',
                    'One-click HTTPS enforcement',
                    'HTTP → HTTPS automatic redirect',
                    'SHA-256 RSA encryption',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300">
                      <Check className="w-4 h-4 text-green-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button className="mt-5 w-full py-2.5 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl hover:bg-green-500/30 transition font-medium text-sm">
                  Request New SSL Certificate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── WORDPRESS ─────────────────────────────────────────────── */}
        {activeTab === 'wordpress' && (
          <div className="max-w-2xl mx-auto">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {WP_STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                    i < wpStep ? 'bg-green-500 text-white' :
                    i === wpStep ? 'bg-orange-500 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {i < wpStep ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-sm font-medium ${i === wpStep ? 'text-orange-600' : 'text-gray-400'}`}>{step}</span>
                  {i < WP_STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
                </div>
              ))}
            </div>

            {!wpComplete ? (
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3">
                  <h2 className="text-white font-bold">{WP_STEPS[wpStep]}</h2>
                </div>
                <div className="p-6 space-y-4">
                  {wpStep === 0 && (
                    <>
                      <p className="text-gray-500 text-sm">Choose a domain or subdomain for your WordPress site.</p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                        <input
                          type="text"
                          value={wpConfig.domain}
                          onChange={e => setWpConfig({ ...wpConfig, domain: e.target.value })}
                          placeholder="e.g. myblog.hostamar.com"
                          className="w-full px-4 py-2.5 border rounded-lg text-sm"
                        />
                      </div>
                    </>
                  )}
                  {wpStep === 1 && (
                    <>
                      <p className="text-gray-500 text-sm">Configure your WordPress site details.</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Site Title</label>
                          <input type="text" value={wpConfig.title} onChange={e => setWpConfig({ ...wpConfig, title: e.target.value })} placeholder="My Awesome Blog" className="w-full px-4 py-2.5 border rounded-lg text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Username</label>
                            <input type="text" value={wpConfig.user} onChange={e => setWpConfig({ ...wpConfig, user: e.target.value })} placeholder="admin" className="w-full px-4 py-2.5 border rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password</label>
                            <input type="password" value={wpConfig.pass} onChange={e => setWpConfig({ ...wpConfig, pass: e.target.value })} placeholder="••••••••" className="w-full px-4 py-2.5 border rounded-lg text-sm" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
                          <input type="email" value={wpConfig.email} onChange={e => setWpConfig({ ...wpConfig, email: e.target.value })} placeholder="you@example.com" className="w-full px-4 py-2.5 border rounded-lg text-sm" />
                        </div>
                      </div>
                    </>
                  )}
                  {wpStep === 2 && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Zap className="w-8 h-8 text-orange-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Installing WordPress...</h3>
                      <div className="space-y-2 text-sm text-gray-500 max-w-xs mx-auto">
                        <div className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Creating database</div>
                        <div className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Downloading WordPress</div>
                        <div className="flex items-center gap-2 animate-pulse"><Activity className="w-4 h-4 text-orange-500" /> Configuring plugins</div>
                        <div className="flex items-center gap-2 text-gray-300"><Clock className="w-4 h-4" /> Setting up Bangla language pack</div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    {wpStep > 0 && (
                      <button onClick={() => setWpStep(prev => prev - 1)} className="flex-1 py-2.5 border rounded-lg hover:bg-gray-50 transition text-sm font-medium">
                        Back
                      </button>
                    )}
                    <button
                      onClick={submitWpInstall}
                      disabled={wpStep === 2 || wpInstalling}
                      className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition disabled:opacity-50 text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      {wpInstalling ? <><Activity className="w-4 h-4 animate-spin" /> Installing...</> : wpStep === 2 ? 'Installing...' : wpStep === WP_STEPS.length - 2 ? 'Install WordPress' : 'Continue'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* WordPress Complete */
              <div className="bg-white rounded-xl border overflow-hidden text-center">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-5 py-6">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-white font-bold text-xl mt-3">WordPress Installed!</h2>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-gray-500 text-sm">Your WordPress site is ready. Access it now:</p>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Link2 className="w-4 h-4 text-blue-500" />
                    <span className="font-mono text-sm text-gray-900">{wpConfig.domain || 'your-site.hostamar.com'}</span>
                  </div>
                  <div className="flex gap-3">
                    <a href="#" className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium text-center">
                      Open Site
                    </a>
                    <a href="#" className="flex-1 py-2.5 border rounded-lg hover:bg-gray-50 transition text-sm font-medium text-center">
                      wp-admin
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DEPLOY ─────────────────────────────────────────────────── */}
        {activeTab === 'deploy' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Git-Based Deploy</h2>
              <p className="text-gray-500 text-sm mt-1">Connect your GitHub/GitLab repo and deploy automatically</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { name: 'GitHub', desc: 'Connect GitHub repository', icon: '🐙', color: 'from-gray-700 to-gray-900' },
                { name: 'GitLab', desc: 'Connect GitLab repository', icon: '🦊', color: 'from-orange-500 to-red-500' },
                { name: 'Git', desc: 'Push-to-deploy via Git', icon: '📦', color: 'from-red-500 to-orange-500' },
                { name: 'ZIP Upload', desc: 'Upload ZIP archive directly', icon: '🗜️', color: 'from-blue-500 to-cyan-500' },
              ].map((method, i) => (
                <button key={i} className="bg-white rounded-xl border p-5 text-left hover:shadow-md hover:border-blue-300 transition group">
                  <div className={`w-12 h-12 bg-gradient-to-br ${method.color} rounded-xl flex items-center justify-center text-2xl mb-3`}>
                    {method.icon}
                  </div>
                  <h3 className="font-bold text-gray-900">{method.name}</h3>
                  <p className="text-sm text-gray-500">{method.desc}</p>
                </button>
              ))}
            </div>

            {/* Deploy from template */}
            <div className="bg-white rounded-xl border">
              <div className="px-5 py-3 border-b">
                <h3 className="font-semibold text-gray-900">🚀 Deploy from Template</h3>
              </div>
              <div className="divide-y">
                {[
                  { name: 'Next.js 14 App', desc: 'React server components + Tailwind', lang: 'TypeScript', deployTime: '~45s' },
                  { name: 'React + Vite', desc: 'Modern SPA with HMR', lang: 'JavaScript', deployTime: '~30s' },
                  { name: 'Node.js Express', desc: 'REST API backend', lang: 'JavaScript', deployTime: '~60s' },
                  { name: 'Static HTML Site', desc: 'Pure HTML/CSS/JS site', lang: 'HTML', deployTime: '~15s' },
                ].map((tmpl, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{tmpl.name}</div>
                        <div className="text-xs text-gray-400">{tmpl.desc}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">{tmpl.lang}</span>
                      <span className="text-xs text-gray-400">{tmpl.deployTime}</span>
                      <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-medium">
                        Deploy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Service Modal */}
      {showCreateModal && (
        <CreateServiceModal onClose={() => setShowCreateModal(false)} onCreated={fetchServices} />
      )}

      {/* New Database Modal */}
      {showDbModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Create Database</h2>
              <button onClick={() => setShowDbModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
                <input type="text" value={newDb.name} onChange={e => setNewDb({ ...newDb, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg text-sm" placeholder="my_database" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input type="text" value={newDb.user} onChange={e => setNewDb({ ...newDb, user: e.target.value })} className="w-full px-4 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={newDb.pass} onChange={e => setNewDb({ ...newDb, pass: e.target.value })} className="w-full px-4 py-2 border rounded-lg text-sm" />
              </div>
              <button onClick={() => setShowDbModal(false)} className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                Create Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Domain Modal */}
      {showDomainModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add Domain</h2>
              <button onClick={() => setShowDomainModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain Name</label>
                <input type="text" value={newDomain} onChange={e => setNewDomain(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-sm" placeholder="example.com" />
              </div>
              <button onClick={() => setShowDomainModal(false)} className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                Add Domain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Create Service Modal ─────────────────────────────────────────────────────

function CreateServiceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [formData, setFormData] = useState({
    type: 'vps',
    name: '',
    cpu: '2',
    ram: '4',
    storage: '40',
    billingCycle: 'monthly',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const prices: Record<string, number> = { vps: 1500, rdp: 2500, 'web-hosting': 500, storage: 300 }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const specs = JSON.stringify({ cpu: parseInt(formData.cpu), ram: parseInt(formData.ram), storage: parseInt(formData.storage), bandwidth: 'Unlimited' })
      const res = await fetch('/api/dashboard/services/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: formData.type, name: formData.name, specs, price: prices[formData.type], billingCycle: formData.billingCycle }),
      })
      if (res.ok) { onCreated(); onClose() }
      else { const data = await res.json(); setError(data.error || 'Failed') }
    } catch { setError('Something went wrong') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Order New Service</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
              <option value="vps">VPS Server</option><option value="rdp">RDP Server</option><option value="web-hosting">Web Hosting</option><option value="storage">Storage</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="My Server" />
          </div>
          {(formData.type === 'vps' || formData.type === 'rdp') && (
            <div className="grid grid-cols-3 gap-4">
              {[['CPU', 'cpu', formData.cpu], ['RAM', 'ram', formData.ram], ['Storage', 'storage', formData.storage]].map(([label, key, val]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <select value={val as string} onChange={e => setFormData({ ...formData, [key]: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    {(key === 'cpu' ? ['1', '2', '4', '8'] : key === 'ram' ? ['2', '4', '8', '16'] : ['20', '40', '80', '100']).map(v => <option key={v} value={v}>{v} {key === 'cpu' ? 'vCPU' : key === 'ram' ? 'GB' : 'GB'}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
          <div className="bg-blue-50 p-4 rounded-lg"><p className="text-sm text-blue-700"><strong>Price:</strong> ৳{prices[formData.type]}/month</p></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? 'Creating...' : 'Order Now'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
