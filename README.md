# Textile ERP System

A full-stack Textile Enterprise Resource Planning (ERP) system developed to manage and integrate key textile manufacturing and business operations in a single platform.

The system connects the complete business workflow from customer and sales activities through procurement, inventory, production, processing, quality control, dispatch, invoicing, payments, reporting, and AI-assisted business insights.

---

## 📌 Project Overview

The Textile ERP System is designed for textile manufacturing businesses to manage their day-to-day operations through a centralized web application.

The system provides:

- Sales and quotation management
- Customer and supplier management
- Purchase order management
- Goods receipt and inventory management
- Production management
- Dyeing and finishing processes
- Quality inspection
- Dispatch management
- Invoice and payment management
- Reports and business dashboards
- Role-Based Access Control (RBAC)
- AI-powered ERP data assistance and business insights

The application follows a connected ERP workflow rather than treating each module as an independent CRUD system.

---

## 🔄 Business Workflow

```text
Customer
   ↓
Quotation
   ↓
Sales Order
   ↓
Material Requirement
   ↓
Purchase
   ↓
Goods Receipt
   ↓
Inventory
   ↓
Production
   ↓
Dyeing
   ↓
Finishing
   ↓
Quality Inspection
   ↓
Finished Goods
   ↓
Dispatch
   ↓
Invoice
   ↓
Payment
   ↓
AI Business Insights

## 🚀 Main Features

### 1. Dashboard

Provides an overview of important ERP information including:

-  Production orders 
-  Available inventory 
-  Low-stock items 
-  Pending dispatches 
-  Business activity 

Dashboard information is retrieved from the backend rather than relying only on static values.

---

### 2. Customer Management

Manage customer information and customer-related business transactions.

Features include:

-  Create customers 
-  View customers 
-  Update customer information 
-  Manage customer status 

---

### 3. Supplier Management

Manage suppliers used for procurement and material purchasing.

---

### 4. Sales & Quotations

Manage the sales process starting from quotations.

Features include:

-  Create quotations 
-  Manage quotation status 
-  Create sales orders 
-  Link sales orders to existing quotations 
-  Manage products and quantities 
-  Calculate order values 

---

### 5. Purchase Management

Manage procurement activities required for textile production.

Features include:

-  Purchase orders 
-  Supplier selection 
-  Material quantities 
-  Purchase values 
-  Purchase order status 

---

### 6. Goods Receipt

Record materials received against purchase orders.

Goods Receipt is integrated with inventory so that received quantities can automatically affect available stock.

---

### 7. Inventory Management

Centralized inventory management across warehouses.

The system supports:

-  Product inventory 
-  Yarn inventory 
-  Fabric inventory 
-  Warehouse management 
-  Stock quantities 
-  Stock movements 
-  Reorder levels 
-  Inventory history 

Inventory movements are recorded for important business transactions.

---

### 8. Production Management

Manage production orders through a production workflow:

```
```

```
Planned → In Progress → Completed
```

When a production order is completed:

-  Produced quantity is recorded 
-  Finished goods inventory is updated 
-  A Production Output stock movement is created 

---

### 9. Dyeing & Finishing

Manage textile processing operations after production.

Dyeing and finishing support:

-  Input quantity 
-  Output quantity 
-  Rejected quantity 
-  Color 
-  Shade 
-  Dye lot 
-  Finishing type 
-  Operators 
-  Process status 

The workflow is integrated so that completion of one processing stage can create the next required stage.

---

### 10. Quality Management

Quality inspections are performed on processed/finished goods.

The quality module records:

-  Inspection number 
-  Production order 
-  Inspected quantity 
-  Passed quantity 
-  Rejected quantity 
-  Result 
-  Defect type 
-  Inspector 
-  Remarks 

Supported results include:

```
```

```
Pending
Passed
Failed
Partially Passed
```

Quality results are integrated with inventory.

Passed quantities are recorded as approved stock, while rejected quantities are removed from available inventory and recorded as quality rejection movements.

---

### 11. Dispatch Management

Manage delivery of finished goods to customers.

Features include:

-  Dispatch orders 
-  Dispatch items 
-  Customer 
-  Quantity 
-  Transporter 
-  Vehicle number 
-  Tracking number 
-  Dispatch status 

Supported statuses:

```
```

```
Pending
Dispatched
Delivered
Cancelled
```

When a dispatch is processed, the corresponding inventory quantity is reduced and a Dispatch Out stock movement is created.

---

### 12. Invoice Management

Manage customer invoices and their financial status.

Invoice information includes:

-  Invoice number 
-  Customer 
-  Sales order 
-  Invoice date 
-  Due date 
-  Subtotal 
-  Tax 
-  Total amount 
-  Payment status 

Invoice status is based on payments:

```
```

```
Unpaid
Partial
Paid
```

---

### 13. Payment Management

Record customer payments against invoices.

The system tracks:

-  Payment number 
-  Invoice 
-  Customer 
-  Payment date 
-  Amount 
-  Payment method 
-  Reference number 
-  Remarks 

Invoice payment status is automatically determined from the total amount paid.

---

### 14. Reports

The ERP includes reporting endpoints and a frontend reporting dashboard.

Reports cover areas such as:

-  Sales 
-  Purchases 
-  Inventory 
-  Production 
-  Quality 
-  Dispatch 
-  Finance 
-  Goods Receipts 
-  Processing 
-  Stock Movements 
-  Customers 

---

## 🤖 AI Assistant

The system includes an AI Assistant that can answer questions using ERP data provided by the backend.

Examples:

```
```

```
How much Product #1 is currently in stock?

What quantity was produced in the latest completed production order?

What is the outstanding amount across all invoices?

What are the details of invoice INV-003?
```

The backend prepares relevant ERP data and provides it to the AI model as structured context.

The AI system is designed to use the ERP data as the source of truth when answering business questions.

### AI Capabilities

-  Inventory queries 
-  Production queries 
-  Invoice queries 
-  Payment and outstanding amount queries 
-  Business information lookup 
-  ERP business insights 

---

## 🔐 Role-Based Access Control

The application implements Role-Based Access Control (RBAC).

### Admin

Full system access, including:

-  ERP modules 
-  Reports 
-  Finance 
-  AI Assistant 
-  User management 
-  Role management 

### Manager

Access to major operational and management functions, including:

-  Sales 
-  Purchase 
-  Inventory 
-  Production 
-  Dyeing & Finishing 
-  Quality 
-  Dispatch 
-  Finance 
-  Reports 
-  AI Assistant 

User management remains restricted to Admin.

### Employee

Limited operational access including:

-  Dashboard 
-  Inventory 
-  Production 
-  Dyeing & Finishing 
-  Quality 
-  Dispatch 
-  AI Assistant 

Restricted modules include:

-  Sales 
-  Purchase 
-  Finance 
-  Reports 
-  User management 

---

## 🏗️ System Architecture

```
```

```
┌───────────────────────────────┐
│        Next.js Frontend       │
│       React + Tailwind CSS    │
└───────────────┬───────────────┘
                │
                │ REST API
                ↓
┌───────────────────────────────┐
│         FastAPI Backend       │
│                               │
│  Authentication + RBAC        │
│  ERP Business Logic           │
│  AI Assistant                 │
│  Reports                      │
└───────────────┬───────────────┘
                │
                ↓
┌───────────────────────────────┐
│          PostgreSQL           │
│        Relational Data        │
└───────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Backend

-  Python 
-  FastAPI 
-  SQLAlchemy 
-  PostgreSQL 
-  Pydantic 
-  JWT Authentication 
-  Google Gemini API 

### Frontend

-  Next.js 
-  React 
-  JavaScript / TypeScript 
-  Tailwind CSS 
-  Lucide React 

### Development & Testing

-  Git 
-  GitHub 
-  Swagger / OpenAPI 
-  REST APIs 
