import type { FC } from 'react'
import type { SVGAttributes } from 'react'

type Props = {
  size?: number
  className?: string
} & Pick<SVGAttributes<SVGSVGElement>, 'aria-hidden' | 'aria-label' | 'role'>

export const KidsCheckinIconOutlined: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...aria}
  >
    <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
    <path
      d="M3 21v-1a6 6 0 0 1 6-6h2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="17.5" cy="16.5" r="4.5" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="m14.8 16.5 1.8 1.8 3.1-3.1"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const KidsCheckinIconFilled: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...aria}
  >
    <circle cx="9" cy="8" r="3.5" fill="currentColor" />
    <path
      d="M3 21v-1a6 6 0 0 1 6-6h2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="17.5" cy="16.5" r="4.5" fill="currentColor" />
    <path
      d="m14.8 16.5 1.8 1.8 3.1-3.1"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
