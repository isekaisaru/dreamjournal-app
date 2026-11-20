require "rails_helper"

# 音声の夢の題名：録音を受け取った時点の仮の題名（日本時間）と、書き起こしから作る題名
RSpec.describe Dream, type: :model do
  describe ".audio_placeholder_title" do
    it "日本時間の日時で仮の題名を作る" do
      expect(described_class.audio_placeholder_title(Time.utc(2026, 11, 16, 20, 49))).to eq("音声記録 2026/11/17 05:49")
    end
  end

  describe ".audio_placeholder_title?" do
    it "仮の題名の形だけを仮とみなす" do
      expect(described_class.audio_placeholder_title?("音声記録 2026/11/17 05:49")).to be(true)
      expect(described_class.audio_placeholder_title?("音声記録")).to be(false)
      expect(described_class.audio_placeholder_title?("音声記録 2026/11/17 05:49 の夢")).to be(false)
      expect(described_class.audio_placeholder_title?(nil)).to be(false)
    end
  end

  describe ".title_from_transcript" do
    it "最初の文を題名にし、末尾の句点を外す" do
      expect(described_class.title_from_transcript("宇宙人が来る夢を見ました。とても楽しかった。")).to eq("宇宙人が来る夢を見ました")
    end

    it "20文字を超えるときは20文字で切って … を付ける" do
      title = described_class.title_from_transcript("あいうえおかきくけこさしすせそたちつてとなにぬねの")
      expect(title).to eq("あいうえおかきくけこさしすせそたちつてと…")
    end

    it "前後の空白と空の行を飛ばす" do
      expect(described_class.title_from_transcript("  \n  そらをとぶ  \nつぎのぶん")).to eq("そらをとぶ")
    end

    it "中身が無ければ nil を返す" do
      expect(described_class.title_from_transcript("")).to be_nil
      expect(described_class.title_from_transcript("   。 ")).to be_nil
      expect(described_class.title_from_transcript(nil)).to be_nil
    end
  end
end
