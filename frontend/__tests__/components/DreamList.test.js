import React from 'react'
import { render, screen } from '@testing-library/react'

// Stabilize Link and date formatting for integration tests
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

jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns')
  return { ...actual, format: jest.fn(() => '2025-01-01') }
})

const makeDream = (overrides = {}) => ({
  id: 1,
  title: '夢1',
  content: '内容1',
  userId: 1,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  emotions: [],
  ...overrides,
})

describe('DreamList (integration with DreamCard)', () => {
  let DreamList
  let consoleErrorSpy

  beforeEach(() => {
    // このテストブロックが実行される前に、console.errorを一時的に何もしない関数に置き換えます。
    // これにより、意図的にエラーを発生させるテストで、コンソールがエラーメッセージで汚れなくなります。
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.resetModules()
    jest.isolateModules(() => {
      DreamList = require('@/app/components/DreamList').default
    })
  })

  afterEach(() => {
    // 各テストの後に、置き換えたconsole.errorを元の状態に戻します。
    // これをしないと、他のテストスイートでの実際のエラーが見えなくなってしまいます。
    consoleErrorSpy.mockRestore()
  })

  it('renders multiple items as links with correct aria-labels', () => {
    // Arrange
    const dreams = [
      makeDream({ id: 1, title: '一つ目' }),
      makeDream({ id: 2, title: '二つ目' }),
    ]

    // Act
    render(<DreamList dreams={dreams} />)

    // Assert
    expect(screen.getByRole('link', { name: '一つ目 の詳細を見る' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '二つ目 の詳細を見る' })).toBeInTheDocument()
  })

  it('renders a single item properly', () => {
    // Arrange
    const dreams = [makeDream({ id: 7, title: '単体' })]

    // Act
    render(<DreamList dreams={dreams} />)

    // Assert
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', 'dream/7')
  })

  it('renders nothing for empty list (no DreamCard)', () => {
    // Arrange
    const dreams = []

    // Act
    render(<DreamList dreams={dreams} />)

    // Assert
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('preserves order of dreams (sorting responsibility upstream)', () => {
    // Arrange: pass in a specific order
    const dreams = [
      makeDream({ id: 20, title: '新しい' }),
      makeDream({ id: 10, title: '古い' }),
      makeDream({ id: 15, title: '中間' }),
    ]

    // Act
    render(<DreamList dreams={dreams} />)

    // Assert: order of links should match order of input
    const links = screen.getAllByRole('link')
    const labels = links.map((el) => el.getAttribute('aria-label'))
    expect(labels).toEqual([
      '新しい の詳細を見る',
      '古い の詳細を見る',
      '中間 の詳細を見る',
    ])
  })

  it('renders only filtered dreams when a filtered list is provided', () => {
    // Arrange: simulate upstream filtering by emotion
    const dreams = [
      makeDream({ id: 1, title: '嬉しい夢', emotions: [{ id: 1, name: '嬉しい' }] }),
      makeDream({ id: 2, title: '悲しい夢', emotions: [{ id: 2, name: '悲しい' }] }),
    ]
    const filtered = dreams.filter((d) => d.emotions?.some((e) => e.name === '嬉しい'))

    // Act
    render(<DreamList dreams={filtered} />)

    // Assert
    expect(screen.getByRole('link', { name: '嬉しい夢 の詳細を見る' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '悲しい夢 の詳細を見る' })).not.toBeInTheDocument()
  })

  it('can render a large number of items without crashing', () => {
    // Arrange
    const many = Array.from({ length: 200 }, (_, i) => makeDream({ id: i + 1, title: `夢${i + 1}` }))

    // Act
    render(<DreamList dreams={many} />)

    // Assert
    // count links equals number of dreams
    expect(screen.getAllByRole('link')).toHaveLength(200)
  })

  it('throws when provided invalid dream data (e.g., null entry)', () => {
    // Arrange
    const invalid = [null]

    // Act + Assert
    expect(() => {
      render(<DreamList dreams={invalid} />)
    }).toThrow()
  })
})

describe('DreamList (props forwarding to DreamCard)', () => {
  let DreamList
  const mockDreamCard = jest.fn(() => <div data-testid="mock-dream-card" />)

  beforeEach(() => {
    jest.resetModules()
    jest.doMock('@/app/components/DreamCard', () => ({ __esModule: true, default: mockDreamCard }))
    jest.isolateModules(() => {
      DreamList = require('@/app/components/DreamList').default
    })
    mockDreamCard.mockClear()
  })

  it('passes each dream as prop to DreamCard', () => {
    // Arrange
    const dreams = [
      makeDream({ id: 101, title: 'A' }),
      makeDream({ id: 102, title: 'B' }),
    ]

    // Act
    render(<DreamList dreams={dreams} />)

    // Assert
    expect(mockDreamCard).toHaveBeenCalledTimes(2)
    expect(mockDreamCard).toHaveBeenNthCalledWith(1, { dream: dreams[0] }, {})
    expect(mockDreamCard).toHaveBeenNthCalledWith(2, { dream: dreams[1] }, {})
  })
})
