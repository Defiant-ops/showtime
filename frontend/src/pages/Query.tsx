import { useState } from "react";
import { Code2, Play, RotateCcw } from "lucide-react";
import { api, type QueryResult, type User } from "../lib/api";

const STARTER_QUERY = "SELECT event_id, title, category, venue, price\nFROM events\nORDER BY event_date";

export default function Query({ user }: { user: User }) {
  const [query, setQuery] = useState(STARTER_QUERY);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);

  async function runQuery() {
    setRunning(true);
    setMessage("");
    try {
      setResult(await api.runQuery(user.user_id, query));
    } catch (err) {
      setResult(null);
      setMessage(err instanceof Error ? err.message : "Could not run query");
    } finally {
      setRunning(false);
    }
  }

  function resetQuery() {
    setQuery(STARTER_QUERY);
    setResult(null);
    setMessage("");
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">SHOWTIME / DATA WORKSPACE</div>
          <h1>Query</h1>
          <p>Write a read-only SELECT and inspect its results here.</p>
        </div>
        <div className="head-status"><Code2 size={14} /> READ ONLY · 100 ROW LIMIT</div>
      </div>

      <section className="query-workspace">
        <div className="query-toolbar">
          <span className="eyebrow">SQL EDITOR</span>
          <div className="query-actions">
            <button className="icon-button" title="Reset query" onClick={resetQuery} disabled={running}>
              <RotateCcw size={15} />
            </button>
            <button className="primary-button compact" onClick={runQuery} disabled={running || !query.trim()}>
              <Play size={13} /> {running ? "RUNNING..." : "RUN QUERY"}
            </button>
          </div>
        </div>
        <textarea
          className="query-editor"
          aria-label="SQL query editor"
          spellCheck={false}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              void runQuery();
            }
          }}
        />
        <div className="query-hint">
          <span>SELECT statements only. One statement per run.</span>
          <span>{user.role === "ADMIN" ? "Available tables: EVENTS, TICKET_TYPE, USERS, BOOKINGS, PAYMENTS, TICKET" : "Available tables: EVENTS, TICKET_TYPE"}</span>
        </div>
      </section>

      {message && <div className="notice query-error">{message}</div>}

      <section className="query-results">
        <div className="section-heading">
          <h2>Results</h2>
          {result && <span className="eyebrow">{result.rows.length}{result.truncated ? "+" : ""} ROWS</span>}
        </div>
        {result ? (
          <div className="event-table query-result-table">
            {result.columns.length > 0 ? (
              <>
                <div className="table-row table-header query-result-row">
                  {result.columns.map((column) => <span key={column}>{column}</span>)}
                </div>
                {result.rows.map((row, index) => (
                  <div className="table-row query-result-row" key={index}>
                    {result.columns.map((column) => (
                      <span className="query-cell" key={column} title={String(row[column] ?? "NULL")}>
                        {row[column] === null ? <span className="muted">NULL</span> : String(row[column])}
                      </span>
                    ))}
                  </div>
                ))}
              </>
            ) : <div className="empty">QUERY COMPLETED · NO COLUMNS RETURNED</div>}
            {result.rows.length === 0 && result.columns.length > 0 && <div className="empty">NO ROWS RETURNED</div>}
            {result.truncated && <div className="query-limit">Showing the first 100 rows. Add filters to narrow the result.</div>}
          </div>
        ) : (
          <div className="query-placeholder">Run a query to see its output here.</div>
        )}
      </section>
    </>
  );
}