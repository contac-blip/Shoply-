Tenant scoping and ownership patches (draft)

1) Use `tenantMiddleware` to set `req.tenantId` for store-scoped endpoints.

Example: protect store product routes in `Routes/merchantRoutes.js`:

Add imports:

import { tenantMiddleware } from '../src/middleware/tenantMiddleware';
import ensureMerchantForStore from '../src/middleware/ensureMerchantForStore';

Then apply middleware to the router (after `auth` and `authorize`):

router.use(tenantMiddleware);
router.use(ensureMerchantForStore);

2) Scope product queries by `tenant_id` in controllers

Example change to `Controllers/productController.js` `getProducts`:

Replace:

let query = db('products').select('*');

With:

let query = db('products').select('*').where('tenant_id', req.tenantId || null);

3) When creating/updating products in `Controllers/adminController.js`, set `tenant_id` from request

Example (createProduct): add `tenant_id: req.tenantId || null` to insert payload.

4) `createOrder` must enforce single-store cart or split orders. Ensure order `tenant_id` is set to cart's tenant.

5) Inventory: decrement `product_variants.stock_quantity` when `variant_id` present.

Notes:
- These are draft patches. Full changes require updating all occurrences where `products`/`orders`/`carts` are queried and adding tests.
- Use `src/examples/tenantQueryExample.ts` as a reference for correct tenant-scoped queries.
