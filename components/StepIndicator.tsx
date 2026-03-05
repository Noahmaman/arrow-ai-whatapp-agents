type Props = {
  steps: string[]
  current: number
}

export default function StepIndicator({ steps, current }: Props) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          {/* Circle */}
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                ${i < current ? 'bg-whatsapp-green text-white' : ''}
                ${i === current ? 'bg-whatsapp-dark text-white ring-4 ring-whatsapp-green/20' : ''}
                ${i > current ? 'bg-white text-slate-400 border-2 border-slate-200' : ''}
              `}
            >
              {i < current ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`mt-1.5 text-xs font-medium whitespace-nowrap
                ${i === current ? 'text-whatsapp-dark' : i < current ? 'text-whatsapp-green' : 'text-slate-400'}
              `}
            >
              {label}
            </span>
          </div>

          {/* Connector line */}
          {i < steps.length - 1 && (
            <div
              className={`w-16 h-0.5 mb-5 mx-1 transition-all
                ${i < current ? 'bg-whatsapp-green' : 'bg-slate-200'}
              `}
            />
          )}
        </div>
      ))}
    </div>
  )
}
