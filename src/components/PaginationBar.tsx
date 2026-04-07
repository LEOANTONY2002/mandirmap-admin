export function PaginationBar({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="pagination-bar">
      <span>{total} total items</span>
      <div className="button-row">
        <button
          className="secondary-outline-button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="page-indicator">
          Page {page} / {Math.max(totalPages, 1)}
        </span>
        <button
          className="secondary-outline-button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
