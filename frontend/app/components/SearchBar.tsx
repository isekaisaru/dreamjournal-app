import React, { useState } from "react";

type SearchBarProps = {
  onSearch: (query: string, startDate: string, endDate: string) => void;
};

const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim(), startDate.trim(), endDate.trim());
  };

  const handleReset = () => {
    setQuery("");
    setStartDate("");
    setEndDate("");
    onSearch("", "", "");
  };

  return (
    <form onSubmit={handleSearchSubmit} className="p-4 mb-6 bg-card border border-border rounded-lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
        <div className="sm:col-span-2 md:col-span-2">
          <label htmlFor="search-query" className="block text-sm font-medium text-card-foreground mb-1">キーワード</label>
          <input
            id="search-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="キーワード、感情タグなどで検索"
            className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="start-date" className="block text-sm font-medium text-card-foreground mb-1">開始日</label>
          <input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring"/>
        </div>
        <div>
          <label htmlFor="end-date" className="block text-sm font-medium text-card-foreground mb-1">終了日</label>
          <input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring"/>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={handleReset} className="bg-muted hover:bg-muted/80 text-muted-foreground p-2 rounded text-sm">リセット</button>
        <button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded text-sm">検索</button>
      </div>
    </form>
  );
};

export default SearchBar;
