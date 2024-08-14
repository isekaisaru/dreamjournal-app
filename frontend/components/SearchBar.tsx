import React, { useState } from 'react';

type SearchBarProps = {
  onSearch: (query: string, startDate: string, endDate: string) => void;
};

const SearchBar = ({ onSearch}: SearchBarProps) => {

  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSearch = () => {
    onSearch(query, startDate, endDate);
  };

  return (

    <div className="mb-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="検索"
        className="border p-2 rounded mr-2 text-gray-700"
        />
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="border p-2 rounded mr-2 text-gray-700"
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        placeholder="検索"
        className="border p-2 rounded mr-2 text-gray-700"
      />
      <button onClick={handleSearch} className="bg-blue-500 text-white p-2 rounded">
        検索
      </button>
    </div>
  );
};

export default SearchBar;