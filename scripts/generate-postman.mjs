import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const folders = new Map();
function add(group, name, method, path, body, role = 'investor', tests) {
  const request = {
    method,
    header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [],
    url: { raw: path.startsWith('{{') ? path : `{{baseUrl}}${path}` },
    description: 'All money amounts are integer paise. Use dummy academic documents only.',
    ...(role ? { auth: { type: 'bearer', bearer: [{ key: 'token', value: `{{${role}Token}}`, type: 'string' }] } } : {}),
    ...(body ? { body: { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } } } : {}),
  };
  const item = { name, request, ...(tests ? { event: [{ listen: 'test', script: { type: 'text/javascript', exec: tests } }] } : {}) };
  if (!folders.has(group)) folders.set(group, []);
  folders.get(group).push(item);
  return item;
}
add('Health', 'Health', 'GET', '{{apiOrigin}}/health', null, null);
add('Health', 'Database readiness', 'GET', '{{apiOrigin}}/ready', null, null);
add('Auth', 'Register investor', 'POST', '/auth/register', { name: 'Demo newcomer', email: 'newcomer@example.com', phone: '9876543210', password: 'Example@123', role: 'INVESTOR' }, null);
for (const [role, email, password] of [['investor', 'investor1@estora.dev', 'Investor@123'], ['broker', 'broker1@estora.dev', 'Broker@123'], ['admin', 'admin@estora.dev', 'Admin@123']]) add('Auth', `Login ${role}`, 'POST', '/auth/login', { email, password }, null, [`pm.test('Login succeeded', () => pm.response.to.have.status(200));`, `if (pm.response.code === 200) pm.collectionVariables.set('${role}Token', pm.response.json().data.token);`]);
add('Auth', 'Current profile', 'GET', '/auth/me');
add('Auth', 'Update profile', 'PATCH', '/auth/me', { name: 'Aman Mittal', phone: '9876543210' });
add('Auth', 'Change password', 'POST', '/auth/change-password', { currentPassword: 'Investor@123', password: 'Another@123' });
add('Auth', 'Logout (client clears token)', 'POST', '/auth/logout');
add('Auth', 'Forgot password', 'POST', '/auth/forgot-password', { email: 'investor1@estora.dev' }, null);
add('Auth', 'Reset password', 'POST', '/auth/reset-password/{{resetToken}}', { password: 'Another@123' }, null);
add('Public', 'Platform statistics', 'GET', '/stats', null, null);
add('Public', 'Marketplace', 'GET', '/properties?page=1&limit=12&sort=-createdAt', null, null, ["const p = pm.response.json().data.items.find(p => p.status === 'LIVE'); if(p) pm.collectionVariables.set('propertyId', p._id);"]);
add('Public', 'Marketplace filters', 'GET', '/properties?city=Bengaluru&type=APARTMENT&minPrice=1&maxPrice=10000000&fundingPctMin=0&fundingPctMax=100&search=Palm', null, null);
add('Public', 'Property detail', 'GET', '/properties/{{propertyId}}', null, null);
add('Broker properties', 'Broker statistics', 'GET', '/broker/stats', null, 'broker');
add('Broker properties', 'Own listings', 'GET', '/broker/properties?page=1&limit=20', null, 'broker');
add('Broker properties', 'Create partial draft', 'POST', '/properties/draft', { title: 'Demo listing', description: 'A property created through the API collection.', type: 'APARTMENT', savedStep: 1 }, 'broker', ["if(pm.response.code === 201) pm.collectionVariables.set('draftId', pm.response.json().data.property._id);"]);
add('Broker properties', 'Create complete draft', 'POST', '/properties', { title: 'Demo full listing', description: 'Complete listing with integer financial amounts.', type: 'APARTMENT', address: '12 Residency Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', areaSqft: 1500, valuation: 1000000000, totalUnits: 1000, minUnits: 1, maxUnitsPerInvestor: 490, expectedAppreciationPct: 10, rentalYieldPct: 3, holdingPeriodMonths: 24 }, 'broker');
add('Broker properties', 'Save draft location', 'PATCH', '/properties/{{draftId}}', { address: '12 Residency Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', areaSqft: 1500, savedStep: 2 }, 'broker');
add('Broker properties', 'Save draft financials', 'PATCH', '/properties/{{draftId}}', { valuation: 1000000000, totalUnits: 1000, minUnits: 1, maxUnitsPerInvestor: 490, expectedAppreciationPct: 10, rentalYieldPct: 3, holdingPeriodMonths: 24, savedStep: 3 }, 'broker');
const upload = add('Broker properties', 'Upload three images and optional PDF', 'POST', '/properties/{{draftId}}/media', null, 'broker');
upload.request.body = { mode: 'formdata', formdata: [{ key: 'images', type: 'file' }, { key: 'images', type: 'file' }, { key: 'images', type: 'file' }, { key: 'documents', type: 'file' }] };
add('Broker properties', 'Submit draft', 'POST', '/properties/{{draftId}}/submit', null, 'broker');
add('Broker properties', 'Property investor analytics', 'GET', '/properties/{{propertyId}}/investors', null, 'broker');
add('Investments', 'Buy one unit (save key to replay)', 'POST', '/investments', { propertyId: '{{propertyId}}', units: 1, idempotencyKey: '{{idempotencyKey}}' });
add('Investments', 'Own investments', 'GET', '/investments/me?page=1&limit=20');
add('Investments', 'Portfolio', 'GET', '/portfolio/summary');
add('Wallet', 'Wallet', 'GET', '/wallet');
add('Wallet', 'Create topup order', 'POST', '/wallet/topup/order', { amount: 1000000 }, 'investor', ["if(pm.response.code === 200) pm.collectionVariables.set('orderId', pm.response.json().data.orderId);"]);
add('Wallet', 'Verify demo mock topup', 'POST', '/wallet/topup/verify', { razorpayOrderId: '{{orderId}}', razorpayPaymentId: 'mock_{{$guid}}', razorpaySignature: 'mock' });
add('Wallet', 'Request withdrawal', 'POST', '/wallet/withdraw', { amount: 10000, bankDetails: { accountName: 'Demo account', accountNumber: '1234567890', ifsc: 'TEST0000001' } }, 'investor', ["if(pm.response.code === 201) pm.collectionVariables.set('withdrawalId', pm.response.json().data.withdrawal._id);"]);
add('Wallet', 'Own withdrawals', 'GET', '/wallet/withdrawals');
add('Wallet', 'Transaction statement', 'GET', '/transactions?page=1&limit=20');
add('Wallet', 'Filtered statement', 'GET', '/transactions?type=INVESTMENT&startDate=2020-01-01&endDate=2099-12-31');
const kyc = add('KYC', 'Submit dummy identity and selfie', 'POST', '/kyc');
kyc.request.body = { mode: 'formdata', formdata: [{ key: 'documents', type: 'file' }, { key: 'documents', type: 'file' }] };
add('Admin', 'Dashboard', 'GET', '/admin/stats', null, 'admin');
add('Admin', 'All properties', 'GET', '/properties?limit=100', null, 'admin', ["const p = pm.response.json().data.items.find(p => p.status === 'HOLDING'); if(p) pm.collectionVariables.set('holdingPropertyId', p._id);"]);
add('Admin', 'Approve property', 'POST', '/properties/{{draftId}}/approve', null, 'admin');
add('Admin', 'Reject property', 'POST', '/properties/{{draftId}}/reject', { reason: 'Please provide an updated valuation document.' }, 'admin');
add('Admin', 'Move FUNDED to HOLDING', 'POST', '/properties/{{fundedPropertyId}}/status', { status: 'HOLDING' }, 'admin');
add('Admin', 'Cancel LIVE and refund', 'POST', '/properties/{{propertyId}}/status', { status: 'CANCELLED' }, 'admin');
add('Admin', 'Payout preview (no writes)', 'GET', '/properties/{{holdingPropertyId}}/payout-preview?salePrice=1400000000', null, 'admin');
add('Admin', 'Execute sale', 'POST', '/properties/{{holdingPropertyId}}/sell', { salePrice: 1400000000 }, 'admin');
add('Admin', 'Search users', 'GET', '/admin/users?role=INVESTOR&search=investor&page=1', null, 'admin');
add('Admin', 'Deactivate user', 'PATCH', '/admin/users/{{userId}}', { isActive: false }, 'admin');
add('Admin', 'Approve broker', 'PATCH', '/admin/users/{{brokerId}}', { brokerApproved: true }, 'admin');
add('Admin', 'KYC queue', 'GET', '/admin/kyc', null, 'admin');
add('Admin', 'Approve KYC', 'PATCH', '/admin/kyc/{{kycUserId}}', { status: 'APPROVED' }, 'admin');
add('Admin', 'Reject KYC', 'PATCH', '/admin/kyc/{{kycUserId}}', { status: 'REJECTED', reason: 'Please upload a clearer dummy document.' }, 'admin');
add('Admin', 'Withdrawal queue', 'GET', '/admin/withdrawals', null, 'admin');
add('Admin', 'Approve withdrawal', 'PATCH', '/admin/withdrawals/{{withdrawalId}}', { status: 'APPROVED' }, 'admin');
add('Admin', 'Reject withdrawal', 'PATCH', '/admin/withdrawals/{{withdrawalId}}', { status: 'REJECTED' }, 'admin');
add('Admin', 'Settings', 'GET', '/admin/settings', null, 'admin');
add('Admin', 'Update rates', 'PATCH', '/admin/settings', { platformFeePct: 2, brokerCommissionPct: 1, maxOwnershipPct: 49 }, 'admin');
add('Admin', 'Platform ledger', 'GET', '/transactions?limit=100', null, 'admin');
add('Enquiries', 'Ask property broker', 'POST', '/enquiries', { propertyId: '{{propertyId}}', message: 'When does the holding period begin?' }, 'investor', ["if(pm.response.code === 201) pm.collectionVariables.set('enquiryId', pm.response.json().data.enquiry._id);"]);
add('Enquiries', 'Own threads', 'GET', '/enquiries');
add('Enquiries', 'Broker threads', 'GET', '/enquiries', null, 'broker');
add('Enquiries', 'Investor reply', 'POST', '/enquiries/{{enquiryId}}/reply', { text: 'Thank you for the update.' });
add('Enquiries', 'Broker reply', 'POST', '/enquiries/{{enquiryId}}/reply', { text: 'The period begins after confirmed acquisition.' }, 'broker');
add('Notifications', 'Unread count and list', 'GET', '/notifications');
add('Notifications', 'Mark read', 'PATCH', '/notifications/{{notificationId}}/read');
add('Notifications', 'Mark all read', 'PATCH', '/notifications/read-all');
add('Media', 'Authenticated document', 'GET', '/media/{{mediaId}}');
const variables = { apiOrigin: 'http://localhost:5000', baseUrl: 'http://localhost:5000/api/v1', investorToken: '', brokerToken: '', adminToken: '', propertyId: '', draftId: '', holdingPropertyId: '', fundedPropertyId: '', userId: '', brokerId: '', kycUserId: '', withdrawalId: '', orderId: '', resetToken: '', enquiryId: '', notificationId: '', mediaId: '', idempotencyKey: 'replace-with-a-unique-key-before-new-investment' };
const collection = {
  info: { name: 'ESTORA API', description: 'Complete API walkthrough. Start npm run demo, run role logins, then selected requests. Do not run all mutations blindly: cancellation, sale, password change and seed data are deliberately consequential within the disposable demo. All money uses integer paise. Choose dummy local files for multipart requests. For real Razorpay test verification, replace mock values with the checkout payment ID/signature.', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  variable: Object.entries(variables).map(([key, value]) => ({ key, value, type: 'string' })),
  item: [...folders].map(([name, item]) => ({ name, item })),
};
const dir = fileURLToPath(new URL('../api/', import.meta.url)); mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/ESTORA.postman_collection.json`, JSON.stringify(collection, null, 2));
console.log(`Generated Postman collection: ${[...folders.values()].flat().length} requests`);
