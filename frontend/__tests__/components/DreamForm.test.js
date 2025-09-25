import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DreamForm from '@/app/components/DreamForm'
import { createMockEmotion } from '../utils/mockFactory'

// Mocks
jest.mock('@/lib/apiClient', () => ({
  getEmotions: jest.fn(),
}))

jest.mock('@/lib/toast', () => ({
  toast: {
    error: jest.fn(),
  },
}))

const { getEmotions } = require('@/lib/apiClient')
const { toast } = require('@/lib/toast')

describe('DreamForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('loads emotions and toggles selection', async () => {
    // Arrange
    const emotions = [
      createMockEmotion({ id: 1, name: '嬉しい' }),
      createMockEmotion({ id: 2, name: '悲しい' }),
    ]
    getEmotions.mockResolvedValueOnce(emotions)
    const onSubmit = jest.fn()
    const user = userEvent.setup()

    // Act
    render(<DreamForm onSubmit={onSubmit} />)

    // Assert
    const happy = await screen.findByRole('checkbox', { name: '嬉しい' })
    const sad = await screen.findByRole('checkbox', { name: '悲しい' })
    expect(happy).toBeInTheDocument()
    expect(sad).toBeInTheDocument()

    // toggle select/unselect
    expect(happy).not.toBeChecked()
    await user.click(happy)
    expect(happy).toBeChecked()
    await user.click(happy)
    expect(happy).not.toBeChecked()
  })

  it('submits valid form with trimmed fields and selected emotion_ids', async () => {
    // Arrange
    const emotions = [createMockEmotion({ id: 5, name: '楽しい' })]
    getEmotions.mockResolvedValueOnce(emotions)
    const onSubmit = jest.fn()
    const user = userEvent.setup()

    render(<DreamForm onSubmit={onSubmit} />)

    // Wait for emotions
    const fun = await screen.findByRole('checkbox', { name: '楽しい' })

    // Fill inputs
    const titleInput = screen.getByLabelText('タイトル')
    const contentInput = screen.getByLabelText('夢の内容')
    await user.type(titleInput, '  テストタイトル  ')
    await user.type(contentInput, '  テスト内容  ')
    await user.click(fun)

    // Act
    await user.click(screen.getByRole('button', { name: '保存' }))

    // Assert
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'テストタイトル',
      content: 'テスト内容',
      emotion_ids: [5],
    })
  })

  it('shows validation error when title is only whitespace and does not submit', async () => {
    // Arrange
    getEmotions.mockResolvedValueOnce([])
    const onSubmit = jest.fn()
    const user = userEvent.setup()

    render(<DreamForm onSubmit={onSubmit} />)

    // Fill title with spaces to bypass HTML required check but fail trim validation
    const titleInput = screen.getByLabelText('タイトル')
    await user.type(titleInput, '   ')
    await user.click(screen.getByRole('button', { name: '保存' }))

    // Assert
    expect(toast.error).toHaveBeenCalledWith('タイトルを入力してください。')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('handles emotion fetch errors and shows fallback message', async () => {
    // Arrange
    getEmotions.mockRejectedValueOnce(new Error('network error'))
    const onSubmit = jest.fn()

    // Act
    render(<DreamForm onSubmit={onSubmit} />)

    // Assert
    // After failure, no emotions -> fallback text is shown
    expect(await screen.findByText('感情タグがありません。')).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('感情一覧の取得に失敗しました。')
  })

  it('pre-fills fields and selected emotions from initialData', async () => {
    // Arrange
    const emotions = [
      createMockEmotion({ id: 10, name: '不安' }),
      createMockEmotion({ id: 11, name: '不思議' }),
    ]
    getEmotions.mockResolvedValueOnce(emotions)

    const initialData = {
      id: 1,
      title: '初期タイトル',
      content: '初期コンテンツ',
      userId: 1,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      emotions: [{ id: 11, name: '不思議' }],
    }

    // Act
    render(<DreamForm initialData={initialData} onSubmit={jest.fn()} />)

    // Assert
    expect(screen.getByDisplayValue('初期タイトル')).toBeInTheDocument()
    expect(screen.getByDisplayValue('初期コンテンツ')).toBeInTheDocument()

    const wonder = await screen.findByRole('checkbox', { name: '不思議' })
    const anxiety = await screen.findByRole('checkbox', { name: '不安' })
    expect(wonder).toBeChecked()
    expect(anxiety).not.toBeChecked()
  })
})
