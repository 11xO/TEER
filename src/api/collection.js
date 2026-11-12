export function collectionPage(items, { page = 1, pageSize = 10, search = '', predicate, searchFields = ['type', 'details', 'to', 'trackingCode'] } = {}) {
  const query = search.trim().toLocaleLowerCase();
  const filtered = items.filter((item) => (!predicate || predicate(item)) && (!query || searchFields.some((key) => String(item[key] ?? '').toLocaleLowerCase().includes(query))));
  const size = Math.max(1, Math.min(100, Math.floor(Number(pageSize)) || 10));
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.max(1, Math.min(totalPages, Math.floor(Number(page)) || 1));
  return { items: filtered.slice((currentPage - 1) * size, currentPage * size), total: filtered.length, page: currentPage, pageSize: size, totalPages };
}
