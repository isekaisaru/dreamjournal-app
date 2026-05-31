require "rails_helper"

RSpec.describe DreamProfile, type: :model do
  let(:user) { create(:user) }

  # ------------------------------------------------------------------ #
  # アソシエーション                                                      #
  # ------------------------------------------------------------------ #
  describe "アソシエーション" do
    it { should belong_to(:user) }
  end

  # ------------------------------------------------------------------ #
  # 基本バリデーション                                                    #
  # ------------------------------------------------------------------ #
  describe "基本バリデーション" do
    subject { build(:dream_profile, user: user) }

    it { should validate_presence_of(:name) }
    it { should validate_length_of(:name).is_at_most(30) }
    it { should validate_presence_of(:avatar_emoji) }
    it { should validate_presence_of(:color) }
    it { should validate_inclusion_of(:relationship).in_array(DreamProfile::RELATIONSHIPS) }
  end

  # ------------------------------------------------------------------ #
  # color フォーマット                                                    #
  # ------------------------------------------------------------------ #
  describe "color のフォーマットバリデーション" do
    it "小文字 hex は有効" do
      expect(build(:dream_profile, user: user, color: "#a1b2c3")).to be_valid
    end

    it "大文字 hex は有効" do
      expect(build(:dream_profile, user: user, color: "#A1B2C3")).to be_valid
    end

    it "# なし文字列は無効" do
      profile = build(:dream_profile, user: user, color: "a1b2c3")
      expect(profile).not_to be_valid
      expect(profile.errors[:color]).to be_present
    end

    it "3桁 hex は無効" do
      profile = build(:dream_profile, user: user, color: "#abc")
      expect(profile).not_to be_valid
      expect(profile.errors[:color]).to be_present
    end

    it "不正な文字を含む場合は無効" do
      profile = build(:dream_profile, user: user, color: "#zzzzzz")
      expect(profile).not_to be_valid
      expect(profile.errors[:color]).to be_present
    end
  end

  # ------------------------------------------------------------------ #
  # active プロフィール上限（MAX_ACTIVE_COUNT = 5）                      #
  # ------------------------------------------------------------------ #
  describe "active プロフィールの上限チェック" do
    context "active が 4 件のとき" do
      before { create_list(:dream_profile, 4, user: user) }

      it "5件目の作成は valid" do
        expect(build(:dream_profile, user: user)).to be_valid
      end
    end

    context "active が 5 件のとき" do
      before { create_list(:dream_profile, 5, user: user) }

      it "6件目の作成は invalid" do
        profile = build(:dream_profile, user: user)
        expect(profile).not_to be_valid
        expect(profile.errors[:base]).to include("アクティブなプロフィールは5件までです")
      end

      it "archived プロフィールの復元（active: true への変更）も invalid" do
        archived = create(:dream_profile, :archived, user: user)
        archived.active = true
        expect(archived).not_to be_valid
        expect(archived.errors[:base]).to include("アクティブなプロフィールは5件までです")
      end
    end

    context "archived プロフィールは上限にカウントしない" do
      before do
        create_list(:dream_profile, 5, user: user)
        # archived は active カウントに含まれないため作成できる
      end

      it "active が 5 件あっても archived は作成できる" do
        expect(build(:dream_profile, :archived, user: user)).to be_valid
      end
    end

    context "既存 active プロフィールの name 更新は上限に影響しない" do
      before { create_list(:dream_profile, 5, user: user) }

      it "active のまま name を変えても valid" do
        profile = DreamProfile.where(user: user, active: true).first
        profile.name = "新しい名前"
        expect(profile).to be_valid
      end
    end
  end

  # ------------------------------------------------------------------ #
  # 「自分」プロフィールのアーカイブ禁止                                 #
  # ------------------------------------------------------------------ #
  describe "self プロフィールのアーカイブ禁止" do
    let!(:self_profile) { create(:dream_profile, :self_profile, user: user) }

    it "self プロフィールを active: false にすると invalid" do
      self_profile.active = false
      expect(self_profile).not_to be_valid
      expect(self_profile.errors[:base]).to include("「自分」プロフィールはアーカイブできません")
    end

    it "self 以外のプロフィールは active: false にできる" do
      other = create(:dream_profile, user: user)
      other.active = false
      expect(other).to be_valid
    end
  end

  # ------------------------------------------------------------------ #
  # 「自分」プロフィールの一意性（1 ユーザー 1 件）                      #
  # ------------------------------------------------------------------ #
  describe "self プロフィールの一意性" do
    let!(:self_profile) { create(:dream_profile, :self_profile, user: user) }

    it "同一ユーザーに 2件目の self プロフィールは invalid" do
      dup = build(:dream_profile, :self_profile, user: user)
      expect(dup).not_to be_valid
      expect(dup.errors[:relationship]).to include("「自分」プロフィールはアカウントごとに1件のみ登録できます")
    end

    it "別ユーザーなら self プロフィールを作れる" do
      other_user = create(:user)
      expect(build(:dream_profile, :self_profile, user: other_user)).to be_valid
    end

    it "自分自身の更新（name 変更など）では一意性エラーにならない" do
      self_profile.name = "私"
      expect(self_profile).to be_valid
    end
  end
end
