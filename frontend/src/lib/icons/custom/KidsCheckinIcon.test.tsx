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

it('forwards aria-label and role to svg', () => {
  const { container } = render(
    <KidsCheckinIconOutlined aria-label="Kids checked in" role="img" />
  )
  const svg = container.querySelector('svg')
  expect(svg?.getAttribute('aria-label')).toBe('Kids checked in')
  expect(svg?.getAttribute('role')).toBe('img')
})

it('applies className to svg', () => {
  const { container } = render(<KidsCheckinIconOutlined className="text-blue-500" />)
  expect(container.querySelector('svg')?.classList.contains('text-blue-500')).toBe(true)
})
