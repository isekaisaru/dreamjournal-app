emotion_names = ['嬉しい', '楽しい', '悲しい', '怒り', '不安', '怖い', '不思議', '感動的']

emotion_names.each do |emotion_name|
  Emotion.find_or_create_by!(name: emotion_name)
end

emotion_cache = Emotion.where(name: emotion_names).index_by(&:name)

def ensure_demo_user(email:, username:, password:)
  user = User.find_or_initialize_by(email: email)
  user.username = username
  user.password = password
  user.password_confirmation = password
  user.save!
  user
end

family_demo = ensure_demo_user(
  email: 'family_demo@example.com',
  username: '家族デモ',
  password: 'password123'
)

child_demo = ensure_demo_user(
  email: 'child_demo@example.com',
  username: 'こどもデモ',
  password: 'password123'
)

def ensure_dream(user:, title:, content:, emotion_names:, emotion_cache:)
  dream = user.dreams.find_or_initialize_by(title: title)
  dream.content = content
  dream.save!

  emotions = emotion_names.filter_map { |name| emotion_cache[name] }
  dream.emotions = emotions if emotions.present?

  dream
end

family_dreams = [
  {
    title: '家族旅行で見た虹',
    content: '家族みんなで海辺に旅行に行って、夕方に大きな虹を見上げている夢。潮風の匂いと笑い声が印象的だった。',
    emotion_names: ['嬉しい', '感動的']
  },
  {
    title: '子どもの入学式',
    content: '春の日差しの中で、子どもが少し緊張した顔で入学式に向かう姿を見守る夢。親として胸がいっぱいになった。',
    emotion_names: ['楽しい', '不思議']
  },
  {
    title: '仕事と家庭の両立',
    content: '仕事の会議と家族の夕食の時間が重なってしまい、どちらも大事で焦ってしまう夢。目覚めてからも考え込んでしまった。',
    emotion_names: ['不安', '怒り']
  },
  {
    title: '家族のサプライズ誕生日',
    content: '家族みんなでこっそり準備した誕生日パーティーが成功して、笑顔と感謝でいっぱいになる夢。',
    emotion_names: ['嬉しい', '楽しい']
  }
]

family_dreams.each do |dream_attrs|
  ensure_dream(
    user: family_demo,
    title: dream_attrs[:title],
    content: dream_attrs[:content],
    emotion_names: dream_attrs[:emotion_names],
    emotion_cache: emotion_cache
  )
end

child_dreams = [
  {
    title: '空飛ぶランドセル',
    content: 'カラフルなランドセルに乗って友だちと空を飛び回り、学校の上で手を振り合った夢。',
    emotion_names: ['楽しい', '嬉しい']
  },
  {
    title: '巨大なパンケーキの山',
    content: 'お皿より大きなパンケーキが山のように積み上がり、シロップをかけてみんなで食べる夢。甘い匂いがずっと続いていた。',
    emotion_names: ['楽しい', '不思議']
  },
  {
    title: '迷子の子ねこを助けた',
    content: '雨の中で震えていた子ねこを見つけて、家に連れて帰り一緒に暖かいミルクを飲んだ夢。',
    emotion_names: ['悲しい', '感動的']
  },
  {
    title: 'テスト前のドキドキ',
    content: '学校で大事なテストが始まる直前に、鉛筆を忘れてしまって教室中を走り回る夢。',
    emotion_names: ['不安', '怖い']
  }
]

child_dreams.each do |dream_attrs|
  ensure_dream(
    user: child_demo,
    title: dream_attrs[:title],
    content: dream_attrs[:content],
    emotion_names: dream_attrs[:emotion_names],
    emotion_cache: emotion_cache
  )
end

puts 'Seeding of emotions and demo users completed.'
