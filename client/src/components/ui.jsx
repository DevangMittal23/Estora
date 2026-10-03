import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Building2,
  LoaderCircle,
  AlertCircle,
  X,
  Check,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { api, apiOrigin, errorMessage } from '../api';
import { money, compactMoney, pct, label } from '../utils';
import toast from 'react-hot-toast';
export function Button({
  children,
  loading,
  disabled,
  variant = 'primary',
  className = '',
  ...props
}) {
  return (
    <button
      className={`button ${variant} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <LoaderCircle className="spin" size={16} />} {children}
    </button>
  );
}
export const Field = React.forwardRef(function Field(
  { label: caption, error, help, children, ...props },
  ref
) {
  return (
    <label className="field">
      <span>{caption}</span>
      {children || (
        <input
          ref={ref}
          aria-label={caption}
          aria-invalid={!!error}
          {...props}
        />
      )}{' '}
      {error && (
        <small className="danger" role="alert">
          {error}
        </small>
      )}
      {help && <small>{help}</small>}
    </label>
  );
});
export function Chip({ status }) {
  return (
    <span className={`chip ${String(status).toLowerCase()}`}>
      {label(status)}
    </span>
  );
}
export function Empty({
  title = 'Nothing here yet',
  description = 'Your activity will appear here as you get started.',
  action,
}) {
  return (
    <div className="empty">
      <Building2 size={42} strokeWidth={1} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function QueryState({ query, children, empty }) {
  if (query.isPending)
    return (
      <div
        className="skeleton-stack"
        aria-label="Loading content"
        role="status"
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton" />
        ))}
      </div>
    );
  if (query.isError)
    return (
      <div className="error-state" role="alert">
        <AlertCircle size={26} />
        <h3>We couldn’t load this information</h3>
        <p>{errorMessage(query.error)}</p>
        <Button variant="secondary" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    );
  if (empty) return <Empty />;
  return typeof children === 'function' ? children(query.data) : children;
}
export function Heading({
  eyebrow,
  title,
  description,
  action,
  as: Tag = 'h1',
}) {
  return (
    <header className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <Tag>{title}</Tag>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function Kpis({ items }) {
  return (
    <div className="kpis">
      {items.map(([caption, value, detail]) => (
        <article key={caption} className="kpi">
          <span>{caption}</span>
          <strong
            className={
              typeof value === 'string' && value.startsWith('-') ? 'danger' : ''
            }
          >
            {value}
          </strong>
          {detail && <small>{detail}</small>}
        </article>
      ))}
    </div>
  );
}
export function Progress({ value = 0 }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-block">
      <div className="between">
        <span>Funding progress</span>
        <strong>{pct(safe)}</strong>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-label="Funding progress"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span
          style={{ width: `${safe}%` }}
          className={safe === 100 ? 'full' : ''}
        />
      </div>
    </div>
  );
}
export function Pagination({ data, page, onChange }) {
  const totalPages = data?.totalPages || 1;
  return (
    <div className="pagination">
      <span>
        {data?.total ?? data?.items?.length ?? 0} results · Page {page} of{' '}
        {totalPages}
      </span>
      <div className="actions">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
export function Table({
  columns,
  items = [],
  keyField = '_id',
  emptyTitle = 'No records found',
}) {
  const tableRef = useRef(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const node = tableRef.current;
    if (!node) return;
    const measure = () => setOverflow(node.scrollWidth > node.clientWidth + 2);
    measure();
    window.addEventListener('resize', measure);
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(measure)
        : null;
    observer?.observe(node);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [items.length]);
  if (!items.length) return <Empty title={emptyTitle} />;
  return (
    <>
      {overflow && (
        <p className="table-scroll-cue">
          Scroll horizontally to view all columns →
        </p>
      )}
      <div
        ref={tableRef}
        className="table-wrap"
        tabIndex={overflow ? 0 : undefined}
        role={overflow ? 'region' : undefined}
        aria-label={overflow ? 'Scrollable table' : undefined}
      >
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.label}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item[keyField] || index}>
                {columns.map((col) => (
                  <td key={col.label}>
                    {col.render ? col.render(item) : (item[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
export function Modal({
  title,
  children,
  onClose,
  onConfirm,
  confirmText = 'Confirm',
  loading,
  disabled,
  danger = false,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const modal = ref.current;
    modal?.focus();
    const listener = (e) => {
      if (e.key === 'Escape' && !loading) onClose();
      if (e.key === 'Tab') {
        const nodes = modal.querySelectorAll(
          'button:not(:disabled),input:not(:disabled):not([type="hidden"]),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]'
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (!nodes.length) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === modal)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === modal)
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('keydown', listener);
      previous?.focus();
    };
  }, [onClose, loading]);
  return (
    <div className="modal-backdrop">
      <section
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="between">
          <h2>{title}</h2>
          <button
            aria-label="Close dialog"
            className="icon-button"
            disabled={loading}
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        {children}
        <div className="actions end">
          <Button variant="secondary" disabled={loading} onClick={onClose}>
            Go back
          </Button>
          {onConfirm && (
            <Button
              loading={loading}
              disabled={disabled}
              variant={danger ? 'danger' : 'primary'}
              onClick={onConfirm}
            >
              {confirmText}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
export function PropertyImage({
  media,
  className = '',
  alt = 'Architectural illustration',
}) {
  const [url, setUrl] = useState('/architecture.svg');
  useEffect(() => {
    let alive = true;
    let blobUrl;
    setUrl('/architecture.svg');
    if (media?.url?.startsWith('/api/v1/media/')) {
      api
        .get(media.url.replace('/api/v1', ''), { responseType: 'blob' })
        .then((response) => {
          blobUrl = URL.createObjectURL(response.data);
          if (alive) setUrl(blobUrl);
        })
        .catch(() => {});
    } else setUrl(media?.url || '/architecture.svg');
    return () => {
      alive = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [media?.url]);
  return (
    <img
      className={className}
      src={url}
      alt={alt}
      onError={() => setUrl('/architecture.svg')}
    />
  );
}
export function MediaLink({ media }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );
  const url = typeof media === 'string' ? media : media.url;
  const name =
    typeof media === 'string' ? 'View document' : media.name || 'View document';
  const open = async () => {
    setLoading(true);
    try {
      const response = await api.get(url.replace('/api/v1', ''), {
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(response.data);
      setPreview(blobUrl);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  return url?.startsWith('/api/v1/media/') ? (
    <>
      <button className="document-link" disabled={loading} onClick={open}>
        {name}
        {loading ? (
          <LoaderCircle className="spin" size={16} />
        ) : (
          <ArrowUpRight size={16} />
        )}
      </button>
      {preview && (
        <Modal title={name} onClose={() => setPreview(null)}>
          <iframe
            title={`Preview ${name}`}
            src={preview}
            className="document-preview"
          />
          <p className="small">
            If the preview does not appear, download the document to view it.
          </p>
          <a className="button secondary" href={preview} download={name}>
            Download document
          </a>
        </Modal>
      )}
    </>
  ) : (
    <a
      className="document-link"
      href={
        url?.startsWith('/') && !url.startsWith('/assets/')
          ? `${apiOrigin}${url}`
          : url
      }
      target="_blank"
      rel="noreferrer"
    >
      {name}
      <ArrowUpRight size={16} />
    </a>
  );
}
export function PropertyCard({ property: p }) {
  return (
    <article className="property-card">
      <Link to={`/properties/${p._id}`} className="property-image">
        <PropertyImage media={p.images?.[0]} alt={p.title} />
        <Chip status={p.status} />
        <span className="image-type">{label(p.type)}</span>
      </Link>
      <div className="property-body">
        <span className="eyebrow">
          {p.city} · {p.areaSqft?.toLocaleString('en-IN')} sq ft
        </span>
        <h3>
          <Link to={`/properties/${p._id}`}>{p.title}</Link>
        </h3>
        <div className="property-numbers">
          <div>
            <small>Price per unit</small>
            <strong>{money(p.unitPrice)}</strong>
          </div>
          <div>
            <small>Expected appreciation</small>
            <strong className="positive">
              {p.expectedAppreciationPct}% / yr
            </strong>
          </div>
        </div>
        <Progress value={p.fundingPct ?? (p.unitsSold / p.totalUnits) * 100} />
        <div className="property-entry">
          <span>
            Start from <strong>{money(p.unitPrice * p.minUnits)}</strong>
          </span>
          <span>{p.holdingPeriodMonths} month hold</span>
        </div>
        <Link className="text-link" to={`/properties/${p._id}`}>
          Explore property <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  );
}
const colors = [
  '#0F2A4A',
  '#10B981',
  '#D4A017',
  '#6688A0',
  '#ABC5B7',
  '#966DC1',
];
export function Allocation({ items = [] }) {
  if (!items.length)
    return (
      <Empty
        title="Your portfolio starts with one property"
        description="Explore the marketplace to find your first investment."
        action={
          <Link className="button primary" to="/properties">
            Explore properties
          </Link>
        }
      />
    );
  return (
    <div className="allocation">
      <div className="chart">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={items}
              dataKey="investedAmount"
              nameKey="title"
              innerRadius={72}
              outerRadius={105}
              paddingAngle={3}
            >
              {items.map((p, i) => (
                <Cell
                  key={`${p.propertyId}-${i}`}
                  fill={colors[i % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => money(value)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        {items.map((p, i) => (
          <div className="allocation-legend" key={`${p.propertyId}-${i}`}>
            <i style={{ background: colors[i % colors.length] }} />
            <div>
              <strong>{p.title}</strong>
              <small>
                {pct(p.ownershipPct)} ownership ·{' '}
                {p.investmentStatus === 'EXITED' || p.status === 'SOLD'
                  ? 'Exited position'
                  : 'Active holding'}
              </small>
            </div>
            <span>{compactMoney(p.investedAmount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
export function DataChart({
  data = [],
  x = 'month',
  y = 'amount',
  bar = false,
  moneyValues = true,
}) {
  if (!data.length)
    return (
      <Empty
        title="No chart activity yet"
        description="Recorded activity will populate this chart."
      />
    );
  const Chart = bar ? BarChart : LineChart;
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={280}>
        <Chart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e9edf0"
          />
          <XAxis dataKey={x} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            tickFormatter={(v) => (moneyValues ? compactMoney(v) : v)}
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip formatter={(v) => (moneyValues ? money(v) : v)} />
          {bar ? (
            <Bar dataKey={y} fill="#0F2A4A" radius={[4, 4, 0, 0]} />
          ) : (
            <Line
              type="monotone"
              dataKey={y}
              stroke="#10B981"
              strokeWidth={3}
              dot={false}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
export function Success({ title, description, action }) {
  return (
    <div className="success-state">
      <span className="success-icon">
        <Check size={30} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
