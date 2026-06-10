/**
 * Supabase compatibility layer for Mongoose-like API.
 * Provides findOne, find, create, updateOne, findOneAndUpdate,
 * findOneAndDelete, findByIdAndDelete, and doc.save() patterns.
 */
const { supabase } = require('./supabase');

/** Apply MongoDB-style query operators ($in, $lte, $gte, $lt, $gt) to a Supabase query */
function applyFilters(query, filter) {
  for (const [key, value] of Object.entries(filter)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      if ('$in' in value) query = query.in(key, value.$in);
      else if ('$lte' in value) query = query.lte(key, value.$lte);
      else if ('$gte' in value) query = query.gte(key, value.$gte);
      else if ('$lt' in value) query = query.lt(key, value.$lt);
      else if ('$gt' in value) query = query.gt(key, value.$gt);
      else if ('$ne' in value) query = query.neq(key, value.$ne);
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

/** Attach a .save() method to a row object that does an UPDATE by pk */
function attachSave(row, table, pkColumn) {
  row.save = async function () {
    const { data, error } = await supabase
      .from(table)
      .update(this)
      .eq(pkColumn, this[pkColumn])
      .select()
      .single();
    if (error) throw error;
    Object.assign(this, data);
    attachSave(this, table, pkColumn);
    return this;
  };
  return row;
}

/**
 * Create a Mongoose-compatible wrapper for a flat Supabase table.
 * @param {string} table - Supabase table name
 * @param {string} pkColumn - Primary key column (default 'id')
 * @param {object} defaults - Default field values for create()
 */
function createTableWrapper(table, pkColumn = 'id', defaults = {}) {
  return {
    /** Find one row matching filter. Returns object with .save() or null */
    async findOne(filter) {
      let q = supabase.from(table).select();
      q = applyFilters(q, filter);
      const { data, error } = await q.single();
      if (error || !data) return null;
      return attachSave(data, table, pkColumn);
    },

    /** Find all rows matching filter. Supports .sort() and .limit() chaining */
    find(filter = {}) {
      const self = this;
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
            let q = supabase.from(table).select();
            q = applyFilters(q, filter);
            if (sortField) q = q.order(sortField, { ascending: sortAsc });
            if (limitN) q = q.limit(limitN);
            const { data, error } = await q;
            if (error) throw error;
            return (data || []).map(row => attachSave(row, table, pkColumn));
          })().then(resolve, reject);
        },
      };
      return chain;
    },

    /** Create a new row with defaults merged with provided data */
    async create(inputData) {
      const row = { ...defaults, ...inputData };
      const { data, error } = await supabase
        .from(table)
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return attachSave(data, table, pkColumn);
    },

    /** Update rows matching filter. Supports $inc, $push, $pull, $set, dot-notation */
    async updateOne(filter, updates) {
      return await _updateRows(table, pkColumn, filter, updates, false);
    },

    /** Find one and update, with upsert support */
    async findOneAndUpdate(filter, updates, opts = {}) {
      if (opts.upsert) {
        const existing = await this.findOne(filter);
        if (!existing) {
          const created = await this.create({ ...filter, ..._flattenUpdates(updates) });
          return created;
        }
      }
      await _updateRows(table, pkColumn, filter, updates, false);
      return await this.findOne(filter);
    },

    /** Find one and delete */
    async findOneAndDelete(filter) {
      let q = supabase.from(table).delete();
      q = applyFilters(q, filter);
      const { error } = await q;
      if (error) throw error;
      return true;
    },

    /** Delete by primary key */
    async findByIdAndDelete(id) {
      const { error } = await supabase.from(table).delete().eq(pkColumn, id);
      if (error) throw error;
      return true;
    },

    /** Delete rows matching filter */
    async deleteOne(filter) {
      let q = supabase.from(table).delete();
      q = applyFilters(q, filter);
      const { error } = await q;
      if (error) throw error;
      return true;
    },
  };
}

/** Flatten MongoDB update operators into plain object */
function _flattenUpdates(updates) {
  const flat = {};
  for (const [key, value] of Object.entries(updates)) {
    if (key === '$inc' || key === '$set' || key === '$push' || key === '$pull') continue;
    flat[key] = value;
  }
  if (updates.$set) Object.assign(flat, updates.$set);
  return flat;
}

/** Internal: update rows with MongoDB-style operators */
async function _updateRows(table, pkColumn, filter, updates, isMany) {
  // Fetch matching rows first (needed for $inc, $push, $pull)
  let q = supabase.from(table).select();
  q = applyFilters(q, filter);
  const { data: rows, error: fetchErr } = await q;
  if (fetchErr || !rows || rows.length === 0) return;

  const targets = isMany ? rows : [rows[0]];

  for (const row of targets) {
    const changes = {};

    // Handle $inc
    if (updates.$inc) {
      for (const [field, amount] of Object.entries(updates.$inc)) {
        changes[field] = (row[field] || 0) + amount;
      }
    }

    // Handle $set
    if (updates.$set) {
      Object.assign(changes, updates.$set);
    }

    // Handle $push (append to array)
    if (updates.$push) {
      for (const [field, value] of Object.entries(updates.$push)) {
        const arr = Array.isArray(row[field]) ? [...row[field]] : [];
        arr.push(value);
        changes[field] = arr;
      }
    }

    // Handle $pull (remove from array)
    if (updates.$pull) {
      for (const [field, value] of Object.entries(updates.$pull)) {
        const arr = Array.isArray(row[field]) ? row[field].filter(v => v !== value) : [];
        changes[field] = arr;
      }
    }

    // Handle plain key-value updates (non-operator keys)
    for (const [key, value] of Object.entries(updates)) {
      if (!key.startsWith('$')) changes[key] = value;
    }

    if (Object.keys(changes).length > 0) {
      const { error } = await supabase
        .from(table)
        .update(changes)
        .eq(pkColumn, row[pkColumn]);
      if (error) throw error;
    }
  }
}

module.exports = { supabase, createTableWrapper, attachSave, applyFilters };
