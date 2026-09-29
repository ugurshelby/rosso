export interface ErrorCardProps {
  message?: string
  description?: string
  onDismiss?: () => void
}

export function ErrorCard({
  message = 'Something went wrong',
  description = 'Please try again.',
  onDismiss,
}: ErrorCardProps) {
  return (
    <div className="flex flex-col gap-2 w-60 sm:w-72 text-[10px] sm:text-xs z-50">
      <div className="error-alert cursor-default flex items-center justify-between w-full h-12 sm:h-14 rounded-lg bg-card px-[10px]">
        <div className="flex gap-2">
          <div className="text-red-500 bg-white/5 backdrop-blur-xl p-1 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <p className="text-foreground">{message}</p>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>
        {onDismiss && (
          <button
            className="text-muted-foreground hover:bg-white/10 p-1 rounded-md transition-colors ease-linear"
            onClick={onDismiss}
            aria-label="Kapat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
