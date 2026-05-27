import { cn } from '../../lib/cn'

/**
 * Button — primary interactive control.
 * variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
 * size:    'sm' | 'md' | 'lg'
 */
export function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  fullWidth = false,
  className,
  children,
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-px ' +
    'transition-all duration-150'
  const variants = {
    primary: 'bg-navy-800 hover:bg-navy-700 text-white shadow-sm',
    secondary: 'bg-white text-navy-800 border border-border-strong hover:bg-subtle',
    ghost: 'text-ink-700 hover:bg-subtle',
    outline: 'border border-sky-300 text-sky-700 hover:bg-sky-50',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  }
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-5 text-sm sm:text-base',
  }
  return (
    <Tag
      className={cn(base, variants[variant] || variants.primary, sizes[size] || sizes.md, fullWidth && 'w-full', className)}
      {...rest}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </Tag>
  )
}
