/**
 * Query parser for LiteDB.
 * Converts MongoDB-like query objects into parameterized SQLite WHERE clauses.
 */

const SYSTEM_COLUMNS = new Set(['id', 'created_at', 'updated_at']);

/**
 * Returns the column or JSON path expression for a given field name.
 * e.g., 'id' -> 'id'
 * e.g., 'user.profile.age' -> "json_extract(_data, '$.user.profile.age')"
 */
export function getFieldExpr(field) {
  if (SYSTEM_COLUMNS.has(field)) {
    return `"${field}"`;
  }
  // Sanitize field path to avoid JSON path injection
  const sanitized = field.replace(/'/g, "''");
  return `json_extract(_data, '$.${sanitized}')`;
}

/**
 * Parse a query filter into SQLite SQL condition and parameter array.
 * @param {object} filter - Query object (e.g. { age: { $gte: 18 }, role: 'admin' })
 * @returns {{ sql: string, params: any[] }}
 */
export function parseQuery(filter) {
  if (!filter || typeof filter !== 'object' || Object.keys(filter).length === 0) {
    return { sql: '1=1', params: [] };
  }

  const conditions = [];
  const params = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key === '$or') {
      if (!Array.isArray(value) || value.length === 0) continue;
      const subClauses = [];
      for (const subFilter of value) {
        const parsed = parseQuery(subFilter);
        if (parsed.sql && parsed.sql !== '1=1') {
          subClauses.push(`(${parsed.sql})`);
          params.push(...parsed.params);
        }
      }
      if (subClauses.length > 0) {
        conditions.push(`(${subClauses.join(' OR ')})`);
      }
      continue;
    }

    if (key === '$and') {
      if (!Array.isArray(value) || value.length === 0) continue;
      const subClauses = [];
      for (const subFilter of value) {
        const parsed = parseQuery(subFilter);
        if (parsed.sql && parsed.sql !== '1=1') {
          subClauses.push(`(${parsed.sql})`);
          params.push(...parsed.params);
        }
      }
      if (subClauses.length > 0) {
        conditions.push(`(${subClauses.join(' AND ')})`);
      }
      continue;
    }

    // Normal field condition
    const fieldExpr = getFieldExpr(key);

    if (value === null || value === undefined) {
      conditions.push(`${fieldExpr} IS NULL`);
    } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Operator object e.g. { $gt: 10, $lt: 20 }
      const opEntries = Object.entries(value);
      for (const [op, opVal] of opEntries) {
        const opResult = parseOperator(fieldExpr, op, opVal);
        conditions.push(opResult.sql);
        params.push(...opResult.params);
      }
    } else {
      // Direct equality
      conditions.push(`${fieldExpr} = ?`);
      params.push(normalizeParam(value));
    }
  }

  return {
    sql: conditions.length > 0 ? conditions.join(' AND ') : '1=1',
    params
  };
}

/**
 * Handle specific query operators
 */
function parseOperator(fieldExpr, operator, value) {
  switch (operator) {
    case '$eq':
      if (value === null) return { sql: `${fieldExpr} IS NULL`, params: [] };
      return { sql: `${fieldExpr} = ?`, params: [normalizeParam(value)] };

    case '$ne':
      if (value === null) return { sql: `${fieldExpr} IS NOT NULL`, params: [] };
      return { sql: `${fieldExpr} != ?`, params: [normalizeParam(value)] };

    case '$gt':
      return { sql: `${fieldExpr} > ?`, params: [normalizeParam(value)] };

    case '$gte':
      return { sql: `${fieldExpr} >= ?`, params: [normalizeParam(value)] };

    case '$lt':
      return { sql: `${fieldExpr} < ?`, params: [normalizeParam(value)] };

    case '$lte':
      return { sql: `${fieldExpr} <= ?`, params: [normalizeParam(value)] };

    case '$in':
      if (!Array.isArray(value) || value.length === 0) {
        return { sql: '0=1', params: [] }; // False condition
      }
      return {
        sql: `${fieldExpr} IN (${value.map(() => '?').join(', ')})`,
        params: value.map(normalizeParam)
      };

    case '$nin':
      if (!Array.isArray(value) || value.length === 0) {
        return { sql: '1=1', params: [] };
      }
      return {
        sql: `${fieldExpr} NOT IN (${value.map(() => '?').join(', ')})`,
        params: value.map(normalizeParam)
      };

    case '$like':
      return { sql: `${fieldExpr} LIKE ?`, params: [String(value)] };

    case '$ilike':
      return { sql: `LOWER(${fieldExpr}) LIKE LOWER(?)`, params: [String(value)] };

    case '$contains':
      // Substring match or JSON array contains
      return { sql: `${fieldExpr} LIKE ?`, params: [`%${value}%`] };

    case '$startsWith':
      return { sql: `${fieldExpr} LIKE ?`, params: [`${value}%`] };

    case '$endsWith':
      return { sql: `${fieldExpr} LIKE ?`, params: [`%${value}`] };

    case '$between':
      if (Array.isArray(value) && value.length === 2) {
        return {
          sql: `${fieldExpr} BETWEEN ? AND ?`,
          params: [normalizeParam(value[0]), normalizeParam(value[1])]
        };
      }
      throw new Error('$between requires an array of 2 values: [min, max]');

    case '$exists':
      return {
        sql: value ? `${fieldExpr} IS NOT NULL` : `${fieldExpr} IS NULL`,
        params: []
      };

    default:
      throw new Error(`Unsupported query operator: ${operator}`);
  }
}

function normalizeParam(val) {
  if (val instanceof Date) {
    return val.toISOString();
  }
  if (typeof val === 'boolean') {
    return val ? 1 : 0;
  }
  return val;
}

/**
 * Parse sort options (e.g. { id: 1 }, { createdAt: -1, priority: 1 } or ['-createdAt', 'priority'])
 */
export function parseSort(sort) {
  if (!sort) return '';

  const sortParts = [];

  const getSortExpr = (field) => {
    if (field === 'id') {
      return 'CAST("id" AS INTEGER)';
    }
    return getFieldExpr(field);
  };

  if (typeof sort === 'object' && !Array.isArray(sort)) {
    for (const [key, dir] of Object.entries(sort)) {
      const fieldExpr = getSortExpr(key);
      const direction = (dir === -1 || String(dir).toLowerCase() === 'desc') ? 'DESC' : 'ASC';
      sortParts.push(`${fieldExpr} ${direction}`);
    }
  } else if (Array.isArray(sort)) {
    for (const item of sort) {
      if (typeof item === 'string') {
        const isDesc = item.startsWith('-');
        const cleanField = isDesc ? item.slice(1) : item;
        const fieldExpr = getSortExpr(cleanField);
        sortParts.push(`${fieldExpr} ${isDesc ? 'DESC' : 'ASC'}`);
      }
    }
  } else if (typeof sort === 'string') {
    const isDesc = sort.startsWith('-');
    const cleanField = isDesc ? sort.slice(1) : sort;
    const fieldExpr = getSortExpr(cleanField);
    sortParts.push(`${fieldExpr} ${isDesc ? 'DESC' : 'ASC'}`);
  }

  return sortParts.length > 0 ? `ORDER BY ${sortParts.join(', ')}` : '';
}
