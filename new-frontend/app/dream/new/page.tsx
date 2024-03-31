import React from 'react'

const DreamJournalPage= () => {
  return (
    <div className="min-h-screen py-8 px-4 md:px-12">
      <h2 className="text-2xl font-bold mb-4">今日の夢の記録</h2>
      <form className="bg-slate-200 p-6 rounded shadow-lg">
        <div className='mb-4'>
          <label className="text-gray-700 text-sm font-bold mb-2">夢のタイトル</label>
          <input
            type="text"
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight foucus:outline-none">
          </input>
        </div>
        <div className='mb-4'>
          <label className="text-gray-700 text-sm font-bold mb-2">夢の内容</label>
          <textarea
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight foucus:outline-none">
          </textarea>
        </div>
        <button type="submit" className="py-2 px-4 border rounded-md bg-purple-400">記録する</button>
      </form>
    </div>
  )
}

export default DreamJournalPage