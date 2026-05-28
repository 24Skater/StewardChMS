import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Icon } from './Icon'
import { allIconNames } from './registry'

describe('Icon', () => {
  it('renders without crashing for all 56 names', () => {
    allIconNames.forEach(name => {
      const { unmount } = render(<Icon name={name} />)
      unmount()
    })
  })

  it('defaults to size 18', () => {
    const { container } = render(<Icon name="dashboard" />)
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('18')
  })

  it('applies custom size', () => {
    const { container } = render(<Icon name="dashboard" size={24} />)
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('24')
  })

  it('decorative icon (no aria-label) has aria-hidden="true"', () => {
    const { container } = render(<Icon name="dashboard" />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('decorative icon has no role attribute', () => {
    const { container } = render(<Icon name="dashboard" />)
    expect(container.querySelector('svg')?.getAttribute('role')).toBeNull()
  })

  it('labelled icon is findable by role="img" and label', () => {
    render(<Icon name="delete" aria-label="Delete member" />)
    expect(screen.getByRole('img', { name: 'Delete member' })).toBeInTheDocument()
  })

  it('labelled icon does not have aria-hidden', () => {
    const { container } = render(<Icon name="delete" aria-label="Delete member" />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBeNull()
  })

  it('active=false renders outlined variant (fill="none" on Lucide icons)', () => {
    const { container } = render(<Icon name="dashboard" active={false} />)
    expect(container.querySelector('svg')?.getAttribute('fill')).toBe('none')
  })

  it('active=true renders filled variant (fill="currentColor" on Lucide icons)', () => {
    const { container } = render(<Icon name="dashboard" active />)
    expect(container.querySelector('svg')?.getAttribute('fill')).toBe('currentColor')
  })

  it('forwards className to the svg', () => {
    const { container } = render(<Icon name="dashboard" className="text-blue-500" />)
    expect(container.querySelector('svg')?.classList.contains('text-blue-500')).toBe(true)
  })
})
