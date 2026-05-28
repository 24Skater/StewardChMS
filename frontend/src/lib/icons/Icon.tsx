import { registry } from './registry'
import type { IconName } from './registry'

interface IconProps {
  name: IconName
  size?: 12 | 14 | 16 | 18 | 20 | 24 | 32 | 48
  active?: boolean
  className?: string
  'aria-label'?: string
}

export function Icon({
  name,
  size = 18,
  active = false,
  className,
  'aria-label': ariaLabel,
}: IconProps) {
  const entry = registry[name]
  const Component = active ? entry.filled : entry.outlined

  return (
    <Component
      size={size}
      className={className}
      aria-hidden={ariaLabel ? undefined : 'true'}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
    />
  )
}
