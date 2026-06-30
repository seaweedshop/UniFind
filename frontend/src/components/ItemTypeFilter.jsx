const itemTypes = [
  { value: 'lost', label: 'Lost' },
  { value: 'found', label: 'Found' },
  { value: 'sell', label: 'Sell' },
];

const ItemTypeFilter = ({ value, onChange }) => {
  return (
    <div className="filter-chip-group" role="tablist" aria-label="Item type filter">
      {itemTypes.map((itemType) => (
        <button
          key={itemType.value}
          type="button"
          role="tab"
          aria-selected={value === itemType.value}
          className={`filter-chip ${value === itemType.value ? 'filter-chip-active' : ''}`}
          onClick={() => onChange(itemType.value)}
        >
          {itemType.label}
        </button>
      ))}
    </div>
  );
};

export default ItemTypeFilter;
