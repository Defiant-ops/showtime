import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Database as DatabaseIcon, Pencil, RefreshCw, Save, X } from "lucide-react";
import {
  api,
  type DatabaseColumn,
  type DatabaseRow,
  type DatabaseRows,
  type DatabaseTable,
  type User,
} from "../lib/api";

const PAGE_SIZE = 50;

type Draft = Record<string, string | number | boolean | null>;

function editableValue(column: DatabaseColumn, value: Draft[string]) {
  if (value === null) return "";
  if (column.type.toLowerCase().includes("timestamp")) return String(value).slice(0, 16);
  return String(value);
}

function inputType(column: DatabaseColumn) {
  const type = column.type.toLowerCase();
  if (column.sensitive) return "password";
  if (type.includes("timestamp")) return "datetime-local";
  if (type.includes("int") || type.includes("decimal") || type.includes("numeric") || type.includes("number")) return "number";
  return "text";
}

export default function Database({ user }: { user: User }) {
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [data, setData] = useState<DatabaseRows | null>(null);
  const [offset, setOffset] = useState(0);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadTables() {
    setLoading(true);
    setError("");
    try {
      const availableTables = await api.databaseTables(user.user_id);
      setTables(availableTables);
      const firstAvailable = availableTables.find((table) => table.available)?.name ?? "";
      if (!selectedTable || !availableTables.some((table) => table.name === selectedTable && table.available)) {
        setSelectedTable(firstAvailable);
        setOffset(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load database tables");
    } finally {
      setLoading(false);
    }
  }

  async function loadRows(tableName = selectedTable, pageOffset = offset) {
    if (!tableName) return;
    setLoading(true);
    setError("");
    try {
      setData(await api.databaseRows(user.user_id, tableName, pageOffset));
      setEditingKey(null);
      setDraft({});
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Could not load table rows");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) void loadRows(selectedTable, offset);
  }, [selectedTable, offset]);

  function rowKey(row: DatabaseRow) {
    return JSON.stringify(row.primary_key);
  }

  function beginEdit(row: DatabaseRow) {
    setEditingKey(rowKey(row));
    setDraft({ ...row.values });
    setNotice("");
    setError("");
  }

  function cancelEdit() {
    setEditingKey(null);
    setDraft({});
  }

  async function saveRow(row: DatabaseRow) {
    if (!data) return;
    const changes: Draft = {};
    for (const column of data.columns) {
      if (column.primary_key) continue;
      const original = row.values[column.name];
      const edited = draft[column.name];
      if (column.sensitive && edited === "") continue;
      if (edited === original || (edited === "" && original === null)) continue;
      if (edited === "" && column.nullable) {
        changes[column.name] = null;
      } else if (inputType(column) === "number" && edited !== null && edited !== "") {
        changes[column.name] = Number(edited);
      } else if (inputType(column) === "datetime-local" && edited) {
        changes[column.name] = new Date(String(edited)).toISOString();
      } else {
        changes[column.name] = edited;
      }
    }

    if (Object.keys(changes).length === 0) {
      setNotice("No changes to save.");
      cancelEdit();
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.updateDatabaseRow(user.user_id, selectedTable, row.primary_key, changes);
      setNotice("Row updated.");
      await loadRows(selectedTable, offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update row");
    } finally {
      setSaving(false);
    }
  }

  const gridColumns = data?.columns.map((column) => column.name === "description" ? "minmax(220px, 2fr)" : "minmax(130px, 1fr)").join(" ") ?? "";

  return (
    <>
      <div className="page-head database-page-head">
        <div>
          <div className="eyebrow">SHOWTIME / ADMINISTRATION</div>
          <h1>Database</h1>
          <p>Browse application tables and update existing records.</p>
        </div>
        <button className="icon-button database-refresh" title="Refresh tables" onClick={() => void loadTables()} disabled={loading}>
          <RefreshCw size={15} />
        </button>
      </div>

      {error && <div className="notice query-error">{error}</div>}
      {notice && <div className="database-notice">{notice}</div>}

      <section className="database-workspace">
        <aside className="database-sidebar" aria-label="Database tables">
          <div className="database-sidebar-title"><DatabaseIcon size={14} /> TABLES <span>{tables.filter((table) => table.available).length}</span></div>
          {tables.map((table) => (
            <button
              className={`database-table-choice${selectedTable === table.name ? " selected" : ""}`}
              key={table.name}
              disabled={!table.available}
              onClick={() => { setSelectedTable(table.name); setOffset(0); setNotice(""); }}
            >
              <span>{table.name}</span>
              <small>{table.available ? "READY" : "NOT INITIALIZED"}</small>
            </button>
          ))}
        </aside>

        <div className="database-main">
          <div className="database-toolbar">
            <div>
              <span className="eyebrow">SELECTED TABLE</span>
              <h2>{selectedTable || "No tables available"}</h2>
            </div>
            <span className="head-status">{data ? `${data.rows.length} ROWS SHOWN` : ""}</span>
          </div>

          {data ? (
            <div className="database-grid-scroll">
              <div className="database-grid" style={{ gridTemplateColumns: `${gridColumns} 126px` }}>
                <div className="database-grid-header" style={{ gridTemplateColumns: `${gridColumns} 126px` }}>
                  {data.columns.map((column) => (
                    <span key={column.name} title={`${column.type}${column.primary_key ? " · primary key" : ""}${column.nullable ? " · nullable" : ""}`}>
                      {column.name}{column.primary_key ? " *" : ""}
                    </span>
                  ))}
                  <span>ACTION</span>
                </div>
                {data.rows.map((row) => {
                  const key = rowKey(row);
                  const isEditing = editingKey === key;
                  return (
                    <div className={`database-grid-row${isEditing ? " editing" : ""}`} key={key} style={{ gridTemplateColumns: `${gridColumns} 126px` }}>
                      {data.columns.map((column) => (
                        <div className="database-grid-cell" key={column.name}>
                          {isEditing && !column.primary_key ? (
                            <input
                              aria-label={`${column.name} value`}
                              type={inputType(column)}
                              step={inputType(column) === "number" ? "any" : undefined}
                              placeholder={column.sensitive ? "Hidden · enter to replace" : column.nullable ? "NULL" : "Enter value"}
                              value={editableValue(column, draft[column.name])}
                              onChange={(event) => setDraft((current) => ({ ...current, [column.name]: event.target.value }))}
                              disabled={saving}
                            />
                          ) : column.sensitive ? (
                            <span className="database-sensitive">Hidden</span>
                          ) : row.values[column.name] === null ? (
                            <span className="muted">NULL</span>
                          ) : (
                            <span title={String(row.values[column.name])}>{String(row.values[column.name])}</span>
                          )}
                        </div>
                      ))}
                      <div className="database-row-actions">
                        {isEditing ? (
                          <>
                            <button className="database-action-save" title="Save row changes" onClick={() => void saveRow(row)} disabled={saving}>
                              <Save size={14} /> <span>{saving ? "SAVING" : "SAVE"}</span>
                            </button>
                            <button className="icon-button" title="Cancel editing" onClick={cancelEdit} disabled={saving}><X size={15} /></button>
                          </>
                        ) : (
                          <button className="icon-button database-edit-button" title="Edit row" onClick={() => beginEdit(row)}>
                            <Pencil size={14} /> <span>EDIT</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!loading && data.rows.length === 0 && <div className="database-empty">NO ROWS IN THIS TABLE</div>}
                {loading && <div className="database-empty">LOADING RECORDS...</div>}
              </div>
            </div>
          ) : (
            <div className="database-empty">{loading ? "LOADING TABLE..." : "SELECT AN AVAILABLE TABLE"}</div>
          )}

          <div className="database-pagination">
            <span className="muted">Showing {data ? data.offset + 1 : 0}–{data ? data.offset + data.rows.length : 0}</span>
            <div>
              <button className="icon-button" title="Previous page" disabled={!data || offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}><ChevronLeft size={17} /></button>
              <button className="icon-button" title="Next page" disabled={!data?.has_more || loading} onClick={() => setOffset(offset + PAGE_SIZE)}><ChevronRight size={17} /></button>
            </div>
          </div>
          <div className="database-key-note"><span>*</span> Primary keys are read-only. Password values are hidden; entering a new value replaces the password.</div>
        </div>
      </section>
    </>
  );
}
