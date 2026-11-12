import { Icon } from '../components/ui.jsx';
export function CollectionSearch({ search, onSearch, status, onStatus, statuses = [] }) {
  return <div className="collection-controls"><div className="market-search-box"><input type="search" aria-label="البحث في الطلبات" placeholder="ابحث في طلباتك..." value={search} onChange={(event) => onSearch(event.target.value)} /><Icon name="fa-search" /></div>
    {statuses.length > 0 && <select aria-label="تصفية حسب الحالة" value={status} onChange={(event) => onStatus(event.target.value)}><option value="all">كل الحالات</option>{statuses.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>}
  </div>;
}
export function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return <nav className="pagination" aria-label="صفحات النتائج"><button type="button" className="addr-picker-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>السابق</button><span aria-live="polite">{page} / {totalPages}</span><button type="button" className="addr-picker-btn" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>التالي</button></nav>;
}
