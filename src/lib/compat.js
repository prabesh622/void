/**
 * SQLite compatibility layer — Mongoose-like API on top of better-sqlite3.
 * Every table stores flexible fields as a JSON string in the "data" column,
 * with dedicated columns (guildId, userId, …) for indexed lookups.
 */
const { db } = require('./database');

/* ── helpers ────────────────────────────────────────────────────────── */

/** Columns that are real table columns (not stored inside the JSON blob). */
const DEDICATED_COLS = new Set(['id', 'guildId', 'userId', 'channelId',
  'messageId', 'hostId', 'prize', 'ticketId', 'trigger', 'type',
  'moderatorId', 'guild_id']);

/** Parse the JSON data column, merge with dedicated columns, attach save(). */
function hydrate(row, table) {
  if (!row) return null;
  let extra = {};
  try { extra = JSON.parse(row.data || '{}'); } catch { /* ignore */ }
  const obj = { ...extra };
  // Copy dedicated columns onto the object
  for (const col of DEDICATED_COLS) {
    if (row[col] !== undefined) obj[col] = row[col];
  }
  return attachSave(obj, table);
}

/** Attach a .save() method that persists back to SQLite. */
function attachSave(obj, table) {
  obj.save = async function () {
    const { save: _, ...fields } = this;
    const dedicated = {};
    const jsonData = {};
    for (const [k, v] of Object.entries(fields)) {
      if (DEDICATED_COLS.has(k)) dedicated[k] = v;
      else jsonData[k] = v;
    }
    dedicated.data = JSON.stringify(jsonData);
    const sets = Object.keys(dedicated).filter(k => k !== 'id')
      .map(k => `${k} = ?`).join(', ');
    const vals = Object.keys(dedicated).filter(k => k !== 'id')
      .map(k => dedicated[k]);
    db.prepare(`UPDATE ${table} SET ${sets} WHERE id = ?`).run(...vals, this.id);
    return this;
  };
  return obj;
}

/**
 * Translate a MongoDB-style filter into SQL WHERE + params.
 * Supports: exact match, $in, $lte, $gte, $lt, $gt, $ne
 */
function buildWhere(filter) {
  const clauses = [];
  const params = [];

  for (const [key, value] of Object.entries(filter)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Operators
      for (const [op, val] of Object.entries(value)) {
        if (op === '$in') {
          const placeholders = val.map(() => '?').join(',');
          // $in could be on a dedicated column or inside data JSON
          if (DEDICATED_COLS.has(key)) {
            clauses.push(`"${key}" IN (${placeholders})`);
            params.push(...val);
          } else {
            clauses.push(`json_extract(data, '$.${key}') IN (${placeholders})`);
            params.push(...val);
          }
        } else if (op === '$lte' || op === '$gte' || op === '$lt' || op === '$gt' || op === '$ne') {
          const sqlOp = { $lte: '<=', $gte: '>=', $lt: '<', $gt: '>', $ne: '!=' }[op];
          if (DEDICATED_COLS.has(key)) {
            clauses.push(`"${key}" ${sqlOp} ?`);
          } else {
            clauses.push(`json_extract(data, '$.${key}') ${sqlOp} ?`);
          }
          params.push(val);
        }
      }
    } else {
      // Exact match
      if (DEDICATED_COLS.has(key)) {
        clauses.push(`"${key}" = ?`);
      } else {
        clauses.push(`json_extract(data, '$.${key}') = ?`);
      }
      params.push(value);
    }
  }

  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

/* ── public API ─────────────────────────────────────────────────────── */

/**
 * Create a Mongoose-compatible wrapper for a table.
 * @param {string} table  – SQLite table name
 * @param {string} _pk    – ignored (always 'id')
 * @param {object} defaults – default field values for create()
 */
function createTableWrapper(table, _pk = 'id', defaults = {}) {
  return {
    /** Find one row. Returns hydrated object with .save() or null. */
    async findOne(filter) {
      const { where, params } = buildWhere(filter);
      const row = db.prepare(`SELECT * FROM ${table} ${where} LIMIT 1`).get(...params);
      return hydrate(row, table);
    },

    /** Find rows. Returns a thenable chain with .sort() and .limit(). */
    find(filter = {}) {
      let sortField = null, sortAsc = true, limitN = null;

      const chain = {
        sort(field, order) {
          if (typeof field === 'object') {
            sortField = Object.keys(field)[0];
            sortAsc = field[sortField] === 1;
          } else {
            sortField = field;
            sortAsc = (order || 1) === 1;
          }
          return chain;
        },
        limit(n) { limitN = n; return chain; },
        then(resolve, reject) {
          (async () => {
            const { where, params } = buildWhere(filter);
            let sql = `SELECT * FROM ${table} ${where}`;
            if (sortField) {
              const col = DEDICATED_COLS.has(sortField) ? `"${sortField}"` : `json_extract(data, '$.${sortField}')`;
              sql += ` ORDER BY ${col} ${sortAsc ? 'ASC' : 'DESC'}`;
            }
            if (limitN) sql += ` LIMIT ${limitN}`;
            const rows = db.prepare(sql).all(...params);
            return rows.map(r => hydrate(r, table));
          })().then(resolve, reject);
        },
      };
      return chain;
    },

    /** Insert a new row. */
    async create(inputData) {
      const dedicated = {};
      const jsonData = {};
      const merged = { ...defaults, ...inputData };

      for (const [k, v] of Object.entries(merged)) {
        if (DEDICATED_COLS.has(k)) dedicated[k] = v;
        else jsonData[k] = v;
      }
      dedicated.data = JSON.stringify(jsonData);

      const cols = Object.keys(dedicated);
      const placeholders = cols.map(() => '?').join(',');
      const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`);
      const result = stmt.run(...cols.map(c => dedicated[c]));

      // Return the newly inserted row (hydrated)
      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(result.lastInsertRowid);
      return hydrate(row, table);
    },

    /** Update rows matching filter. */
    async updateOne(filter, updates) {
      return _updateRows(table, filter, updates);
    },

    /** Find one and update (with optional upsert). */
    async findOneAndUpdate(filter, updates, opts = {}) {
      if (opts.upsert) {
        const existing = await this.findOne(filter);
        if (!existing) {
          const flat = { ...filter };
          if (updates.$set) Object.assign(flat, updates.$set);
          if (updates.$inc) {
            for (const [k, v] of Object.entries(updates.$inc)) flat[k] = (flat[k] || 0) + v;
          }
          return await this.create(flat);
        }
      }
      await _updateRows(table, filter, updates);
      return await this.findOne(filter);
    },

    /** Delete one row matching filter. */
    async findOneAndDelete(filter) {
      const { where, params } = buildWhere(filter);
      db.prepare(`DELETE FROM ${table} ${where} LIMIT 1`.replace(' LIMIT 1', '')).run(...params);
      return true;
    },

    /** Delete by primary key. */
    async findByIdAndDelete(id) {
      db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
      return true;
    },

    /** Delete all rows matching filter. */
    async deleteOne(filter) {
      const { where, params } = buildWhere(filter);
      db.prepare(`DELETE FROM ${table} ${where}`).run(...params);
      return true;
    },
  };
}

/** Internal: apply MongoDB-style update operators and persist. */
function _updateRows(table, filter, updates) {
  const { where, params } = buildWhere(filter);
  const rows = db.prepare(`SELECT * FROM ${table} ${where}`).all(...params);
  if (rows.length === 0) return;

  for (const row of rows) {
    const hydrated = hydrate(row, table);
    const allFields = { ...hydrated };
    delete allFields.save;

    // Apply $inc
    if (updates.$inc) {
      for (const [field, amount] of Object.entries(updates.$inc)) {
        allFields[field] = (allFields[field] || 0) + amount;
      }
    }
    // Apply $set
    if (updates.$set) {
      for (const [field, value] of Object.entries(updates.$set)) {
        _setNested(allFields, field, value);
      }
    }
    // Apply $push
    if (updates.$push) {
      for (const [field, value] of Object.entries(updates.$push)) {
        const arr = _getNested(allFields, field) || [];
        if (Array.isArray(arr)) arr.push(value);
        _setNested(allFields, field, arr);
      }
    }
    // Apply $pull
    if (updates.$pull) {
      for (const [field, value] of Object.entries(updates.$pull)) {
        const arr = _getNested(allFields, field) || [];
        if (Array.isArray(arr)) {
          _setNested(allFields, field, arr.filter(v => v !== value));
        }
      }
    }
    // Apply plain (non-operator) keys
    for (const [key, value] of Object.entries(updates)) {
      if (!key.startsWith('$')) {
        if (key.includes('.')) _setNested(allFields, key, value);
        else allFields[key] = value;
      }
    }

    // Persist
    const dedicated = {};
    const jsonData = {};
    for (const [k, v] of Object.entries(allFields)) {
      if (k === 'id') continue;
      if (DEDICATED_COLS.has(k)) dedicated[k] = v;
      else jsonData[k] = v;
    }
    dedicated.data = JSON.stringify(jsonData);
    const sets = Object.keys(dedicated).map(k => `${k} = ?`).join(', ');
    const vals = Object.values(dedicated);
    db.prepare(`UPDATE ${table} SET ${sets} WHERE id = ?`).run(...vals, row.id);
  }
}

function _getNested(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function _setNested(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

module.exports = { createTableWrapper };
