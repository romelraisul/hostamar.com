'use client'

import type { Business } from './types'

interface Props {
  business: Business
  setBusiness: (b: Business) => void
}

export default function BusinessTab({ business, setBusiness }: Props) {
  function update(field: keyof Business, value: string) {
    setBusiness({ ...business, [field]: value })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Business Info</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
          <input
            type="text"
            value={business.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
          <input
            type="text"
            value={business.industry}
            onChange={(e) => update('industry', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={business.description}
            onChange={(e) => update('description', e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
          <input
            type="url"
            value={business.website}
            onChange={(e) => update('website', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
          <input
            type="text"
            value={business.facebook}
            onChange={(e) => update('facebook', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
          <input
            type="text"
            value={business.instagram}
            onChange={(e) => update('instagram', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">YouTube</label>
          <input
            type="text"
            value={business.youtube}
            onChange={(e) => update('youtube', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={business.brandColor}
              onChange={(e) => update('brandColor', e.target.value)}
              className="h-9 w-9 rounded border border-gray-300 cursor-pointer"
            />
            <span className="text-xs text-gray-500">{business.brandColor}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
