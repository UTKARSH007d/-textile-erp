# Textile ERP System

A full-stack Textile Enterprise Resource Planning (ERP) system developed to manage and integrate key textile manufacturing and business operations in a single platform.

The system connects the business workflow from customer and sales activities through procurement, inventory, production, dyeing, finishing, quality control, dispatch, invoicing, payments, reporting, and AI-assisted business insights.

---

## 📌 Project Overview

The Textile ERP System provides a centralized web application for managing day-to-day textile business operations.

### Key capabilities

- Customer and supplier management
- Quotation and sales order management
- Purchase order management
- Goods receipt management
- Inventory and stock movement tracking
- Production management
- Dyeing and finishing processes
- Quality inspection
- Dispatch management
- Invoice and payment management
- Reports and business dashboard
- Role-Based Access Control (RBAC)
- AI-powered ERP data assistance and business insights

The modules are integrated so that important business activities can automatically update related records and inventory.

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
```

---

## 🚀 Main Features

### 1. Dashboard

Provides an overview of important ERP information including:

- Production orders
- Available inventory
- Low-stock items
- Pending dispatches
- Business activity

Dashboard information is retrieved from backend APIs and reflects current ERP data.

---

### 2. Customer Management

Manage customer information and customer-related business activities.

Features include:

- Create customers
- View customers
- Update customer information
- Manage customer status

---

### 3. Supplier Management

Manage suppliers used for procurement and material purchasing.

---

### 4. Sales & Quotations

Manage the sales process starting from quotations.

Features include:

- Create quotations
- Manage quotation status
- Create sales orders
- Link sales orders to existing quotations
- Manage products and quantities
- Calculate order values

---

### 5. Purchase Management

Manage procurement activities required for textile production.

Features include:

- Purchase orders
- Supplier selection
- Material quantities
- Purchase values
- Purchase order status

---

### 6. Goods Receipt

Record materials received against purchase orders.

Goods receipts are integrated with inventory so received quantities can automatically increase available stock and create corresponding stock movements.

---

### 7. Inventory Management

Centralized inventory management across warehouses.

The system supports:

- Product inventory
- Yarn inventory
- Fabric inventory
- Warehouse management
- Stock quantities
- Stock movements
- Reorder levels
- Inventory history

Inventory movements are recorded for important business transactions such as goods receipts, production output, quality rejection, and dispatch.

---

### 8. Production Management

Production orders follow the workflow:

```text
Planned → In Progress → Completed
```

When a production order is completed:

- Produced quantity is recorded
- Finished goods inventory is updated
- A Production Output stock movement is created

---

### 9. Dyeing & Finishing

Manage textile processing operations after production.

The system supports:

- Input quantity
- Output quantity
- Rejected quantity
- Color
- Shade
- Dye lot
- Finishing type
- Operator information
- Process status

The workflow is integrated so that completion of one processing stage can create the next required stage.

---

### 10. Quality Management

Quality inspections are performed on processed and finished goods.

The quality module records:

- Inspection number
- Production order
- Inspected quantity
- Passed quantity
- Rejected quantity
- Result
- Defect type
- Inspector
- Remarks

Supported inspection results include:

```text
Pending
Passed
Failed
Partially Passed
```

Quality results are integrated with inventory.

Passed quantities are recorded as approved quantities, while rejected quantities reduce available inventory and create a Quality Rejection stock movement.

---

### 11. Dispatch Management

Manage the delivery of finished goods to customers.

Features include:

- Dispatch orders
- Dispatch items
- Customer
- Quantity
- Transporter
- Vehicle number
- Tracking number
- Dispatch status

Supported statuses:

```text
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

- Invoice number
- Customer
- Sales order
- Invoice date
- Due date
- Subtotal
- Tax
- Total amount
- Payment status

Invoice payment status is represented as:

```text
Unpaid
Partial
Paid
```

---

### 13. Payment Management

Record customer payments against invoices.

The system tracks:

- Payment number
- Invoice
- Customer
- Payment date
- Amount
- Payment method
- Reference number
- Remarks

Invoice payment status is automatically determined based on the amount paid.

---

## 📊 Reports

The ERP includes backend reporting APIs and a frontend reporting dashboard.

Reports cover areas such as:

- Sales
- Purchases
- Inventory
- Production
- Quality
- Dispatch
- Finance
- Goods Receipts
- Processing
- Stock Movements
- Customers

---

## 🤖 AI Assistant

The system includes an AI Assistant that can answer questions using ERP data provided by the backend.

Example questions include:

```text
How much Product #1 is currently in stock?

What quantity was produced in the latest completed production order?

What is the outstanding amount across all invoices?

What are the details of invoice INV-003?
```

The backend prepares relevant ERP information as structured data and provides it to the AI model as context.

The AI system is designed to use the provided ERP data as the source of truth when answering business questions.

### AI Capabilities

- Inventory queries
- Production queries
- Invoice queries
- Payment and outstanding amount queries
- ERP information lookup
- Business insights

---

## 🔐 Role-Based Access Control

The application implements Role-Based Access Control (RBAC) using authenticated user roles.

### Admin

Full system access, including:

- ERP modules
- Reports
- Finance
- AI Assistant
- User management
- Role management

### Manager

Access to major operational and management functions, including:

- Sales
- Purchase
- Inventory
- Production
- Dyeing & Finishing
- Quality
- Dispatch
- Finance
- Reports
- AI Assistant

User management is restricted to Admin.

### Employee

Limited operational access including:

- Dashboard
- Inventory
- Production
- Dyeing & Finishing
- Quality
- Dispatch
- AI Assistant

Restricted areas include:

- Sales
- Purchase
- Finance
- Reports
- User management

---

## 🏗️ System Architecture

```text
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

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- Pydantic
- JWT Authentication
- Google Gemini API

### Frontend

- Next.js
- React
- JavaScript / TypeScript
- Tailwind CSS
- Lucide React

### Development & Testing

- Git
- GitHub
- Swagger / OpenAPI
- REST APIs

---

## 📂 Project Structure

```text
textile-erp/
│
├── backend/
│   ├── models/
│   ├── routers/
│   ├── auth.py
│   ├── database.py
│   ├── permissions.py
│   ├── create_admin.py
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── assistant/
│   │   ├── customers/
│   │   ├── dispatch/
│   │   ├── dyeing-finishing/
│   │   ├── goods-receipts/
│   │   ├── inventory/
│   │   ├── invoices/
│   │   ├── login/
│   │   ├── master/
│   │   ├── payments/
│   │   ├── production/
│   │   ├── purchase-orders/
│   │   ├── quality/
│   │   ├── report/
│   │   ├── sales/
│   │   └── suppliers/
│   │
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
├── package-lock.json
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites

Make sure the following are installed:

- Python 3.10+
- Node.js
- npm
- PostgreSQL
- Git

---

### 1. Clone the Repository

```bash
git clone https://github.com/UTKARSH007d/-textile-erp.git
cd -textile-erp
```

---

### 2. Backend Setup

Navigate to the backend:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
venv\Scripts\activate
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

---

### 3. Configure Environment Variables

Create a `.env` file inside the `backend` directory.

Use `.env.example` as the template.

Example:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/textile_erp
GEMINI_API_KEY=your_gemini_api_key
SECRET_KEY=your_secret_key

ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_this_password
```

Do not commit `.env` to GitHub.

---

### 4. Start the Backend

From the `backend` directory:

```bash
uvicorn main:app --reload
```

Backend server:

```text
http://127.0.0.1:8000
```

Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

---

### 5. Frontend Setup

Open another terminal and navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Frontend:

```text
http://localhost:3000
```

---

## 🧪 API Testing

The backend APIs can be tested using FastAPI Swagger/OpenAPI documentation.

Open:

```text
http://127.0.0.1:8000/docs
```

Authentication uses JWT bearer tokens.

After logging in, the generated token can be entered through Swagger's **Authorize** option to test protected endpoints according to the user's role.

---

## 🔗 ERP Module Integration

### Purchase → Goods Receipt → Inventory

```text
Purchase Order
      ↓
Goods Receipt
      ↓
Inventory Increase
      ↓
Stock Movement
```

### Production → Finished Goods

```text
Production Completed
      ↓
Produced Quantity
      ↓
Finished Goods Inventory
      ↓
Production Output Movement
```

### Dyeing → Finishing → Quality

```text
Dyeing Completed
      ↓
Finishing
      ↓
Quality Inspection
```

### Quality → Inventory

```text
Quality Inspection
      ↓
Passed Quantity ──→ Approved Quantity
      ↓
Rejected Quantity ─→ Inventory Reduction
```

### Dispatch → Inventory

```text
Dispatch
   ↓
Inventory Reduction
   ↓
Dispatch Out Movement
```

### Invoice → Payment

```text
Invoice
   ↓
Payment
   ↓
Paid / Partial / Unpaid
   ↓
Outstanding Balance
```

---

## 🎯 Project Objectives

The main objectives of the Textile ERP System are:

1. Centralize textile business operations.
2. Integrate sales, purchasing, inventory, production, processing, and finance.
3. Track stock movements across business processes.
4. Improve business visibility through dashboards and reports.
5. Implement secure role-based access.
6. Reduce manual tracking of production and inventory.
7. Provide AI-assisted access to ERP business information.
8. Demonstrate a connected end-to-end textile ERP workflow.

---

## 📌 Project Status

The project currently includes:

- Core ERP modules
- Integrated inventory workflow
- Production workflow
- Dyeing and finishing workflow
- Quality management
- Dispatch management
- Finance and payments
- Reporting
- JWT authentication
- Role-Based Access Control
- AI Assistant
- Next.js frontend
- FastAPI backend
- PostgreSQL database integration

This project was developed as an internship project to demonstrate full-stack development, database integration, ERP business workflow design, authentication, authorization, reporting, and AI integration.

---

## 🔒 Security

Sensitive configuration should never be committed to the repository.

The following should remain in `.env`:

- Database credentials
- Gemini API key
- Secret key
- Admin credentials

The repository uses `.gitignore` to prevent local environment files and development dependencies from being committed.

---

## 📜 License

This project was developed as an internship project and is intended primarily for educational, demonstration, and portfolio purposes.
