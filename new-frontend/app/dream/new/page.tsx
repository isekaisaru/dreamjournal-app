import React from 'react'

const DreamJournalPage= () => {
  return (
    <div>
      <h2>今日の夢の記録</h2>
      <form>
        <div>
          <label>夢のタイトル</label>
          <input
            type="text"
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight foucus:outline-none">
          </input>
        </div>
      </form>
    </div>
  )
}

export default DreamJournalPage