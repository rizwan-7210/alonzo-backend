# Product Module Documentation

## Overview

The Product module provides full CRUD operations for vendors to manage their products, and read-only access for users to view products. Products support discount functionality and status management.

## Database Schema

The `products` collection has the following structure:

- **id**: Primary key (MongoDB ObjectId)
- **userId**: Required, foreign key to users (ObjectId reference)
- **title**: Required, product title
- **amount**: Required, product price (numeric, min: 0)
- **hasDiscount**: Boolean, optional (default: false)
- **discountPercentage**: Numeric, optional (0-100)
- **status**: Enum ('active', 'inactive'), default 'active'
- **createdAt**: Timestamp (auto-generated)
- **updatedAt**: Timestamp (auto-generated)

## Installation & Setup

### 1. Run Migration

To create the products collection and indexes:

```bash
npm run migration:create-products
```

### 2. Module Structure

The Product module is already integrated into the application:
- Schema: `src/shared/schemas/product.schema.ts`
- Repository: `src/shared/repositories/product.repository.ts`
- Service: `src/modules/product/services/product.service.ts`
- Controllers: 
  - `src/modules/product/controllers/vendor-product.controller.ts`
  - `src/modules/product/controllers/user-product.controller.ts`
- DTOs: `src/modules/product/dto/`

## API Endpoints

### Vendor Endpoints (Full CRUD)

All vendor endpoints require authentication and vendor role.

**Base URL:** `/api/v1/vendor/products`

#### 1. Create Product
```http
POST /api/v1/vendor/products
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "title": "Paracetamol 500mg",
  "amount": 100.50,
  "hasDiscount": false,
  "discountPercentage": null
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "...",
    "userId": "...",
    "title": "Paracetamol 500mg",
    "amount": 100.50,
    "hasDiscount": false,
    "discountPercentage": null,
    "finalAmount": 100.50,
    "status": "active",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "timestamp": "..."
}
```

#### 2. Get Vendor Products (List)
```http
GET /api/v1/vendor/products?page=1&limit=10&status=active
Authorization: Bearer <vendor_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status ('active' | 'inactive')

**Response:**
```json
{
  "success": true,
  "message": null,
  "data": {
    "data": [...],
    "meta": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "timestamp": "..."
}
```

#### 3. Get Product by ID
```http
GET /api/v1/vendor/products/:id
Authorization: Bearer <vendor_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "id": "...",
    "userId": "...",
    "title": "Paracetamol 500mg",
    "amount": 100.50,
    "hasDiscount": true,
    "discountPercentage": 10,
    "finalAmount": 90.45,
    "status": "active",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "timestamp": "..."
}
```

#### 4. Update Product
```http
PUT /api/v1/vendor/products/:id
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "title": "Updated Product Name",
  "amount": 120.00,
  "hasDiscount": true,
  "discountPercentage": 15,
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {...},
  "timestamp": "..."
}
```

#### 5. Delete Product
```http
DELETE /api/v1/vendor/products/:id
Authorization: Bearer <vendor_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully",
  "data": null,
  "timestamp": "..."
}
```

### User Endpoints (Read-Only)

All user endpoints require authentication and user role.

**Base URL:** `/api/v1/user/products`

#### 1. Get Active Products (List)
```http
GET /api/v1/user/products?page=1&limit=10
Authorization: Bearer <user_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "data": [...],
    "meta": {...}
  },
  "timestamp": "..."
}
```

#### 2. Get Product Details
```http
GET /api/v1/user/products/:id
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {...},
  "timestamp": "..."
}
```

## Authorization

### Vendor Access
- **Full CRUD**: Create, Read, Update, Delete
- **Ownership Check**: Vendors can only modify their own products
- **Role Required**: `VENDOR`

### User Access
- **Read-Only**: List and view product details
- **Active Products Only**: Users can only see products with `status: 'active'`
- **Role Required**: `USER`

## Validation Rules

### Create Product
- `title`: Required, string, trimmed
- `amount`: Required, number, min: 0
- `hasDiscount`: Optional, boolean
- `discountPercentage`: Optional, number (0-100)
  - Required if `hasDiscount` is true
  - Must be null/undefined if `hasDiscount` is false

### Update Product
- All fields are optional
- Same validation rules as create
- `status`: Optional, enum ('active' | 'inactive')

## Discount Logic

When `hasDiscount` is `true` and `discountPercentage` is provided:
- `finalAmount = amount - (amount * discountPercentage / 100)`
- The `finalAmount` is calculated and included in the response

## Error Responses

### 404 Not Found
```json
{
  "success": false,
  "message": "Product not found",
  "data": {
    "error": "Not Found",
    "statusCode": 404,
    "path": "/api/v1/vendor/products/..."
  },
  "timestamp": "..."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You do not have permission to access this product",
  "data": {
    "error": "Forbidden",
    "statusCode": 403,
    "path": "/api/v1/vendor/products/..."
  },
  "timestamp": "..."
}
```

### 400 Bad Request
```json
{
  "success": false,
  "message": "Discount percentage is required when hasDiscount is true",
  "data": {
    "error": "Bad Request",
    "statusCode": 400,
    "path": "/api/v1/vendor/products"
  },
  "timestamp": "..."
}
```

## Testing

### Using cURL

**Create Product:**
```bash
curl -X POST http://localhost:3000/api/v1/vendor/products \
  -H "Authorization: Bearer <vendor_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Paracetamol 500mg",
    "amount": 100.50,
    "hasDiscount": true,
    "discountPercentage": 10
  }'
```

**Get Products:**
```bash
curl -X GET "http://localhost:3000/api/v1/vendor/products?page=1&limit=10" \
  -H "Authorization: Bearer <vendor_token>"
```

**Update Product:**
```bash
curl -X PUT http://localhost:3000/api/v1/vendor/products/<product_id> \
  -H "Authorization: Bearer <vendor_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Product",
    "amount": 120.00
  }'
```

**Delete Product:**
```bash
curl -X DELETE http://localhost:3000/api/v1/vendor/products/<product_id> \
  -H "Authorization: Bearer <vendor_token>"
```

## Indexes

The following indexes are created automatically:
- `userId`: For filtering products by vendor
- `status`: For filtering by status
- `createdAt`: For sorting by creation date
- `title_text`: For text search on product titles

## Notes

1. **Ownership**: Vendors can only access/modify their own products
2. **Status**: Only active products are visible to users
3. **Discount**: Discount percentage must be between 0-100
4. **Final Amount**: Automatically calculated when discount is applied
5. **Pagination**: All list endpoints support pagination
6. **Response Format**: All responses follow the standard format: `{ success, message, data, timestamp }`

