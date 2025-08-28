export const createMockUser = (overrides = {}) => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  ...overrides
});

export const createMockDream = (overrides   = {}) => ({
  id: 1,
  title: 'テストの夢',
  content: 'これは夢の内容です',
  createdAt: '2025-01-01',
  userId: 1,
  emotions: [],
  ...overrides
});

export const createMockEmotion = (overrides = {} )=> ({
  id: 1,
  name: '幸せ',
  ...overrides
});