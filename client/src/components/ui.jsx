import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
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

import { api, apiOrigin, errorMessage } from '../api';
import { money, pct, label } from '../utils';
import { propertyPath, PUBLIC_PROPERTY_STATUSES } from '../seo/urls';
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
    <div className={`kpis kpis-${items.length}`}>
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
  emptyDescription,
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
  if (!items.length)
    return <Empty title={emptyTitle} description={emptyDescription} />;
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
                <th key={col.label} className={col.className}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item[keyField] || index}>
                {columns.map((col) => (
                  <td key={col.label} className={col.className}>
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
  publicMedia = false,
  loading = 'lazy',
  fetchPriority = 'auto',
}) {
  const initialUrl = media?.url?.startsWith('/api/v1/media/')
    ? publicMedia ? `${apiOrigin}${media.url}` : '/architecture.svg'
    : media?.url || '/architecture.svg';
  const [url, setUrl] = useState(initialUrl);
  useEffect(() => {
    let alive = true;
    let blobUrl;
    setUrl('/architecture.svg');
    if (publicMedia && media?.url?.startsWith('/api/v1/media/')) setUrl(`${apiOrigin}${media.url}`);
    else if (media?.url?.startsWith('/api/v1/media/')) {
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
  }, [media?.url, publicMedia]);
  return (
    <img
      className={className}
      src={url}
      alt={media?.url ? alt : 'Illustrative architecture; no property image supplied'}
      width={1200}
      height={800}
      loading={loading}
      fetchpriority={fetchPriority}
      decoding="async"
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
      <Link to={propertyPath(p)} className="property-image">
        <PropertyImage media={p.images?.[0]} alt={`${p.title}${p.city ? ` in ${p.city}` : ''}`} publicMedia={PUBLIC_PROPERTY_STATUSES.includes(p.status)} />
        <Chip status={p.status} />
        <span className="image-type">{label(p.type)}</span>
      </Link>
      <div className="property-body">
        <span className="eyebrow">
          {p.city} · {p.areaSqft?.toLocaleString('en-IN')} sq ft
        </span>
        <h3>
          <Link to={propertyPath(p)}>{p.title}</Link>
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
        <Link className="text-link" to={propertyPath(p)}>
          Explore property <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  );
}
const LazyAllocation = lazy(() => import('./charts').then((module) => ({ default: module.Allocation })));
const LazyDataChart = lazy(() => import('./charts').then((module) => ({ default: module.DataChart })));
function ChartLoading() {
  return <div className="chart" style={{ minHeight: 280 }} role="status" aria-label="Loading chart"><div className="skeleton" /></div>;
}
export function Allocation(props) {
  return <Suspense fallback={<ChartLoading />}><LazyAllocation {...props} /></Suspense>;
}
export function DataChart(props) {
  return <Suspense fallback={<ChartLoading />}><LazyDataChart {...props} /></Suspense>;
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
