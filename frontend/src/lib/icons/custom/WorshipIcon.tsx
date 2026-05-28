import type { FC, SVGAttributes } from 'react'

type Props = {
  size?: number
  className?: string
} & Pick<SVGAttributes<SVGSVGElement>, 'aria-hidden' | 'aria-label' | 'role'>

export const WorshipIconOutlined: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...aria}
  >
    {/* Left raised arm */}
    <path
      d="M8 13 Q6 9 7 5 Q8 3 10 4 Q11 5 10 8 L9 13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Right raised arm */}
    <path
      d="M16 13 Q18 9 17 5 Q16 3 14 4 Q13 5 14 8 L15 13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Body arch */}
    <path
      d="M9 13 Q9 17 12 18 Q15 17 15 13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
)

export const WorshipIconFilled: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...aria}
  >
    <path
      d="M8 13 Q6 9 7 5 Q8 3 10 4 Q11 5 10 8 L9 13 Q9 17 12 18 Q15 17 15 13 L14 8 Q13 5 14 4 Q16 3 17 5 Q18 9 16 13"
      fill="currentColor"
      stroke="none"
    />
  </svg>
)
