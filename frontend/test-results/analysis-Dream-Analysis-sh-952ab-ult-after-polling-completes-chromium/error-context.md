# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - heading "ユメログ" [level=1] [ref=e4]:
      - link "ユメログ" [ref=e5] [cursor=pointer]:
        - /url: /
    - navigation [ref=e7]:
      - link "ログイン" [ref=e8] [cursor=pointer]:
        - /url: /login
        - button "ログイン" [ref=e9] [cursor=pointer]
      - link "ユーザー登録" [ref=e10] [cursor=pointer]:
        - /url: /register
        - button "ユーザー登録" [ref=e11] [cursor=pointer]
  - generic [ref=e12]:
    - main [ref=e13]:
      - paragraph [ref=e14]: "エラー: ログインが必要です"
    - contentinfo [ref=e16]:
      - generic [ref=e17]: ©2024 dream-journal-app
  - generic [ref=e22] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e23] [cursor=pointer]:
      - img [ref=e24] [cursor=pointer]
    - generic [ref=e27] [cursor=pointer]:
      - button "Open issues overlay" [ref=e28] [cursor=pointer]:
        - generic [ref=e29] [cursor=pointer]:
          - generic [ref=e30] [cursor=pointer]: "0"
          - generic [ref=e31] [cursor=pointer]: "1"
        - generic [ref=e32] [cursor=pointer]: Issue
      - button "Collapse issues badge" [ref=e33] [cursor=pointer]:
        - img [ref=e34] [cursor=pointer]
  - alert [ref=e36]
```