const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  const pages = [];
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="btn btn-secondary" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
        Previous
      </button>

      <div className="pagination-pages">
        {currentPage > 2 ? (
          <>
            <button type="button" className="pagination-page" onClick={() => onPageChange(1)}>
              1
            </button>
            {currentPage > 3 ? <span className="pagination-ellipsis">...</span> : null}
          </>
        ) : null}

        {pages.map((page) => (
          <button
            key={page}
            type="button"
            className={`pagination-page ${page === currentPage ? 'pagination-page-active' : ''}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}

        {currentPage < totalPages - 1 ? (
          <>
            {currentPage < totalPages - 2 ? <span className="pagination-ellipsis">...</span> : null}
            <button type="button" className="pagination-page" onClick={() => onPageChange(totalPages)}>
              {totalPages}
            </button>
          </>
        ) : null}
      </div>

      <button type="button" className="btn btn-secondary" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
        Next
      </button>
    </nav>
  );
};

export default Pagination;
