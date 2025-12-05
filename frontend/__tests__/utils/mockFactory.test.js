import {
  createMockUser,
  createMockDream,
  createMockEmotion,
} from "./mockFactory";

describe("mockFactory", () => {
  describe("createMockUser", () => {
    it("should create a user with default values", () => {
      const user = createMockUser();
      expect(user).toEqual({
        id: 1,
        username: "testuser",
        email: "test@example.com",
      });
    });

    it("should allow overriding default values", () => {
      const user = createMockUser({ username: "newuser", id: 99 });
      expect(user).toEqual({
        id: 99,
        username: "newuser",
        email: "test@example.com",
      });
    });
  });

  describe("createMockDream", () => {
    it("should create a dream with default values", () => {
      const dream = createMockDream();
      expect(dream).toEqual({
        id: 1,
        title: "テストの夢",
        content: "これは夢の内容です",
        createdAt: "2025-01-01",
        userId: 1,
        emotions: [],
      });
    });

    it("should allow overriding default values", () => {
      const dream = createMockDream({
        title: "新しい夢",
        content: "新しい内容",
      });
      expect(dream).toEqual({
        id: 1,
        title: "新しい夢",
        content: "新しい内容",
        createdAt: "2025-01-01",
        userId: 1,
        emotions: [],
      });
    });
  });

  describe("createMockEmotion", () => {
    it("should create an emotion with default values", () => {
      const emotion = createMockEmotion();
      expect(emotion).toEqual({
        id: 1,
        name: "幸せ",
      });
    });

    it("should allow overriding default values", () => {
      const emotion = createMockEmotion({ name: "悲しい" });
      expect(emotion).toEqual({
        id: 1,
        name: "悲しい",
      });
    });
  });
});
