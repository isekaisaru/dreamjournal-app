require 'rails_helper'

RSpec.describe Payment, type: :model do
  describe "validations" do
    it "is valid with valid attributes" do
      expect(build(:payment)).to be_valid
    end

    it "requires stripe_checkout_session_id" do
      payment = build(:payment, stripe_checkout_session_id: nil)
      expect(payment).not_to be_valid
      expect(payment.errors[:stripe_checkout_session_id]).to be_present
    end

    it "requires unique stripe_checkout_session_id" do
      create(:payment, stripe_checkout_session_id: "cs_test_unique")
      duplicate = build(:payment, stripe_checkout_session_id: "cs_test_unique")

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:stripe_checkout_session_id]).to be_present
    end

    it "allows stripe_payment_intent_id to be nil" do
      payment = build(:payment, stripe_payment_intent_id: nil)

      expect(payment).to be_valid
    end

    it "requires unique stripe_payment_intent_id when present" do
      create(:payment, stripe_payment_intent_id: "pi_test_unique")
      duplicate = build(:payment, stripe_payment_intent_id: "pi_test_unique")

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:stripe_payment_intent_id]).to be_present
    end

    it "requires amount" do
      payment = build(:payment, amount: nil)
      expect(payment).not_to be_valid
      expect(payment.errors[:amount]).to be_present
    end

    it "requires amount to be 0 or more" do
      payment = build(:payment, amount: -1)
      expect(payment).not_to be_valid
      expect(payment.errors[:amount]).to be_present
    end

    it "requires currency" do
      payment = build(:payment, currency: nil)
      expect(payment).not_to be_valid
      expect(payment.errors[:currency]).to be_present
    end

    it "requires currency to be 3 characters" do
      payment = build(:payment, currency: "jp")
      expect(payment).not_to be_valid
      expect(payment.errors[:currency]).to be_present
    end

    it "requires status" do
      payment = build(:payment, status: nil)
      expect(payment).not_to be_valid
      expect(payment.errors[:status]).to be_present
    end
  end

  describe "associations" do
    it { is_expected.to belong_to(:user) }
  end
end
