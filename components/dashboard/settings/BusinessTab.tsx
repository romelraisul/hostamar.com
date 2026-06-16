import type { Business } from './types'

interface BusinessTabProps {
  business: Business
  setBusiness: (business: Partial<Business>) => void
}

export default function BusinessTab({ business, setBusiness }: BusinessTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Business Profile</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="bizName" className="block text-sm font-medium text-gray-700">
            Business Name
          </label>
          <input
            type="text"
            id="bizName"
            value={business.name}
            onChange={e => setBusiness({ ...business, name: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
            Industry
          </label>
          <input
            type="text"
            id="industry"
            value={business.industry}
            onChange={e => setBusiness({ ...business, industry: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700">
            Website
          </label>
          <input
            type="url"
            id="website"
            value={business.website}
            onChange={e => setBusiness({ ...business, website: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="desc" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="desc"
            rows={3}
            value={business.description}
            onChange={e => setBusiness({ ...business, description: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="facebook" className="block text-sm font-medium text-gray-700">
            Facebook
          </label>
          <input
            type="url"
            id="facebook"
            value={business.facebook}
            onChange={e => setBusiness({ ...business, facebook: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="instagram" className="block text-sm font-medium text-gray-700">
            Instagram
          </label>
          <input
            type="url"
            id="instagram"
            value={business.instagram}
            onChange={e => setBusiness({ ...business, instagram: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="youtube" className="block text-sm font-medium text-gray-700">
            YouTube
          </label>
          <input
            type="url"
            id="youtube"
            value={business.youtube}
            onChange={e => setBusiness({ ...business, youtube: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="brandColor" className="block text-sm font-medium text-gray-700">
            Brand Color
          </label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              id="brandColor"
              value={business.brandColor}
              onChange={e => setBusiness({ ...business, brandColor: e.target.value })}
              className="h-9 w-14 rounded border-gray-300 cursor-pointer"
            />
            <span className="text-sm text-gray-500">{business.brandColor}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
