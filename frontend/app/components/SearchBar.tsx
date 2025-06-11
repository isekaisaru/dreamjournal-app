import React, { useState, useEffect } from "react";

type SearchBarProps = {
  onSearch: (query: string, startDate: string, endDate: string) => void;
};

const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (query.trim() || startDate.trim() || endDate.trim()) {
      onSearch(query.trim(), startDate.trim(), endDate.trim());
    }
  }, [query, startDate, endDate, onSearch]); // 修正: 依存配列を追加

  return (
    <div className="mb-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="夢を検索..."
        className="border border-input bg-background text-foreground p-2 rounded mr-2 focus:ring-2 focus:ring-ring focus:border-ring"
      />
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="border border-input bg-background text-foreground p-2 rounded mr-2 focus:ring-2 focus:ring-ring focus:border-ring"
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="border border-input bg-background text-foreground p-2 rounded mr-2 focus:ring-2 focus:ring-ring focus:border-ring"
      />
      <button className="bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded">検索</button>
    </div>
  );
};

export default SearchBar;
