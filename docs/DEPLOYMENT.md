# Deployment guide: Vercel frontend and Render API

ESTORA is split into two deployments:

| Component | Platform | Root directory | Public responsibility |
|---|---|---|---|
| React/Vite client | Vercel | `client` | Serves the SPA and its static assets |
| Express API | Render web service | `server` | Serves `/api/v1`, connects to Atlas, Cloudinary and Razorpay test mode |

The API is intentionally configured to fail at startup when required secrets are absent. This avoids launching an application that cannot authenticate users or run its transactional financial workflows.

## 1. Prepare external services

1. Create a dedicated MongoDB Atlas database, for example `estora_deploy`. Atlas clusters support the replica-set transactions ESTORA uses for investments, refunds and payouts.
2. Add Render network access in Atlas. For initial testing, `0.0.0.0/0` is acceptable; restrict the rule later if fixed outbound addresses are available.
3. Create a new database user and copy its Atlas connection string as `MONGO_URI`.
4. Rotate any Atlas password or Cloudinary API secret that was pasted into chat or another public location. Never commit those values to Git.
5. Obtain Razorpay **test-mode** credentials. Production-mode ESTORA deliberately rejects mock payments and live Razorpay credentials.
6. Configure Cloudinary credentials. Use the Cloudinary cloud name, API key and API secret as three separate values.

## 2. Deploy the API on Render

Create a **Web Service** from the `main` branch of `DevangMittal23/Estora` with:

| Render setting | Value |
|---|---|
| Runtime | Node |
| Root directory | `server` |
| Build command | `npm ci --omit=dev` |
| Start command | `npm start` |
| Health check path | `/ready` |
| Node version | `20.19.0` |

In **Environment**, add all of these values before clicking **Save and deploy**:

```dotenv
NODE_ENV=production
NODE_VERSION=20.19.0
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<database>?retryWrites=true&w=majority
JWT_SECRET=<new random secret of at least 32 characters>
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173
PAYMENT_MODE=razorpay
MEDIA_MODE=cloudinary
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=<Razorpay test secret>
CLOUDINARY_CLOUD_NAME=<Cloudinary cloud name>
CLOUDINARY_API_KEY=<Cloudinary API key>
CLOUDINARY_API_SECRET=<Cloudinary API secret>
RESEND_API_KEY=<optional; required for delivered password-reset emails>
EMAIL_FROM=<a verified Resend sender; optional until Resend is configured>
ALLOW_SEED_RESET=false
```

`PORT` should be left unset. Render supplies it and the server reads `process.env.PORT` automatically.

### Fix for the failed first deploy

The logged Zod errors identify two missing required variables: `MONGO_URI` and `JWT_SECRET`. In Render, open the API service, choose **Environment**, add those values, then select **Save and deploy**. The service cannot start until both are present.

After they are added, a later failure mentioning Razorpay or Cloudinary means the production configuration is working as designed and the corresponding required integration variables must also be filled in.

When Render reports a successful deploy, copy its public API origin, for example:

```text
https://estora-api.onrender.com
```

Verify it with:

```text
https://estora-api.onrender.com/ready
```

`/ready` must return HTTP 200 before deploying the client.

## 3. Deploy the client on Vercel

1. Import `DevangMittal23/Estora` into Vercel.
2. Set **Root Directory** to `client`.
3. Select the **Vite** framework preset.
4. Use these build settings:

| Vercel setting | Value |
|---|---|
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |

5. Add this environment variable for Production, Preview and Development:

```dotenv
VITE_API_URL=https://estora-api.onrender.com
```

Use the API origin only; do not append `/api/v1`. The client appends that path itself. `client/vercel.json` already rewrites SPA routes to `index.html`, so deep links such as `/login` and `/investor/portfolio` work on refresh.

6. Deploy and copy the resulting production URL, for example `https://estora.vercel.app`.

## 4. Finish the CORS connection

Return to Render and change `CLIENT_URL` to the exact Vercel production origin:

```dotenv
CLIENT_URL=https://estora.vercel.app
```

Choose **Save and deploy** again. The API allows only this exact browser origin, so no trailing path is permitted.

## 5. Post-deploy validation

1. Load the Vercel URL, `/login`, `/properties` and a property detail route directly in a new browser tab.
2. Confirm the API health endpoint returns HTTP 200.
3. Register a test investor, sign in and browse the marketplace.
4. Upload only dummy KYC documents and use Razorpay test mode only.
5. Check browser DevTools for CORS errors. A CORS error normally means `CLIENT_URL` does not exactly match the Vercel origin or the Vercel build used the wrong `VITE_API_URL`.

## Deployment boundaries

Do not run `npm run seed` against a public deployment database. The seed data contains publicly known academic-demo passwords. For a presentation environment, use a separate Atlas database and do not share it publicly.

The provided `render.yaml` is a Blueprint alternative to manually creating the API service. It includes the required commands, health check, Node pin and prompts for secret values; it does not and must not contain secret values.
