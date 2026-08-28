export function normalizePagination(pageValue, limitValue) {
  const page = Math.max(1, Number.parseInt(pageValue ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(limitValue ?? '20', 10) || 20));

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

export function buildSearchFilter(searchTerm) {
  const value = String(searchTerm ?? '').trim();
  if (!value) {
    return [];
  }

  const normalized = value.toLowerCase();
  return [
    `LOWER(CAST(name AS TEXT)) LIKE '%${normalized}%'`,
    `LOWER(CAST(email AS TEXT)) LIKE '%${normalized}%'`,
  ];
}
