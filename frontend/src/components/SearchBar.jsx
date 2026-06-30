const SearchBar = ({ value, onChange, placeholder = 'Search...' }) => {
  return (
    <input
      className="search-input search-input-inline"
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
    />
  );
};

export default SearchBar;
