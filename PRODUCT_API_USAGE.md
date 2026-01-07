# Product API Usage Guide

## Product Create and Update with Multipart/Form-Data

### Create Product

**Endpoint:** `POST /api/v1/vendor/products`

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <vendor_token>
```

**Form Data Fields:**
- `title` (string, required): Product title
- `amount` (number, required): Product price
- `hasDiscount` (boolean, optional): Whether product has discount
- `discountPercentage` (number, optional): Discount percentage (0-100), required if hasDiscount is true
- `description` (string, optional): Product description
- `files` (array of files, required): Product images (min 1, max 10, only jpeg, png, webp)

**cURL Example:**
```bash
curl -X POST 'https://your-domain.com/api/v1/vendor/products' \
  -H 'Authorization: Bearer YOUR_VENDOR_TOKEN' \
  -H 'Content-Type: multipart/form-data' \
  -F 'title=Paracetamol 500mg' \
  -F 'amount=100.50' \
  -F 'hasDiscount=false' \
  -F 'description=High-quality paracetamol tablets' \
  -F 'files=@/path/to/image1.jpg' \
  -F 'files=@/path/to/image2.png'
```

**JavaScript/Fetch Example:**
```javascript
const formData = new FormData();
formData.append('title', 'Paracetamol 500mg');
formData.append('amount', '100.50');
formData.append('hasDiscount', 'false');
formData.append('description', 'High-quality paracetamol tablets');
formData.append('files', fileInput1.files[0]); // First image
formData.append('files', fileInput2.files[0]); // Second image

fetch('https://your-domain.com/api/v1/vendor/products', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_VENDOR_TOKEN'
    // Don't set Content-Type header, browser will set it with boundary
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

**Postman:**
1. Select POST method
2. Enter URL: `https://your-domain.com/api/v1/vendor/products`
3. Go to Headers tab, add: `Authorization: Bearer YOUR_VENDOR_TOKEN`
4. Go to Body tab, select `form-data`
5. Add fields:
   - `title`: Paracetamol 500mg
   - `amount`: 100.50
   - `hasDiscount`: false
   - `description`: High-quality paracetamol tablets
   - `files`: Select File, choose image1.jpg
   - `files`: Select File, choose image2.png (add multiple files with same key)

---

### Update Product

**Endpoint:** `PUT /api/v1/vendor/products/:id`

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <vendor_token>
```

**Form Data Fields:**
- `title` (string, optional): Product title
- `amount` (number, optional): Product price
- `hasDiscount` (boolean, optional): Whether product has discount
- `discountPercentage` (number, optional): Discount percentage (0-100)
- `description` (string, optional): Product description
- `status` (enum: 'active' | 'inactive', optional): Product status
- `files` (array of files, optional): Product images (min 1, max 10, only jpeg, png, webp)
  - If provided, replaces all existing images

**cURL Example:**
```bash
curl -X PUT 'https://your-domain.com/api/v1/vendor/products/PRODUCT_ID' \
  -H 'Authorization: Bearer YOUR_VENDOR_TOKEN' \
  -H 'Content-Type: multipart/form-data' \
  -F 'title=Updated Product Name' \
  -F 'amount=150.00' \
  -F 'hasDiscount=true' \
  -F 'discountPercentage=15' \
  -F 'status=active' \
  -F 'files=@/path/to/new-image1.jpg' \
  -F 'files=@/path/to/new-image2.png'
```

**Update without changing images:**
```bash
curl -X PUT 'https://your-domain.com/api/v1/vendor/products/PRODUCT_ID' \
  -H 'Authorization: Bearer YOUR_VENDOR_TOKEN' \
  -H 'Content-Type: multipart/form-data' \
  -F 'title=Updated Product Name' \
  -F 'amount=150.00'
```

**JavaScript/Fetch Example:**
```javascript
const formData = new FormData();
formData.append('title', 'Updated Product Name');
formData.append('amount', '150.00');
formData.append('hasDiscount', 'true');
formData.append('discountPercentage', '15');
formData.append('status', 'active');
// Only include files if you want to replace existing images
formData.append('files', fileInput1.files[0]);
formData.append('files', fileInput2.files[0]);

fetch('https://your-domain.com/api/v1/vendor/products/PRODUCT_ID', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_VENDOR_TOKEN'
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

---

### Toggle Product Status

**Endpoint:** `PATCH /api/v1/vendor/products/:id/status`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <vendor_token>
```

**Body (JSON):**
```json
{
  "status": "active",  // optional: "active" | "inactive"
  "inventoryStatus": "inStock"  // optional: "inStock" | "outOfStock"
}
```

**Note:** At least one of `status` or `inventoryStatus` must be provided.

**cURL Example:**
```bash
curl -X PATCH 'https://your-domain.com/api/v1/vendor/products/PRODUCT_ID/status' \
  -H 'Authorization: Bearer YOUR_VENDOR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "inactive",
    "inventoryStatus": "outOfStock"
  }'
```

---

## Important Notes

1. **File Requirements:**
   - Minimum 1 image required for create
   - Maximum 10 images allowed
   - Only jpeg, png, and webp formats are accepted
   - File size limit: 10MB per file (configurable)

2. **Type Conversion:**
   - Numbers and booleans are automatically converted from strings in form-data
   - `hasDiscount` can be sent as: `true`, `false`, `"true"`, or `"false"`
   - `amount` and `discountPercentage` can be sent as numbers or strings

3. **Discount Validation:**
   - If `hasDiscount` is `true`, `discountPercentage` is required
   - `discountPercentage` must be between 0 and 100

4. **Ownership:**
   - Vendors can only create, update, or delete their own products
   - Product ownership is verified by `userId` matching the authenticated vendor

5. **File Updates:**
   - When updating files, all existing images are replaced
   - If you don't want to change images, don't include the `files` field in the update request

