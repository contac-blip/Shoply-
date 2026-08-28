import { normalizePagination, buildSearchFilter } from '../src_js/merchant/merchantQueryService.js';

describe('merchant query filters', () => {
  test('normalizes pagination limits and offsets', () => {
    expect(normalizePagination('2', '10')).toEqual({
      page: 2,
      limit: 10,
      offset: 10,
    });
  });

  test('builds a case-insensitive search filter for merchant tables', () => {
    const filter = buildSearchFilter('acme');
    expect(filter).toEqual(expect.arrayContaining([
      expect.any(String),
      expect.any(String),
    ]));
    expect(String(filter[0]).toLowerCase()).toContain('acme');
  });
});
