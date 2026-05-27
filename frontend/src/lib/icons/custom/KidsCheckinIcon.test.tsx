import { render } from '@testing-library/react'
import { KidsCheckinIconOutlined, KidsCheckinIconFilled } from './KidsCheckinIcon'

it('outlined renders an svg at the given size', () => {
  const { container } = render(<KidsCheckinIconOutlined size={24} />)
  const svg = container.querySelector('svg')
  expect(svg).toBeTruthy()
  expect(svg?.getAttribute('width')).toBe('24')
})

it('filled renders an svg at the given size', () => {
  const { container } = render(<KidsCheckinIconFilled size={24} />)
  const svg = container.querySelector('svg')
  expect(svg).toBeTruthy()
  expect(svg?.getAttribute('width')).toBe('24')
})
