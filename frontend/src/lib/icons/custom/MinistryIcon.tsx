import type { FC, SVGAttributes } from 'react'

type Props = {
  size?: number
  className?: string
} & Pick<SVGAttributes<SVGSVGElement>, 'aria-hidden' | 'aria-label' | 'role'>

export const MinistryIconOutlined: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...aria}
  >
    <polygon
      points="12,2 21,7 21,17 12,22 3,17 3,7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <polygon
      points="12,7.5 17,10.2 17,13.8 12,16.5 7,13.8 7,10.2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
)

export const MinistryIconFilled: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...aria}
  >
    <polygon
      points="12,2 21,7 21,17 12,22 3,17 3,7"
      fill="currentColor"
    />
    <polygon
      points="12,7.5 17,10.2 17,13.8 12,16.5 7,13.8 7,10.2"
      fill="white"
      opacity="0.25"
    />
    <circle cx="12" cy="12" r="2" fill="white" />
  </svg>
)
