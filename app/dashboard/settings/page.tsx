'use client'

import { useEffect, useState } from 'react'
import SettingsHeader from '@/components/dashboard/settings/SettingsHeader'
import SettingsSidebar from '@/components/dashboard/settings/SettingsSidebar'
import ProfileTab from '@/components/dashboard/settings/ProfileTab'
import BusinessTab from '@/components/dashboard/settings/BusinessTab'
import PasswordTab from '@/components/dashboard/settings/PasswordTab'
import NotificationsTab from '@/components/dashboard/settings/NotificationsTab'
import SaveButton from '@/components/dashboard/settings/SaveButton'
import type { Profile, Business } from '@/components/dashboard/settings/types'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  const [profile, setProfile] = useState<Profile>({
    name: '',
    email: '',
    phone: '',
  })

  const [business, setBusiness] = useState<Business>({
    name: '',
    industry: '',
    description: '',
    website: '',
    facebook: '',
    instagram: '',
    youtube: '',
    brandColor: '#3B82F6',
  })

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  })

  const [notifications, setNotifications] = useState({
    emailVideos: true,
    emailBilling: true,
    emailMarketing: false,
    pushNotifications: true,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch('/api/dashboard/settings')
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
        setBusiness(data.business || {
          name: '',
          industry: '',
          description: '',
          website: '',
          facebook: '',
          instagram: '',
          youtube: '',
          brandColor: '#3B82F6',
        })
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)

    try {
      const res = await fetch('/api/dashboard/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, business }),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader saved={saved} />

      <div className="flex flex-col lg:flex-row gap-6">
        <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1">
          <div className="bg-white rounded-xl border p-6">
            {activeTab === 'profile' && (
              <ProfileTab profile={profile} setProfile={setProfile} />
            )}
            {activeTab === 'business' && (
              <BusinessTab business={business} setBusiness={setBusiness} />
            )}
            {activeTab === 'password' && (
              <PasswordTab passwords={passwords} setPasswords={setPasswords} />
            )}
            {activeTab === 'notifications' && (
              <NotificationsTab notifications={notifications} setNotifications={setNotifications} />
            )}

            <SaveButton saving={saving} onSave={handleSave} />
          </div>
        </div>
      </div>
    </div>
  )
}
