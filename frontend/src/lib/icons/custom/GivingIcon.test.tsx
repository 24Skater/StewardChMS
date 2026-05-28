import { render } from '@testing-library/react'
import { GivingIconOutlined, GivingIconFilled } from './GivingIcon'

it('outlined renders svg at given size', () => {
  const { container } = render(<GivingIconOutlined size={24} />)
  expect(container.querySelector('svg')?.getAttribute('width')).toBe('24')
})

it('filled renders svg at given size', () => {
  const { container } = render(<GivingIconFilled size={24} />)
  expect(container.querySelector('svg')?.getAttribute('width')).toBe('24')
})

it('forwards aria-label and role to svg', () => {
  const { container } = render(
    <GivingIconOutlined aria-label="Giving" role="img" />
  )
  const svg = container.querySelector('svg')
  expect(svg?.getAttribute('aria-label')).toBe('Giving')
  expect(svg?.getAttribute('role')).toBe('img')
})

it('applies className to svg', () => {
  const { container } = render(<GivingIconOutlined className="text-amber-500" />)
  expect(container.querySelector('svg')?.classList.contains('text-amber-500')).toBe(true)
})
