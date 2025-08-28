import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DreamCard from '@/app/components/DreamCard'
import { createMockDream, createMockEmotion } from '../utils/mockFactory'

// Mock next/link to render a simple anchor for testing
jest.mock('next/link', () => {
  return ({ href, children, ...props }) => (
    <a
      href={typeof href === 'string' ? href : href?.pathname}
      onClick={(e) => e.preventDefault()}
      {...props}
    >
      {children}
    </a>
  )
})

// Stabilize date formatting across environments
jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns')
  return { ...actual, format: jest.fn(() => '2025-01-01') }
})

describe('DreamCard', () => {
  const baseDream = {
    ...createMockDream(),
    // Component expects snake_case created_at
    created_at: '2025-01-01T00:00:00.000Z',
  }

  it('renders title, formatted date, content, and read-more text', async () => {
    // Arrange
    const dream = { ...baseDream, content: '短い内容' }

    // Act
    render(<DreamCard dream={dream} />)

    // Assert
    expect(screen.getByRole('heading', { level: 2, name: dream.title })).toBeInTheDocument()
    expect(screen.getByText('2025-01-01')).toBeInTheDocument() // from mocked date-fns format
    expect(screen.getByText('短い内容')).toBeInTheDocument()
    expect(screen.getByText('続きを読む')).toBeInTheDocument()
  })

  it('truncates long content to 70 characters with ellipsis', async () => {
    // Arrange
    const longContent = 'a'.repeat(80)
    const dream = { ...baseDream, content: longContent }

    // Act
    render(<DreamCard dream={dream} />)

    // Assert
    const expected = 'a'.repeat(70) + '...'
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('shows fallback text when content is empty or undefined', async () => {
    // Arrange
    const dream = { ...baseDream, content: undefined }

    // Act
    render(<DreamCard dream={dream} />)

    // Assert
    expect(screen.getByText('内容がありません')).toBeInTheDocument()
  })

  it('renders emotion tags when provided', async () => {
    // Arrange
    const emotions = [
      createMockEmotion({ id: 1, name: '嬉しい' }),
      createMockEmotion({ id: 2, name: '悲しい' }),
    ]
    const dream = { ...baseDream, emotions }

    // Act
    render(<DreamCard dream={dream} />)

    // Assert
    expect(screen.getByText('嬉しい')).toBeInTheDocument()
    expect(screen.getByText('悲しい')).toBeInTheDocument()
  })

  it('links to the dream detail page with correct aria-label', async () => {
    // Arrange
    const dream = { ...baseDream, id: 42, title: 'リンクテストの夢' }

    // Act
    render(<DreamCard dream={dream} />)

    // Assert
    const link = screen.getByRole('link', { name: `${dream.title} の詳細を見る` })
    expect(link).toBeInTheDocument()
    // Component uses relative href `dream/${id}`
    expect(link).toHaveAttribute('href', `dream/${dream.id}`)
  })

  it('is clickable (event test) without throwing', async () => {
    // Arrange
    const user = userEvent.setup()
    const dream = { ...baseDream }

    // Act
    render(<DreamCard dream={dream} />)
    const link = screen.getByRole('link')
    await user.click(link)

    // Assert
    expect(link).toBeInTheDocument()
  })
})
