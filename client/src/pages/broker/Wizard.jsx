import React, { useState } from 'react';
import {
  useParams,
  useNavigate,
  useSearchParams,
  Link,
} from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useData, useAction, send, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  Heading,
  QueryState,
  Field,
  Button,
  Chip,
  PropertyImage,
  MediaLink,
} from '../../components/ui';
import { types, label, money, toPaise } from '../../utils';
import { validateFiles } from '../investor/KYC';
const basicsSchema = z.object({
  title: z.string().trim().min(3, 'Use at least 3 characters.'),
  description: z
    .string()
    .trim()
    .min(20, 'Describe the property in at least 20 characters.'),
  type: z.enum(types),
});
const locationSchema = z.object({
  address: z.string().trim().min(3),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  pincode: z.string().regex(/^\d{6}$/, 'Use a 6-digit pincode.'),
  areaSqft: z.coerce.number().positive('Enter the area in square feet.'),
});
export const financialSchema = z
  .object({
    valuation: z.string().refine((v) => {
      try {
        return toPaise(v) > 0;
      } catch {
        return false;
      }
    }, 'Enter a positive amount with at most two decimals.'),
    totalUnits: z.coerce.number().int().positive(),
    minUnits: z.coerce.number().int().positive(),
    maxUnitsPerInvestor: z.coerce.number().int().positive(),
    expectedAppreciationPct: z.coerce.number().min(0).max(100),
    rentalYieldPct: z.coerce.number().min(0).max(100),
    holdingPeriodMonths: z.coerce.number().int().positive(),
  })
  .superRefine((v, ctx) => {
    let valuation;
    try {
      valuation = toPaise(v.valuation);
    } catch {
      return;
    }
    if (valuation % v.totalUnits !== 0)
      ctx.addIssue({
        code: 'custom',
        path: ['valuation'],
        message: 'Valuation must divide into whole paise per unit.',
      });
    if (
      v.minUnits > v.totalUnits ||
      v.maxUnitsPerInvestor > v.totalUnits ||
      v.minUnits > v.maxUnitsPerInvestor
    )
      ctx.addIssue({
        code: 'custom',
        path: ['minUnits'],
        message: 'Minimum and maximum units must fit within total units.',
      });
  });
export function Wizard({ admin = false }) {
  const { id: routeId } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const key = `estora-draft:${user._id}`;
  const id =
    routeId || (params.get('fresh') === '1' ? null : localStorage.getItem(key));
  const query = useData(`/properties/${id}`, {}, { enabled: !!id });
  return (
    <>
      <Heading
        eyebrow="A carefully considered listing"
        title={id ? 'Continue your listing' : 'Create a property listing'}
        description="A guided path from property details to platform review."
      />
      {id ? (
        <QueryState query={query}>
          {(p) =>
            !['DRAFT', 'REJECTED'].includes(p.status) ? (
              <LimitedEdit initial={p} admin={admin} />
            ) : (
              <WizardForm
                key={p._id}
                initial={p}
                storageKey={key}
                admin={admin}
              />
            )
          }
        </QueryState>
      ) : (
        <WizardForm storageKey={key} admin={admin} />
      )}
    </>
  );
}
function LimitedEdit({ initial, admin }) {
  const [images, setImages] = useState([]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { description: initial.description } });
  const action = useAction(async (values) => {
    await send('patch', `/properties/${initial._id}`, values);
    if (images.length) {
      const body = new FormData();
      images.forEach((file) => body.append('images', file));
      await send('post', `/properties/${initial._id}/media`, body);
      setImages([]);
    }
  }, 'Listing updated');
  return (
    <section className="panel narrow">
      <h2>Edit listing presentation</h2>
      <p className="notice">
        This property is {label(initial.status)}. You can update the description
        and add images. Financial terms are locked.
      </p>
      <form onSubmit={handleSubmit(action.mutate)}>
        <Field label="Description" error={errors.description?.message}>
          <textarea
            rows={7}
            {...register('description', { required: 'Enter a description.' })}
          />
        </Field>
        <Field
          label="Add images (optional)"
          help="JPG, PNG or WebP, up to 5 MB each."
        >
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const files = Array.from(e.target.files);
              if (
                validateFiles(files, 20) !== true ||
                files.some((f) => f.type === 'application/pdf')
              ) {
                e.target.value = '';
                return;
              }
              setImages(files);
            }}
          />
        </Field>
        <div className="media-preview">
          {initial.images?.map((image) => (
            <PropertyImage
              key={image.url}
              media={image}
              alt={image.name || initial.title}
            />
          ))}
        </div>
        <Button type="submit" loading={action.isPending}>
          Save updates
        </Button>
      </form>
      <Link
        className="text-link"
        to={admin ? '/admin/properties' : '/broker/properties'}
      >
        Back to properties →
      </Link>
    </section>
  );
}
export function WizardForm({ initial = {}, storageKey, admin }) {
  const navigate = useNavigate();
  const [id, setId] = useState(initial._id),
    [step, setStep] = useState(Math.min(initial.savedStep || 0, 4)),
    [property, setProperty] = useState(initial),
    [images, setImages] = useState([]),
    [documents, setDocuments] = useState([]),
    [fileError, setFileError] = useState(null);
  const {
    register,
    watch,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      type: 'APARTMENT',
      address: '',
      city: '',
      state: '',
      pincode: '',
      areaSqft: '',
      totalUnits: '',
      minUnits: 1,
      maxUnitsPerInvestor: '',
      expectedAppreciationPct: '',
      rentalYieldPct: '',
      holdingPeriodMonths: 24,
      ...initial,
      valuation: initial.valuation ? String(initial.valuation / 100) : '',
    },
  });
  const values = watch();
  let unitPrice = 0;
  try {
    unitPrice = toPaise(values.valuation) / Number(values.totalUnits);
  } catch {
    /* Preview until valid. */
  }
  const schemas = [basicsSchema, locationSchema, financialSchema];
  const save = useAction(async ({ advance = false } = {}) => {
    clearErrors();
    const form = getValues();
    let body;
    if (step < 3) {
      const result = schemas[step].safeParse(form);
      if (!result.success) {
        result.error.issues.forEach((issue) =>
          setError(issue.path[0], { message: issue.message })
        );
        throw new Error('Please correct the highlighted fields.');
      }
      body = result.data;
      if (
        step === 1 &&
        form.geo?.lat !== '' &&
        form.geo?.lng !== '' &&
        form.geo?.lat !== undefined
      ) {
        const lat = Number(form.geo.lat),
          lng = Number(form.geo.lng);
        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        )
          throw new Error('Enter valid latitude and longitude.');
        body.geo = { lat, lng };
      }
      if (step === 2) body.valuation = toPaise(body.valuation);
    } else body = {};
    body.savedStep = advance ? Math.min(step + 1, 4) : step;
    let nextId = id;
    let p;
    if (!nextId) {
      p = (await send('post', '/properties/draft', body)).property;
      nextId = p._id;
      setId(nextId);
      localStorage.setItem(storageKey, nextId);
    } else p = (await send('patch', `/properties/${nextId}`, body)).property;
    if (step === 3 && (images.length || documents.length)) {
      const media = new FormData();
      images.forEach((f) => media.append('images', f));
      documents.forEach((f) => media.append('documents', f));
      p = (await send('post', `/properties/${nextId}/media`, media)).property;
      setImages([]);
      setDocuments([]);
    }
    setProperty(p);
    if (advance) setStep((s) => Math.min(s + 1, 4));
    return p;
  }, 'Draft saved');
  const submit = useAction(async () => {
    await send('post', `/properties/${id}/submit`);
    localStorage.removeItem(storageKey);
    navigate(admin ? '/admin/properties' : '/broker/properties');
  }, 'Property submitted for review');
  const locked =
    initial.status && !['DRAFT', 'REJECTED'].includes(initial.status);
  if (locked)
    return (
      <div className="notice">
        This property is {label(initial.status)}. Full listing edits are
        available for draft and rejected listings.{' '}
        <Link to={admin ? '/admin/properties' : '/broker/properties'}>
          Back to properties
        </Link>
      </div>
    );
  const upload = (e, kind) => {
    const files = Array.from(e.target.files);
    const verdict = validateFiles(files, kind === 'images' ? 20 : 10);
    if (verdict !== true) {
      setFileError(verdict);
      return;
    }
    if (kind === 'images' && files.some((f) => f.type === 'application/pdf')) {
      setFileError('Property images must be JPG, PNG or WebP.');
      return;
    }
    setFileError(null);
    (kind === 'images' ? setImages : setDocuments)(files);
  };
  return (
    <div className="wizard-layout">
      <aside className="wizard-steps">
        {[
          'The basics',
          'The location',
          'The financials',
          'Media & documents',
          'Review & submit',
        ].map((name, i) => (
          <div
            className={i === step ? 'active' : i < step ? 'complete' : ''}
            key={name}
          >
            <span>{i + 1}</span>
            <strong>{name}</strong>
          </div>
        ))}
        <p>
          Every step is saved securely. Return to finish your draft whenever
          you’re ready.
        </p>
        {id && <small>Draft reference: {id}</small>}
      </aside>
      <section className="panel wizard-content">
        {property.rejectionReason && (
          <div className="notice danger">
            Review feedback: {property.rejectionReason}
          </div>
        )}
        <span className="eyebrow">Step {step + 1} of 5</span>
        <h2>
          {
            [
              'Tell the property’s story.',
              'Place it on the map.',
              'Make the numbers clear.',
              'Bring the listing to life.',
              'Ready for a considered review.',
            ][step]
          }
        </h2>
        {step === 0 && (
          <>
            <Field
              label="Property title"
              {...register('title')}
              error={errors.title?.message}
            />
            <Field label="Description" error={errors.description?.message}>
              <textarea rows={6} {...register('description')} />
            </Field>
            <Field label="Property type">
              <select {...register('type')}>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {label(t)}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        {step === 1 && (
          <>
            <Field
              label="Street address"
              {...register('address')}
              error={errors.address?.message}
            />
            <div className="two-fields">
              <Field
                label="City"
                {...register('city')}
                error={errors.city?.message}
              />
              <Field
                label="State"
                {...register('state')}
                error={errors.state?.message}
              />
              <Field
                label="Pincode"
                {...register('pincode')}
                error={errors.pincode?.message}
              />
              <Field
                label="Area (sq ft)"
                type="number"
                min="1"
                {...register('areaSqft')}
                error={errors.areaSqft?.message}
              />
              <Field
                label="Latitude (optional)"
                type="number"
                step="any"
                {...register('geo.lat')}
              />
              <Field
                label="Longitude (optional)"
                type="number"
                step="any"
                {...register('geo.lng')}
              />
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="two-fields">
              {[
                ['valuation', 'Property valuation (₹)'],
                ['totalUnits', 'Total units'],
                ['minUnits', 'Minimum purchase units'],
                ['maxUnitsPerInvestor', 'Max units per investor'],
                ['expectedAppreciationPct', 'Expected appreciation (% / year)'],
                ['rentalYieldPct', 'Rental yield (%)'],
                ['holdingPeriodMonths', 'Holding period (months)'],
              ].map(([key, caption]) => (
                <Field
                  key={key}
                  label={caption}
                  type="number"
                  min="0"
                  step={
                    [
                      'valuation',
                      'expectedAppreciationPct',
                      'rentalYieldPct',
                    ].includes(key)
                      ? '0.01'
                      : '1'
                  }
                  {...register(key)}
                  error={errors[key]?.message}
                />
              ))}
            </div>
            <div className="unit-price-preview">
              <small>Computed price per unit</small>
              <strong>
                {Number.isFinite(unitPrice) && unitPrice > 0
                  ? money(unitPrice)
                  : '—'}
              </strong>
              {unitPrice > 0 && !Number.isInteger(unitPrice) && (
                <p className="danger">
                  Valuation must divide into whole paise per unit.
                </p>
              )}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <Field
              label="Property images"
              help="Add at least 3 images before submitting. JPG, PNG or WebP; 5 MB each."
            >
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => upload(e, 'images')}
              />
            </Field>
            <p>
              {property.images?.length || 0} saved · {images.length} selected
            </p>
            <div className="media-preview">
              {property.images?.map((m) => (
                <PropertyImage
                  key={m.url}
                  media={m}
                  alt={m.name || 'Property image'}
                />
              ))}
            </div>
            <Field
              label="Supporting documents"
              help="PDF, JPG, PNG or WebP; 5 MB each."
            >
              <input
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => upload(e, 'documents')}
              />
            </Field>
            {property.documents?.map((doc) => (
              <MediaLink key={doc.url} media={doc} />
            ))}
            {fileError && <p className="danger">{fileError}</p>}
          </>
        )}
        {step === 4 && (
          <>
            <Chip status={property.status || 'DRAFT'} />
            <h3>{values.title}</h3>
            <p className="preserve-text">{values.description}</p>
            <div className="summary-line">
              <span>Location</span>
              <strong>
                {values.city}, {values.state}
              </strong>
            </div>
            <div className="summary-line">
              <span>Valuation / unit price</span>
              <strong>
                {property.valuation ? money(property.valuation) : '—'} /{' '}
                {money(property.unitPrice || 0)}
              </strong>
            </div>
            <div className="summary-line">
              <span>Units / minimum</span>
              <strong>
                {values.totalUnits} / {values.minUnits}
              </strong>
            </div>
            <div className="summary-line">
              <span>Images saved</span>
              <strong>{property.images?.length || 0} (3 required)</strong>
            </div>
            <div className="summary-line">
              <span>Documents saved</span>
              <strong>{property.documents?.length || 0}</strong>
            </div>
            <p className="notice">
              The platform reviews your listing before it goes live. Financial
              details become locked once investors hold units.
            </p>
          </>
        )}
        {save.isError && (
          <p className="danger" role="alert">
            {errorMessage(save.error)}
          </p>
        )}
        <div className="wizard-actions">
          <Button
            variant="secondary"
            disabled={step === 0 || save.isPending}
            onClick={() => setStep((s) => s - 1)}
          >
            Previous step
          </Button>
          {step < 4 ? (
            <>
              <Button
                variant="secondary"
                loading={save.isPending}
                disabled={!!fileError}
                onClick={() => save.mutate({ advance: false })}
              >
                Save draft
              </Button>
              <Button
                loading={save.isPending}
                disabled={!!fileError}
                onClick={() => save.mutate({ advance: true })}
              >
                Save & continue →
              </Button>
            </>
          ) : (
            <Button
              loading={submit.isPending}
              disabled={(property.images?.length || 0) < 3}
              onClick={() => submit.mutate()}
            >
              Submit for approval
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
