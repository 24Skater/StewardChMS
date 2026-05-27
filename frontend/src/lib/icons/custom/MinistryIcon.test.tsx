import { render } from '@testing-library/react'
import { MinistryIconOutlined, MinistryIconFilled } from './MinistryIcon'

it('outlined renders svg at given size', () => {
  const { container } = render(<MinistryIconOutlined size={24} />)
  const svg = container.querySelector('svg')
  expect(svg?.getAttribute('width')).toBe('24')
})

it('filled renders svg at given size', () => {
  const { container } = render(<MinistryIconFilled size={24} />)
  const svg = container.querySelector('svg')
  expect(svg?.getAttribute('width')).toBe('24')
})

it('forwards aria-label and role to svg', () => {
  const { container } = render(
    <MinistryIconOutlined aria-label="Ministry" role="img" />
  )
  const svg = container.querySelector('svg')
  expect(svg?.getAttribute('aria-label')).toBe('Ministry')
  expect(svg?.getAttribute('role')).toBe('img')
})

it('applies className to svg', () => {
  const { container } = render(<MinistryIconOutlined className="text-indigo-500" />)
  expect(container.querySelector('svg')?.classList.contains('text-indigo-500')).toBe(true)
})
