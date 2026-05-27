import { render } from '@testing-library/react'
import { WorshipIconOutlined, WorshipIconFilled } from './WorshipIcon'

it('outlined renders svg at given size', () => {
  const { container } = render(<WorshipIconOutlined size={24} />)
  expect(container.querySelector('svg')?.getAttribute('width')).toBe('24')
})

it('filled renders svg at given size', () => {
  const { container } = render(<WorshipIconFilled size={24} />)
  expect(container.querySelector('svg')?.getAttribute('width')).toBe('24')
})

it('forwards aria-label and role to svg', () => {
  const { container } = render(
    <WorshipIconOutlined aria-label="Worship" role="img" />
  )
  const svg = container.querySelector('svg')
  expect(svg?.getAttribute('aria-label')).toBe('Worship')
  expect(svg?.getAttribute('role')).toBe('img')
})

it('applies className to svg', () => {
  const { container } = render(<WorshipIconOutlined className="text-purple-500" />)
  expect(container.querySelector('svg')?.classList.contains('text-purple-500')).toBe(true)
})
