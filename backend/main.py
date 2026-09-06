from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine

# Models
from models.customer import Customer
from models.supplier import Supplier
from models.master import Yarn, Fabric, Product, Color, Warehouse
from models.sales import Quotation, QuotationItem, SalesOrder, SalesOrderItem
from models.purchase import (
    PurchaseOrder,
    PurchaseOrderItem,
    GoodsReceipt,
    GoodsReceiptItem,
)
from models.inventory import Inventory, StockMovement
from models.production import (
    ProductionOrder,
    ProductionItem,
    DyeingOrder,
    FinishingOrder,
)
from models.quality import QualityInspection
from models.dispatch import Dispatch, DispatchItem
from models.finance import Invoice, Payment
from models.user import User


# Routers
from routers.customers import router as customers_router
from routers.supplier import router as suppliers_router
from routers.purchase import router as purchase_router
from routers.goods_receipt import router as goods_receipt_router
from routers.master import router as master_router
from routers.inventory import router as inventory_router
from routers.production import router as production_router
from routers.sales import router as sales_router
from routers.quality import router as quality_router
from routers.dispatch import router as dispatch_router
from routers.finance import router as finance_router
from routers.assistant import router as assistant_router
from routers.report import router as report_router
from routers.auth import router as auth_router
from routers.dyeing_finishing import (
    router as dyeing_finishing_router
)



app = FastAPI(
    title="Textile ERP API"
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routers
app.include_router(customers_router)
app.include_router(suppliers_router)
app.include_router(purchase_router)
app.include_router(goods_receipt_router)
app.include_router(master_router)
app.include_router(inventory_router)
app.include_router(production_router)
app.include_router(sales_router)
app.include_router(quality_router)
app.include_router(dispatch_router)
app.include_router(finance_router)
app.include_router(assistant_router)
app.include_router(report_router)
app.include_router(auth_router)
app.include_router(dyeing_finishing_router)


# Create database tables
Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {
        "message": "Textile ERP API is running!"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }