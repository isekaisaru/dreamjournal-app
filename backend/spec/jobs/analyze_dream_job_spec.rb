require "rails_helper"

# Issue #561 PR③: 分析ジョブが、OpenAI を待つ間の利用者の編集を上書きしないこと。
# retry_on を通さず perform を直接呼び、例外が外へ出ないこと（= リトライによる再課金がないこと）も確かめる。
RSpec.describe AnalyzeDreamJob, type: :job do
  let(:user) { create(:user) }

  describe "テキストの夢" do
    let!(:dream) do
      create(:dream, user: user, title: "わたしがつけたタイトル", content: "そらをとぶゆめをみた。とてもたのしかった。")
    end
    let(:analysis) { { analysis: "そらをとぶ夢は自由の象徴です。", emotion_tags: ["たのしい"] } }

    it "タイトルと本文を書き換えず、分析結果だけを保存する" do
      allow(DreamAnalysisService).to receive(:analyze).and_return(analysis)

      described_class.new.perform(dream.id)

      dream.reload
      expect(dream.title).to eq("わたしがつけたタイトル")
      expect(dream.content).to eq("そらをとぶゆめをみた。とてもたのしかった。")
      expect(dream.analysis_status).to eq("done")
      expect(dream.analysis_json).to include("analysis" => "そらをとぶ夢は自由の象徴です。")
      expect(dream.analyzed_at).to be_present
      expect(dream.edit_version).to eq(0)
    end

    it "分析を待つ間に利用者が保存したタイトルと本文を残す" do
      allow(DreamAnalysisService).to receive(:analyze) do
        Dream.where(id: dream.id).update_all(title: "あとで直したタイトル", content: "あとで直した本文", edit_version: 1)
        analysis
      end

      described_class.new.perform(dream.id)

      dream.reload
      expect(dream.title).to eq("あとで直したタイトル")
      expect(dream.content).to eq("あとで直した本文")
      expect(dream.edit_version).to eq(1)
      expect(dream.analysis_status).to eq("done")
    end

    it "分析がエラーを返したら失敗として記録し、タイトルと本文は変えない" do
      allow(DreamAnalysisService).to receive(:analyze).and_return({ error: "分析できませんでした" })

      described_class.new.perform(dream.id)

      dream.reload
      expect(dream.analysis_status).to eq("failed")
      expect(dream.title).to eq("わたしがつけたタイトル")
      expect(dream.content).to eq("そらをとぶゆめをみた。とてもたのしかった。")
    end
  end

  describe "音声の夢" do
    let!(:dream) do
      create(:dream, user: user, title: "音声記録 2026/11/12 10:00", content: "音声解析中...", analysis_status: "pending").tap do |d|
        d.audio.attach(io: StringIO.new("fake audio"), filename: "dream.webm", content_type: "audio/webm")
      end
    end
    let(:service) { instance_double(AudioAnalysisService) }
    let(:result) do
      { transcript: "うみのそこをあるくゆめをみました", analysis: "海の底は心の奥を表します。", emotion_tags: ["ふしぎ"] }
    end

    before { allow(AudioAnalysisService).to receive(:new).and_return(service) }

    it "本文が仮文のままなら書き起こしを本文に入れ、編集の版を1つ進める。タイトルは変えない" do
      allow(service).to receive(:call).and_return(result)

      described_class.new.perform(dream.id)

      dream.reload
      expect(dream.content).to eq("うみのそこをあるくゆめをみました")
      expect(dream.title).to eq("音声記録 2026/11/12 10:00")
      expect(dream.edit_version).to eq(1)
      expect(dream.analysis_status).to eq("done")
      expect(dream.analysis_json).to include("analysis" => "海の底は心の奥を表します。")
    end

    it "書き起こしを待つ間に利用者が本文を直していたら、その本文を残して分析結果だけ保存する" do
      allow(service).to receive(:call) do
        Dream.where(id: dream.id).update_all(title: "手で直したタイトル", content: "手で直した本文", edit_version: 1)
        result
      end

      described_class.new.perform(dream.id)

      dream.reload
      expect(dream.content).to eq("手で直した本文")
      expect(dream.title).to eq("手で直したタイトル")
      expect(dream.edit_version).to eq(1)
      expect(dream.analysis_status).to eq("done")
      expect(dream.analysis_json).to include("transcript" => "うみのそこをあるくゆめをみました")
    end

    it "書き起こしが空なら失敗として記録し、例外を外へ出さない（リトライで再課金しない）" do
      allow(service).to receive(:call).and_return(result.merge(transcript: ""))

      expect { described_class.new.perform(dream.id) }.not_to raise_error

      expect(service).to have_received(:call).once
      dream.reload
      expect(dream.analysis_status).to eq("failed")
      expect(dream.content).to eq("音声解析中...")
      expect(dream.edit_version).to eq(0)
    end

    it "書き起こしを待つ間に夢が削除されても、例外を外へ出さない" do
      allow(service).to receive(:call) do
        Dream.find(dream.id).destroy!
        result
      end

      expect { described_class.new.perform(dream.id) }.not_to raise_error
      expect(Dream.exists?(dream.id)).to be(false)
    end
  end
end
