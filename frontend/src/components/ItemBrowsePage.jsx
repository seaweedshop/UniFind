import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ITEM_CATEGORIES } from '../constants/itemCategories';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { fetchItems } from '../services/itemService';
import CategoryFilter from './CategoryFilter';
import EmptyState from './EmptyState';
import ItemCard from './ItemCard';
import ItemTypeFilter from './ItemTypeFilter';
import Loader from './Loader';
import Pagination from './Pagination';
import SearchBar from './SearchBar';
import SortDropdown from './SortDropdown';

const PAGE_SIZE = 12;

const routeByType = {
  lost: '/lost-items',
  found: '/found-items',
  sell: '/marketplace',
};

const defaultSortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

const marketplaceSortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price_low', label: 'Price: low to high' },
  { value: 'price_high', label: 'Price: high to low' },
];

const ItemBrowsePage = ({ title, description, defaultItemType, emptyTitle, emptyDescription }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 0 });

  const activeSearch = searchParams.get('search') || '';
  const activeCategory = searchParams.get('category') || '';
  const activeSort = searchParams.get('sort') || 'newest';
  const activePage = Number.parseInt(searchParams.get('page') || '1', 10) || 1;
  const debouncedSearch = useDebouncedValue(activeSearch, 300);
  const sortOptions = defaultItemType === 'sell' ? marketplaceSortOptions : defaultSortOptions;

  const updateSearchParams = (updater) => {
    const nextParams = new URLSearchParams(searchParams);
    updater(nextParams);
    setSearchParams(nextParams, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handleTypeChange = (nextType) => {
    if (nextType === defaultItemType) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('page');
    navigate({ pathname: routeByType[nextType], search: nextParams.toString() });
  };

  useEffect(() => {
    let cancelled = false;

    const loadItems = async () => {
      setLoading(true);
      setError('');

      try {
        // Each browse screen fetches only one paged slice, keeping the UI responsive for large data sets.
        const response = await fetchItems({
          item_type: defaultItemType,
          category: activeCategory || undefined,
          search: debouncedSearch || undefined,
          sort: activeSort,
          page: activePage,
          limit: PAGE_SIZE,
        });

        if (cancelled) return;

        setItems(response.items || []);
        setPagination({
          currentPage: response.currentPage || activePage,
          totalPages: response.totalPages || 0,
        });
      } catch (requestError) {
        if (cancelled) return;

        setItems([]);
        setPagination({ currentPage: 1, totalPages: 0 });
        setError(requestError?.response?.data?.message || 'We could not load listings right now.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadItems();

    return () => {
      cancelled = true;
    };
  }, [activeCategory, activePage, activeSort, debouncedSearch, defaultItemType]);

  useEffect(() => {
    if (pagination.currentPage !== activePage && pagination.totalPages > 0) {
      updateSearchParams((params) => {
        params.set('page', String(pagination.currentPage));
      });
    }
  }, [activePage, pagination.currentPage, pagination.totalPages]);

  const hasActiveFilters = useMemo(
    () => Boolean(activeSearch || activeCategory || activeSort !== 'newest' || activePage > 1),
    [activeSearch, activeCategory, activeSort, activePage]
  );

  const hasSearchFilters = Boolean(activeSearch || activeCategory || activeSort !== 'newest');

  return (
    <section className="page-card browse-page">
      <div className="section-header">
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>

      <div className="browse-toolbar">
        <SearchBar
          value={activeSearch}
          onChange={(value) => {
            updateSearchParams((params) => {
              if (value) {
                params.set('search', value);
              } else {
                params.delete('search');
              }
              params.delete('page');
            });
          }}
          placeholder={`Search ${title.toLowerCase()}...`}
        />

        <CategoryFilter
          value={activeCategory}
          onChange={(value) => {
            updateSearchParams((params) => {
              if (value) {
                params.set('category', value);
              } else {
                params.delete('category');
              }
              params.delete('page');
            });
          }}
          options={ITEM_CATEGORIES}
        />

        <div className="browse-row">
          <ItemTypeFilter value={defaultItemType} onChange={handleTypeChange} />
          <SortDropdown
            value={activeSort}
            onChange={(value) => {
              updateSearchParams((params) => {
                params.set('sort', value);
                params.delete('page');
              });
            }}
            options={sortOptions}
          />
        </div>
      </div>

      {loading ? <Loader label="Loading listings..." /> : null}
      {error ? <div className="form-alert">{error}</div> : null}

      {!loading && !error ? (
        items.length > 0 ? (
          <>
            <div className="items-grid">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} onView={() => navigate(`/items/${item.id}`)} />
              ))}
            </div>
            <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={(page) => updateSearchParams((params) => params.set('page', String(page)))} />
          </>
        ) : (
          <EmptyState
            title={hasSearchFilters ? 'No results match your search.' : emptyTitle}
            description={hasSearchFilters ? 'Try a different keyword, category, or sort option.' : emptyDescription}
            actionLabel={hasActiveFilters ? 'Clear filters' : ''}
            onAction={hasActiveFilters ? clearFilters : undefined}
          />
        )
      ) : null}
    </section>
  );
};

export default ItemBrowsePage;
