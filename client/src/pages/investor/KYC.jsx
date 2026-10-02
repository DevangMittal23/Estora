import React from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { send, useAction, errorMessage } from '../../api';
import { Heading, Chip, Button, Field, MediaLink } from '../../components/ui';
export const validateFiles = (files, max = 2) =>
  !files.length
    ? 'Choose at least one file.'
    : files.length > max
      ? `Choose at most ${max} files.`
      : Array.from(files).some(
            (f) =>
              ![
                'image/jpeg',
                'image/png',
                'image/webp',
                'application/pdf',
              ].includes(f.type) || f.size > 5 * 1024 * 1024
          )
        ? 'Use JPG, PNG, WebP or PDF files up to 5 MB each.'
        : true;
export function KYC() {
  const { user, refresh } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const action = useAction(async (values) => {
    const body = new FormData();
    Array.from(values.documents).forEach((file) =>
      body.append('documents', file)
    );
    await send('post', '/kyc', body);
    await refresh();
  }, 'Identity documents submitted');
  return (
    <>
      <Heading
        eyebrow="A foundation of trust"
        title="Identity verification"
        description="Submit dummy documents for this academic demonstration. Approval is required before investing."
      />
      <section className="panel narrow">
        <div className="between">
          <h2>Your verification status</h2>
          <Chip status={user.kyc?.status || 'NOT_SUBMITTED'} />
        </div>
        {user.kyc?.reason && (
          <div className="notice danger">
            Review feedback: {user.kyc.reason}
          </div>
        )}
        {user.kyc?.status === 'APPROVED' ? (
          <div className="notice success">
            You’re verified and ready to invest.
          </div>
        ) : user.kyc?.status === 'PENDING' ? (
          <div className="notice">
            Your documents are awaiting administrator review.{' '}
            <Button variant="ghost" onClick={refresh}>
              Refresh status
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(action.mutate)}>
            <Field
              label="Dummy ID and selfie / supporting document"
              help="1–2 files. JPG, PNG, WebP or PDF. Maximum 5 MB each."
              error={errors.documents?.message}
            >
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                {...register('documents', {
                  validate: (files) => validateFiles(files),
                })}
              />
            </Field>
            {action.isError && (
              <p className="danger">{errorMessage(action.error)}</p>
            )}
            <Button loading={action.isPending} type="submit">
              Submit for verification
            </Button>
          </form>
        )}
        {user.kyc?.docs?.length > 0 && (
          <div className="document-list">
            <h3>Submitted documents</h3>
            {user.kyc.docs.map((doc, i) => (
              <MediaLink
                key={typeof doc === 'string' ? doc : doc.url}
                media={
                  typeof doc === 'string'
                    ? { url: doc, name: `Document ${i + 1}` }
                    : doc
                }
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
