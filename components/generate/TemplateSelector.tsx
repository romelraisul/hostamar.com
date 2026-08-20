interface PromptTemplate {
  id: string
  label: string
  icon: string
  prompt: string
}

interface TemplateSelectorProps {
  templates: PromptTemplate[]
  selectedTemplate: string | null
  onSelect: (id: string) => void
}

export default function TemplateSelector({ templates, selectedTemplate, onSelect }: TemplateSelectorProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">টেমপ্লেট বেছে নিন</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => (
          <button key={t.id} onClick={() => onSelect(t.id)}
            className={`p-5 rounded-xl border-2 transition-all text-left ${
              selectedTemplate === t.id
                ? 'border-[#0E7C3A] bg-[#0E7C3A]/10 dark:bg-green-900/30 shadow-lg shadow-#0E7C3A'
                : 'border-gray-200 dark:border-gray-700 hover:border-[#0E7C3A] dark:hover:border-[#0E7C3A] hover:shadow-md'
            }`}>
            <span className="text-3xl mb-2 block">{t.icon}</span>
            <h3 className="font-semibold text-gray-800 dark:text-white">{t.label}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{t.prompt}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
