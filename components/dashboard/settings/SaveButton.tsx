interface SaveButtonProps {
  saving: boolean
  onSave: () => void
}

export default function SaveButton({ saving, onSave }: SaveButtonProps) {
  return (
    <div className="flex justify-end mt-6 pt-4 border-t">
      <button
        onClick={onSave}
        disabled={saving}
        className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors ${
          saving
            ? 'bg-blue-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
        }`}
      >
        {saving ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
            </svg>
            Saving...
          </>
        ) : (
          <>Save Changes</>
        )}
      </button>
    </div>
  )
}
