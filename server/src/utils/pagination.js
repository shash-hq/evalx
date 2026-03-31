export const MAX_PAGE_SIZE = 50;

export const parsePagination = (page, limit, defaultLimit = 20) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(limit) || defaultLimit)
  );

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};
