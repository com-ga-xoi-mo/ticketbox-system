import React, { useState, useEffect } from 'react';
import { Input } from 'antd';
import { useSearchParams } from 'react-router-dom';

const { Search } = Input;

export default function ArtistSearchBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  const handleSearch = (val: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      newParams.set('q', val.trim());
    } else {
      newParams.delete('q');
    }
    newParams.delete('page'); // reset to page 1
    setSearchParams(newParams);
  };

  return (
    <Search
      placeholder="Search artists..."
      allowClear
      enterButton
      size="large"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onSearch={handleSearch}
      className="max-w-md"
    />
  );
}
