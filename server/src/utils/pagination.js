import { z } from 'zod';
export function getPagination(query = {}) {
  const schema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  });
  const { page, limit } = schema.parse(query);
  return { page, limit, skip: (page - 1) * limit };
}
export async function paginate(Model, filter, query = {}, options = {}) {
  const { page, limit, skip } = getPagination(query);
  const allowed = options.sortFields || ['createdAt'];
  const rawSort = String(query.sort || options.sort || '-createdAt');
  const field = rawSort.replace(/^-/, '');
  const sort = {
    [allowed.includes(field) ? field : 'createdAt']: rawSort.startsWith('-') ? -1 : 1,
    _id: 1,
  };
  let find = Model.find(filter).sort(sort).skip(skip).limit(limit);
  if (options.populate) find = find.populate(options.populate);
  if (options.select) find = find.select(options.select);
  const [items, total] = await Promise.all([find.lean(), Model.countDocuments(filter)]);
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
}
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
