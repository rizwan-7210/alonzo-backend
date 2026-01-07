# Postman Guide for Product Create/Update

## ⚠️ Important: How to Add Multiple Files in Postman

When creating or updating a product with multiple images, you **MUST** add multiple form fields all with the same key name `files`, NOT `files[0]`, `files[1]`, etc.

### ✅ Correct Way in Postman:

1. Go to **Body** tab
2. Select **form-data**
3. Add fields as follows:

| Key | Type | Value |
|-----|------|-------|
| `title` | Text | `Paracetamol 500mg` |
| `amount` | Text | `100.50` |
| `hasDiscount` | Text | `false` |
| `description` | Text | `High-quality tablets` |
| `inventoryStatus` | Text | `inStock` |
| `files` | File | Select first image file |
| `files` | File | Select second image file |
| `files` | File | Select third image file (optional) |

**Important:** Notice that all file fields use the same key name `files`. Postman will automatically handle multiple fields with the same name.

### ❌ Wrong Way (Don't Do This):

| Key | Type | Value |
|-----|------|-------|
| `files[0]` | File | ... |
| `files[1]` | File | ... |

This will NOT work because `FilesInterceptor` expects multiple fields with the same name `files`.

---

## Step-by-Step Postman Setup

### 1. Create Product Request

**Method:** `POST`  
**URL:** `http://localhost:3000/api/v1/vendor/products`

**Headers:**
- `Authorization`: `Bearer YOUR_TOKEN_HERE`

**Body (form-data):**

1. Click on **Body** tab
2. Select **form-data** radio button
3. Add the following fields:

   - **Key:** `title` | **Type:** Text | **Value:** `Paracetamol 500mg`
   - **Key:** `amount` | **Type:** Text | **Value:** `100.50`
   - **Key:** `hasDiscount` | **Type:** Text | **Value:** `false`
   - **Key:** `description` | **Type:** Text | **Value:** `High-quality paracetamol tablets`
   - **Key:** `inventoryStatus` | **Type:** Text | **Value:** `inStock`
   - **Key:** `files` | **Type:** File | **Value:** Click "Select Files" and choose image1.jpg
   - **Key:** `files` | **Type:** File | **Value:** Click "Select Files" and choose image2.png
   - (Add more `files` fields if needed, up to 10)

**Important Notes:**
- All file fields must have the same key name: `files`
- You can add up to 10 file fields
- Each file field should be of type "File"
- Text fields like `amount` and `hasDiscount` should be sent as strings (Postman will handle this)

---

## cURL Equivalent

If you prefer using cURL, here's the correct format:

```bash
curl -X POST 'http://localhost:3000/api/v1/vendor/products' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: multipart/form-data' \
  -F 'title=Paracetamol 500mg' \
  -F 'amount=100.50' \
  -F 'hasDiscount=false' \
  -F 'description=High-quality tablets' \
  -F 'inventoryStatus=inStock' \
  -F 'files=@/path/to/image1.jpg' \
  -F 'files=@/path/to/image2.png'
```

Notice: Multiple `-F 'files=@...'` flags, all with the same field name `files`.

---

## Common Issues and Solutions

### Issue 1: "title should not be empty" / "amount must be a number"

**Cause:** Form data not being parsed correctly, or fields are empty.

**Solution:**
- Make sure you're using `form-data` (not `x-www-form-urlencoded`)
- Check that all required fields have values
- Ensure `amount` is a valid number (can be sent as string "100.50")

### Issue 2: "At least 1 image is required" / "files must be an array"

**Cause:** Files not being sent correctly.

**Solution:**
- Make sure you're adding multiple fields all named `files` (not `files[0]`, `files[1]`)
- Each `files` field should be of type "File"
- Select actual image files (jpeg, png, or webp)

### Issue 3: Files not uploading

**Cause:** File size too large or wrong format.

**Solution:**
- Maximum file size: 10MB per file
- Allowed formats: jpeg, jpg, png, webp only
- Check file size and format before uploading

---

## Testing Checklist

Before sending the request, verify:

- [ ] Method is `POST`
- [ ] URL is correct: `http://localhost:3000/api/v1/vendor/products`
- [ ] Authorization header is set with valid Bearer token
- [ ] Body type is `form-data` (not raw or x-www-form-urlencoded)
- [ ] `title` field is filled
- [ ] `amount` field is filled with a number
- [ ] At least one `files` field is added (all named `files`, not `files[0]`)
- [ ] All file fields are of type "File"
- [ ] Files are valid images (jpeg, png, webp)

---

## Example Successful Request

**Request:**
```
POST http://localhost:3000/api/v1/vendor/products
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data

Form Data:
- title: "Paracetamol 500mg"
- amount: "100.50"
- hasDiscount: "false"
- description: "High-quality paracetamol tablets"
- inventoryStatus: "inStock"
- files: [image1.jpg]
- files: [image2.png]
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "...",
    "title": "Paracetamol 500mg",
    "amount": 100.5,
    "hasDiscount": false,
    "finalAmount": 100.5,
    "status": "active",
    "inventoryStatus": "inStock",
    "files": [...]
  },
  "timestamp": "2026-01-07T..."
}
```

