import type { FC, SVGAttributes } from 'react'

type Props = {
  size?: number
  className?: string
} & Pick<SVGAttributes<SVGSVGElement>, 'aria-hidden' | 'aria-label' | 'role'>

export const GivingIconOutlined: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...aria}
  >
    {/* Open palm / hand */}
    <path
      d="M6 15h12l2 6H4l2-6z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Heart above */}
    <path
      d="M12 13 C12 13 7 10 7 7.5 C7 6 8.5 5 10 5.5 C11 6 12 7 12 7 C12 7 13 6 14 5.5 C15.5 5 17 6 17 7.5 C17 10 12 13 12 13 Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
)

export const GivingIconFilled: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...aria}
  >
    <path d="M6 15h12l2 6H4l2-6z" fill="currentColor" />
    <path
      d="M12 13 C12 13 7 10 7 7.5 C7 6 8.5 5 10 5.5 C11 6 12 7 12 7 C12 7 13 6 14 5.5 C15.5 5 17 6 17 7.5 C17 10 12 13 12 13 Z"
      fill="currentColor"
    />
  </svg>
)
