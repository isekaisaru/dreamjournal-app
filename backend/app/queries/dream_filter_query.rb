class DreamFilterQuery
  def initialize(initial_scope = Dream.all, params = {})
    @scope = initial_scope
    @params = params
  end

  def call
    filter_by_query
    filter_by_date_range
    filter_by_emotions
    @scope
  end

  private

  def filter_by_query
    if @params[:query].present?
      @scope = @scope.where("title ILIKE :query OR content ILIKE :query", query: "%#{@params[:query]}%")
    end
  end

  def filter_by_date_range
    if @params[:start_date].present?
      @scope = @scope.where("created_at >= ?", @params[:start_date])
    end
    if @params[:end_date].present?
      @scope = @scope.where("created_at <= ?", Date.parse(@params[:end_date]).end_of_day)
    end
  end

  def filter_by_emotions
    if @params[:emotion_ids].present?
      @scope = @scope.joins(:emotions).where(emotions: { id: @params[:emotion_ids] }).distinct
    end
  end
end
