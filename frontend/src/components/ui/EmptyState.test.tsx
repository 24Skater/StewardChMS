import { render, screen } from '@testing-library/react'
import { EmptyState } from './EmptyState'

it('renders the title', () => {
  render(<EmptyState icon="members" title="No members yet" />)
  expect(screen.getByText('No members yet')).toBeInTheDocument()
})

it('renders optional description', () => {
  render(
    <EmptyState icon="events" title="No events" description="Add your first event to get started." />
  )
  expect(screen.getByText('Add your first event to get started.')).toBeInTheDocument()
})

it('renders a 48px icon', () => {
  const { container } = render(<EmptyState icon="reports" title="No reports" />)
  expect(container.querySelector('svg')?.getAttribute('width')).toBe('48')
})

it('renders optional action button', () => {
  render(
    <EmptyState
      icon="members"
      title="No members"
      action={{ label: 'Add Member', onClick: () => {} }}
    />
  )
  expect(screen.getByRole('button', { name: 'Add Member' })).toBeInTheDocument()
})
