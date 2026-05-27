import { cn } from '../../lib/cn'

export function Field({ label, hint, error, required, htmlFor, className, children }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-xs font-medium text-ink-600">
          {label}
          {required && <span className="text-red-600 ms-1">*</span>}
          {!required && <span className="text-ink-300 ms-1 font-normal">(optional)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  )
}

const inputBase =
  'h-11 w-full rounded-lg border border-border-strong bg-white px-3 ' +
  'text-sm text-ink-900 placeholder:text-ink-300 ' +
  'focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:outline-none ' +
  'disabled:bg-subtle disabled:cursor-not-allowed transition-colors'

export function Input({ className, prefix, ...rest }) {
  if (prefix) {
    return (
      <div className="flex items-stretch">
        <span className="inline-flex items-center px-3 rounded-l-lg border border-border-strong bg-subtle text-ink-500 text-sm border-r-0">
          {prefix}
        </span>
        <input className={cn(inputBase, 'rounded-l-none', className)} {...rest} />
      </div>
    )
  }
  return <input className={cn(inputBase, className)} {...rest} />
}

export function Textarea({ className, ...rest }) {
  return (
    <textarea
      className={cn(inputBase, 'h-auto py-2 min-h-[80px] resize-y', className)}
      {...rest}
    />
  )
}

export function Select({ className, children, ...rest }) {
  return (
    <select
      className={cn(inputBase, 'pe-9 appearance-none bg-no-repeat bg-[length:1.2em] bg-[position:right_0.6rem_center]', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748B' stroke-width='2'><path stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/></svg>\")",
      }}
      {...rest}
    >
      {children}
    </select>
  )
}
