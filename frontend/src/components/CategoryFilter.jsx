const CategoryFilter = ({ value, onChange, options = [] }) => {
  return (
    <div className="filter-chip-group" role="listbox" aria-label="Category filter">
      <button type="button" className={`filter-chip ${value === '' ? 'filter-chip-active' : ''}`} onClick={() => onChange('')}>
        All categories
      </button>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`filter-chip ${value === option ? 'filter-chip-active' : ''}`}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
