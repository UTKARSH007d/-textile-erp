from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal

from models.customer import Customer
from models.supplier import Supplier

from models.master import (
    Yarn,
    Fabric,
    Product,
    Color,
    Warehouse,
)

from models.sales import (
    Quotation,
    SalesOrder,
)

from models.purchase import (
    PurchaseOrder,
    GoodsReceipt,
    GoodsReceiptItem,
)

from models.inventory import (
    Inventory,
    StockMovement,
)

from models.production import (
    ProductionOrder,
    ProductionItem,
    DyeingOrder,
    FinishingOrder,
)

from models.quality import QualityInspection

from models.dispatch import (
    Dispatch,
    DispatchItem,
)

from models.finance import (
    Invoice,
    Payment,
)

from models.user import User
from auth import get_current_user


# =========================================================
# ROLE ACCESS
# =========================================================

def require_reports_access(
    current_user: User = Depends(get_current_user)
):
    """
    Reports are available to Admin and Manager users only.
    Employees must not access reporting endpoints.
    """
    role = (current_user.role or "").lower()

    if role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=403,
            detail="Manager or Admin access required."
        )

    return current_user


router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"],
    dependencies=[Depends(require_reports_access)],
)


# =========================================================
# DATABASE
# =========================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# =========================================================
# HELPERS
# =========================================================

def safe_float(value):
    return float(value or 0)


def calculate_percentage(value, total):
    if not total:
        return 0

    return round((value / total) * 100, 2)


def date_to_string(value):
    if value is None:
        return None

    if isinstance(value, (date, datetime)):
        return value.isoformat()

    return str(value)


# =========================================================
# OVERALL SUMMARY
# =========================================================

@router.get("/summary")
def get_reports_summary(
    db: Session = Depends(get_db)
):
    # -----------------------------------------------------
    # COUNTS
    # -----------------------------------------------------

    total_customers = db.query(Customer).count()
    active_customers = (
        db.query(Customer)
        .filter(Customer.status == True)
        .count()
    )

    total_suppliers = db.query(Supplier).count()

    total_quotations = db.query(Quotation).count()
    total_sales_orders = db.query(SalesOrder).count()

    total_purchase_orders = db.query(PurchaseOrder).count()
    total_goods_receipts = db.query(GoodsReceipt).count()

    total_production_orders = db.query(
        ProductionOrder
    ).count()

    total_dyeing_orders = db.query(
        DyeingOrder
    ).count()

    total_finishing_orders = db.query(
        FinishingOrder
    ).count()

    total_quality_inspections = db.query(
        QualityInspection
    ).count()

    total_dispatches = db.query(Dispatch).count()

    total_invoices = db.query(Invoice).count()
    total_payments = db.query(Payment).count()

    # -----------------------------------------------------
    # SALES
    # -----------------------------------------------------

    sales_orders = (
        db.query(SalesOrder)
        .order_by(SalesOrder.id.desc())
        .all()
    )

    total_sales_value = sum(
        safe_float(order.total_amount)
        for order in sales_orders
    )

    pending_sales_orders = sum(
        1
        for order in sales_orders
        if str(order.status).lower() == "pending"
    )

    completed_sales_orders = sum(
        1
        for order in sales_orders
        if str(order.status).lower()
        in ["completed", "delivered"]
    )

    # -----------------------------------------------------
    # PURCHASE
    # -----------------------------------------------------

    purchase_orders = (
        db.query(PurchaseOrder)
        .order_by(PurchaseOrder.id.desc())
        .all()
    )

    total_purchase_value = sum(
        safe_float(order.total_amount)
        for order in purchase_orders
    )

    pending_purchase_orders = sum(
        1
        for order in purchase_orders
        if str(order.status).lower() == "pending"
    )

    completed_purchase_orders = sum(
        1
        for order in purchase_orders
        if str(order.status).lower()
        in ["completed", "received", "closed"]
    )

    # -----------------------------------------------------
    # INVENTORY
    # -----------------------------------------------------

    inventory_records = (
        db.query(Inventory)
        .order_by(Inventory.id.desc())
        .all()
    )

    total_stock_quantity = sum(
        safe_float(item.quantity)
        for item in inventory_records
    )

    total_reserved_quantity = sum(
        safe_float(item.reserved_quantity)
        for item in inventory_records
    )

    low_stock_items = []

    for item in inventory_records:

        available_quantity = (
            safe_float(item.quantity)
            - safe_float(item.reserved_quantity)
        )

        reorder_level = safe_float(
            item.reorder_level
        )

        if available_quantity <= reorder_level:

            low_stock_items.append({
                "inventory_id": item.id,
                "yarn_id": item.yarn_id,
                "fabric_id": item.fabric_id,
                "product_id": item.product_id,
                "warehouse_id": item.warehouse_id,
                "quantity": safe_float(item.quantity),
                "reserved_quantity": safe_float(
                    item.reserved_quantity
                ),
                "available_quantity": available_quantity,
                "reorder_level": reorder_level,
                "unit": item.unit,
            })

    # -----------------------------------------------------
    # PRODUCTION
    # -----------------------------------------------------

    production_orders = (
        db.query(ProductionOrder)
        .order_by(ProductionOrder.id.desc())
        .all()
    )

    planned_production_quantity = sum(
        safe_float(order.planned_quantity)
        for order in production_orders
    )

    produced_quantity = sum(
        safe_float(order.produced_quantity)
        for order in production_orders
    )

    planned_production_orders = sum(
        1
        for order in production_orders
        if order.status == "Planned"
    )

    in_progress_production_orders = sum(
        1
        for order in production_orders
        if order.status == "In Progress"
    )

    completed_production_orders = sum(
        1
        for order in production_orders
        if order.status == "Completed"
    )

    production_completion_rate = calculate_percentage(
        completed_production_orders,
        total_production_orders,
    )

    production_quantity_completion_rate = calculate_percentage(
        produced_quantity,
        planned_production_quantity,
    )

    # -----------------------------------------------------
    # QUALITY
    # -----------------------------------------------------

    inspections = (
        db.query(QualityInspection)
        .order_by(QualityInspection.id.desc())
        .all()
    )

    total_inspected_quantity = sum(
        safe_float(item.inspected_quantity)
        for item in inspections
    )

    total_passed_quantity = sum(
        safe_float(item.passed_quantity)
        for item in inspections
    )

    total_rejected_quantity = sum(
        safe_float(item.rejected_quantity)
        for item in inspections
    )

    quality_pass_rate = calculate_percentage(
        total_passed_quantity,
        total_inspected_quantity,
    )

    quality_rejection_rate = calculate_percentage(
        total_rejected_quantity,
        total_inspected_quantity,
    )

    # -----------------------------------------------------
    # DISPATCH
    # -----------------------------------------------------

    dispatches = (
        db.query(Dispatch)
        .order_by(Dispatch.id.desc())
        .all()
    )

    pending_dispatches = sum(
        1
        for dispatch in dispatches
        if str(dispatch.status).lower() == "pending"
    )

    delivered_dispatches = sum(
        1
        for dispatch in dispatches
        if str(dispatch.status).lower() == "delivered"
    )

    dispatched_status_count = sum(
        1
        for dispatch in dispatches
        if str(dispatch.status).lower() == "dispatched"
    )

    dispatch_items = (
        db.query(DispatchItem)
        .all()
    )

    total_dispatch_quantity = sum(
        safe_float(item.quantity)
        for item in dispatch_items
    )

    # -----------------------------------------------------
    # FINANCE
    # -----------------------------------------------------

    invoices = (
        db.query(Invoice)
        .order_by(Invoice.id.desc())
        .all()
    )

    payments = (
        db.query(Payment)
        .order_by(Payment.id.desc())
        .all()
    )

    total_invoice_value = sum(
        safe_float(invoice.total_amount)
        for invoice in invoices
    )

    total_payment_received = sum(
        safe_float(payment.amount)
        for payment in payments
    )

    total_outstanding = max(
        total_invoice_value - total_payment_received,
        0,
    )

    paid_invoices = 0
    partial_invoices = 0
    unpaid_invoices = 0

    overdue_invoices = 0

    today = date.today()

    for invoice in invoices:

        invoice_total = safe_float(
            invoice.total_amount
        )

        invoice_paid = sum(
            safe_float(payment.amount)
            for payment in payments
            if payment.invoice_id == invoice.id
        )

        if invoice_paid >= invoice_total and invoice_total > 0:
            paid_invoices += 1

        elif invoice_paid > 0:
            partial_invoices += 1

        else:
            unpaid_invoices += 1

        if (
            invoice.due_date
            and invoice.due_date < today
            and invoice_paid < invoice_total
        ):
            overdue_invoices += 1

    # -----------------------------------------------------
    # RETURN SUMMARY
    # -----------------------------------------------------

    return {
        "generated_at": datetime.now().isoformat(),

        "customers": {
            "total": total_customers,
            "active": active_customers,
            "inactive": (
                total_customers - active_customers
            ),
        },

        "suppliers": {
            "total": total_suppliers,
        },

        "sales": {
            "total_quotations": total_quotations,
            "total_orders": total_sales_orders,
            "total_value": round(
                total_sales_value,
                2,
            ),
            "pending_orders": pending_sales_orders,
            "completed_orders": completed_sales_orders,
        },

        "purchases": {
            "total_orders": total_purchase_orders,
            "total_value": round(
                total_purchase_value,
                2,
            ),
            "pending_orders": pending_purchase_orders,
            "completed_orders": completed_purchase_orders,
        },

        "goods_receipts": {
            "total": total_goods_receipts,
        },

        "inventory": {
            "total_records": len(inventory_records),
            "total_stock_quantity": round(
                total_stock_quantity,
                2,
            ),
            "total_reserved_quantity": round(
                total_reserved_quantity,
                2,
            ),
            "available_quantity": round(
                total_stock_quantity
                - total_reserved_quantity,
                2,
            ),
            "low_stock_count": len(
                low_stock_items
            ),
        },

        "production": {
            "total_orders": total_production_orders,
            "planned_orders": planned_production_orders,
            "in_progress_orders": (
                in_progress_production_orders
            ),
            "completed_orders": (
                completed_production_orders
            ),
            "planned_quantity": round(
                planned_production_quantity,
                2,
            ),
            "produced_quantity": round(
                produced_quantity,
                2,
            ),
            "completion_rate": production_completion_rate,
            "quantity_completion_rate": (
                production_quantity_completion_rate
            ),
        },

        "processing": {
            "dyeing_orders": total_dyeing_orders,
            "finishing_orders": total_finishing_orders,
        },

        "quality": {
            "total_inspections": (
                total_quality_inspections
            ),
            "inspected_quantity": round(
                total_inspected_quantity,
                2,
            ),
            "passed_quantity": round(
                total_passed_quantity,
                2,
            ),
            "rejected_quantity": round(
                total_rejected_quantity,
                2,
            ),
            "pass_rate": quality_pass_rate,
            "rejection_rate": quality_rejection_rate,
        },

        "dispatch": {
            "total": total_dispatches,
            "pending": pending_dispatches,
            "dispatched": dispatched_status_count,
            "delivered": delivered_dispatches,
            "total_quantity": round(
                total_dispatch_quantity,
                2,
            ),
        },

        "finance": {
            "total_invoices": total_invoices,
            "total_invoice_value": round(
                total_invoice_value,
                2,
            ),
            "total_payments": total_payments,
            "total_payment_received": round(
                total_payment_received,
                2,
            ),
            "total_outstanding": round(
                total_outstanding,
                2,
            ),
            "paid_invoices": paid_invoices,
            "partial_invoices": partial_invoices,
            "unpaid_invoices": unpaid_invoices,
            "overdue_invoices": overdue_invoices,
        },
    }


# =========================================================
# SALES REPORT
# =========================================================

@router.get("/sales")
def get_sales_report(
    db: Session = Depends(get_db)
):
    orders = (
        db.query(SalesOrder)
        .order_by(SalesOrder.id.desc())
        .all()
    )

    customers = {
        customer.id: customer.name
        for customer in db.query(Customer).all()
    }

    status_summary = {}

    customer_summary = {}

    total_value = 0

    for order in orders:

        value = safe_float(order.total_amount)

        total_value += value

        status = order.status or "Unknown"

        status_summary[status] = (
            status_summary.get(status, 0) + 1
        )

        customer_name = customers.get(
            order.customer_id,
            f"Customer #{order.customer_id}",
        )

        if customer_name not in customer_summary:
            customer_summary[customer_name] = {
                "customer_id": order.customer_id,
                "order_count": 0,
                "total_value": 0,
            }

        customer_summary[customer_name][
            "order_count"
        ] += 1

        customer_summary[customer_name][
            "total_value"
        ] += value

    return {
        "total_orders": len(orders),
        "total_sales_value": round(
            total_value,
            2,
        ),
        "status_summary": [
            {
                "status": status,
                "count": count,
            }
            for status, count in status_summary.items()
        ],
        "customer_summary": [
            {
                **data,
                "total_value": round(
                    data["total_value"],
                    2,
                ),
            }
            for data in customer_summary.values()
        ],
        "recent_orders": [
            {
                "id": order.id,
                "sales_order_no": order.sales_order_no,
                "customer_id": order.customer_id,
                "customer_name": customers.get(
                    order.customer_id,
                    f"Customer #{order.customer_id}",
                ),
                "order_date": date_to_string(
                    order.order_date
                ),
                "delivery_date": date_to_string(
                    order.delivery_date
                ),
                "status": order.status,
                "total_amount": safe_float(
                    order.total_amount
                ),
            }
            for order in orders[:10]
        ],
    }


# =========================================================
# PURCHASE REPORT
# =========================================================

@router.get("/purchases")
def get_purchase_report(
    db: Session = Depends(get_db)
):
    orders = (
        db.query(PurchaseOrder)
        .order_by(PurchaseOrder.id.desc())
        .all()
    )

    suppliers = {
        supplier.id: supplier.name
        for supplier in db.query(Supplier).all()
    }

    total_value = 0

    supplier_summary = {}

    status_summary = {}

    for order in orders:

        value = safe_float(order.total_amount)

        total_value += value

        status = order.status or "Unknown"

        status_summary[status] = (
            status_summary.get(status, 0) + 1
        )

        supplier_name = suppliers.get(
            order.supplier_id,
            f"Supplier #{order.supplier_id}",
        )

        if supplier_name not in supplier_summary:
            supplier_summary[supplier_name] = {
                "supplier_id": order.supplier_id,
                "order_count": 0,
                "total_value": 0,
            }

        supplier_summary[supplier_name][
            "order_count"
        ] += 1

        supplier_summary[supplier_name][
            "total_value"
        ] += value

    return {
        "total_orders": len(orders),
        "total_purchase_value": round(
            total_value,
            2,
        ),
        "status_summary": [
            {
                "status": status,
                "count": count,
            }
            for status, count in status_summary.items()
        ],
        "supplier_summary": [
            {
                **data,
                "total_value": round(
                    data["total_value"],
                    2,
                ),
            }
            for data in supplier_summary.values()
        ],
        "recent_orders": [
            {
                "id": order.id,
                "purchase_order_no": (
                    order.purchase_order_no
                ),
                "supplier_id": order.supplier_id,
                "supplier_name": suppliers.get(
                    order.supplier_id,
                    f"Supplier #{order.supplier_id}",
                ),
                "order_date": date_to_string(
                    order.order_date
                ),
                "expected_date": date_to_string(
                    order.expected_date
                ),
                "status": order.status,
                "total_amount": safe_float(
                    order.total_amount
                ),
            }
            for order in orders[:10]
        ],
    }


# =========================================================
# INVENTORY REPORT
# =========================================================

@router.get("/inventory")
def get_inventory_report(
    db: Session = Depends(get_db)
):
    inventory = (
        db.query(Inventory)
        .order_by(Inventory.id.desc())
        .all()
    )

    yarns = {
        item.id: item.name
        for item in db.query(Yarn).all()
    }

    fabrics = {
        item.id: item.name
        for item in db.query(Fabric).all()
    }

    products = {
        item.id: item.name
        for item in db.query(Product).all()
    }

    warehouses = {
        item.id: item.name
        for item in db.query(Warehouse).all()
    }

    warehouse_summary = {}

    low_stock = []

    inventory_details = []

    for item in inventory:

        quantity = safe_float(item.quantity)
        reserved = safe_float(item.reserved_quantity)
        available = quantity - reserved

        warehouse_name = warehouses.get(
            item.warehouse_id,
            f"Warehouse #{item.warehouse_id}",
        )

        if warehouse_name not in warehouse_summary:
            warehouse_summary[warehouse_name] = {
                "warehouse_id": item.warehouse_id,
                "total_quantity": 0,
                "reserved_quantity": 0,
                "available_quantity": 0,
                "items": 0,
            }

        warehouse_summary[warehouse_name][
            "total_quantity"
        ] += quantity

        warehouse_summary[warehouse_name][
            "reserved_quantity"
        ] += reserved

        warehouse_summary[warehouse_name][
            "available_quantity"
        ] += available

        warehouse_summary[warehouse_name][
            "items"
        ] += 1

        reorder_level = safe_float(
            item.reorder_level
        )

        if available <= reorder_level:
            low_stock.append({
                "inventory_id": item.id,
                "warehouse": warehouse_name,
                "item_name": (
                    products.get(item.product_id)
                    if item.product_id
                    else (
                        yarns.get(item.yarn_id)
                        if item.yarn_id
                        else fabrics.get(item.fabric_id)
                    )
                ),
                "item_type": (
                    "Product"
                    if item.product_id
                    else (
                        "Yarn"
                        if item.yarn_id
                        else "Fabric"
                    )
                ),
                "quantity": quantity,
                "reserved_quantity": reserved,
                "available_quantity": available,
                "reorder_level": reorder_level,
                "unit": item.unit,
            })

        inventory_details.append({
            "id": item.id,
            "item_name": (
                products.get(item.product_id)
                if item.product_id
                else (
                    yarns.get(item.yarn_id)
                    if item.yarn_id
                    else fabrics.get(item.fabric_id)
                )
            ),
            "item_type": (
                "Product"
                if item.product_id
                else (
                    "Yarn"
                    if item.yarn_id
                    else "Fabric"
                )
            ),
            "warehouse": warehouse_name,
            "quantity": quantity,
            "reserved_quantity": reserved,
            "available_quantity": available,
            "reorder_level": reorder_level,
            "unit": item.unit,
        })

    movements = (
        db.query(StockMovement)
        .order_by(StockMovement.id.desc())
        .limit(100)
        .all()
    )

    movement_summary = {}

    for movement in movements:

        movement_type = (
            movement.movement_type or "Unknown"
        )

        if movement_type not in movement_summary:
            movement_summary[movement_type] = {
                "movement_type": movement_type,
                "count": 0,
                "quantity": 0,
            }

        movement_summary[movement_type]["count"] += 1

        movement_summary[movement_type][
            "quantity"
        ] += safe_float(movement.quantity)

    return {
        "total_records": len(inventory),
        "total_quantity": round(
            sum(
                safe_float(item.quantity)
                for item in inventory
            ),
            2,
        ),
        "total_reserved_quantity": round(
            sum(
                safe_float(item.reserved_quantity)
                for item in inventory
            ),
            2,
        ),
        "low_stock_count": len(low_stock),
        "low_stock_items": low_stock,
        "warehouse_summary": [
            {
                **data,
                "total_quantity": round(
                    data["total_quantity"],
                    2,
                ),
                "reserved_quantity": round(
                    data["reserved_quantity"],
                    2,
                ),
                "available_quantity": round(
                    data["available_quantity"],
                    2,
                ),
            }
            for data in warehouse_summary.values()
        ],
        "movement_summary": [
            {
                **data,
                "quantity": round(
                    data["quantity"],
                    2,
                ),
            }
            for data in movement_summary.values()
        ],
        "inventory": inventory_details,
    }


# =========================================================
# PRODUCTION REPORT
# =========================================================

@router.get("/production")
def get_production_report(
    db: Session = Depends(get_db)
):
    orders = (
        db.query(ProductionOrder)
        .order_by(ProductionOrder.id.desc())
        .all()
    )

    products = {
        item.id: item.name
        for item in db.query(Product).all()
    }

    warehouses = {
        item.id: item.name
        for item in db.query(Warehouse).all()
    }

    status_summary = {}

    product_summary = {}

    for order in orders:

        status = order.status or "Unknown"

        status_summary[status] = (
            status_summary.get(status, 0) + 1
        )

        product_name = products.get(
            order.product_id,
            f"Product #{order.product_id}",
        )

        if product_name not in product_summary:
            product_summary[product_name] = {
                "product_id": order.product_id,
                "planned_quantity": 0,
                "produced_quantity": 0,
                "orders": 0,
            }

        product_summary[product_name][
            "planned_quantity"
        ] += safe_float(order.planned_quantity)

        product_summary[product_name][
            "produced_quantity"
        ] += safe_float(order.produced_quantity)

        product_summary[product_name]["orders"] += 1

    return {
        "total_orders": len(orders),
        "planned_orders": sum(
            1
            for order in orders
            if order.status == "Planned"
        ),
        "in_progress_orders": sum(
            1
            for order in orders
            if order.status == "In Progress"
        ),
        "completed_orders": sum(
            1
            for order in orders
            if order.status == "Completed"
        ),
        "planned_quantity": round(
            sum(
                safe_float(order.planned_quantity)
                for order in orders
            ),
            2,
        ),
        "produced_quantity": round(
            sum(
                safe_float(order.produced_quantity)
                for order in orders
            ),
            2,
        ),
        "status_summary": [
            {
                "status": status,
                "count": count,
            }
            for status, count in status_summary.items()
        ],
        "product_summary": [
            {
                **data,
                "planned_quantity": round(
                    data["planned_quantity"],
                    2,
                ),
                "produced_quantity": round(
                    data["produced_quantity"],
                    2,
                ),
                "completion_rate": calculate_percentage(
                    data["produced_quantity"],
                    data["planned_quantity"],
                ),
            }
            for data in product_summary.values()
        ],
        "recent_orders": [
            {
                "id": order.id,
                "production_order_no": (
                    order.production_order_no
                ),
                "product_id": order.product_id,
                "product_name": products.get(
                    order.product_id,
                    f"Product #{order.product_id}",
                ),
                "warehouse_id": order.warehouse_id,
                "warehouse_name": warehouses.get(
                    order.warehouse_id,
                    f"Warehouse #{order.warehouse_id}",
                ),
                "planned_quantity": safe_float(
                    order.planned_quantity
                ),
                "produced_quantity": safe_float(
                    order.produced_quantity
                ),
                "status": order.status,
                "start_date": date_to_string(
                    order.start_date
                ),
                "expected_completion_date": (
                    date_to_string(
                        order.expected_completion_date
                    )
                ),
                "actual_completion_date": (
                    date_to_string(
                        order.actual_completion_date
                    )
                ),
            }
            for order in orders[:10]
        ],
    }


# =========================================================
# QUALITY REPORT
# =========================================================

@router.get("/quality")
def get_quality_report(
    db: Session = Depends(get_db)
):
    inspections = (
        db.query(QualityInspection)
        .order_by(QualityInspection.id.desc())
        .all()
    )

    result_summary = {}

    defect_summary = {}

    for inspection in inspections:

        result = inspection.result or "Unknown"

        result_summary[result] = (
            result_summary.get(result, 0) + 1
        )

        defect = inspection.defect_type

        if defect:
            defect_summary[defect] = (
                defect_summary.get(defect, 0) + 1
            )

    total_inspected = sum(
        safe_float(item.inspected_quantity)
        for item in inspections
    )

    total_passed = sum(
        safe_float(item.passed_quantity)
        for item in inspections
    )

    total_rejected = sum(
        safe_float(item.rejected_quantity)
        for item in inspections
    )

    return {
        "total_inspections": len(inspections),
        "inspected_quantity": round(
            total_inspected,
            2,
        ),
        "passed_quantity": round(
            total_passed,
            2,
        ),
        "rejected_quantity": round(
            total_rejected,
            2,
        ),
        "pass_rate": calculate_percentage(
            total_passed,
            total_inspected,
        ),
        "rejection_rate": calculate_percentage(
            total_rejected,
            total_inspected,
        ),
        "result_summary": [
            {
                "result": result,
                "count": count,
            }
            for result, count in result_summary.items()
        ],
        "defect_summary": [
            {
                "defect_type": defect,
                "count": count,
            }
            for defect, count in defect_summary.items()
        ],
        "recent_inspections": [
            {
                "id": inspection.id,
                "inspection_no": (
                    inspection.inspection_no
                ),
                "production_order_id": (
                    inspection.production_order_id
                ),
                "product_id": inspection.product_id,
                "fabric_id": inspection.fabric_id,
                "inspection_date": date_to_string(
                    inspection.inspection_date
                ),
                "inspected_quantity": safe_float(
                    inspection.inspected_quantity
                ),
                "passed_quantity": safe_float(
                    inspection.passed_quantity
                ),
                "rejected_quantity": safe_float(
                    inspection.rejected_quantity
                ),
                "result": inspection.result,
                "defect_type": inspection.defect_type,
                "inspector_name": (
                    inspection.inspector_name
                ),
            }
            for inspection in inspections[:10]
        ],
    }


# =========================================================
# DISPATCH REPORT
# =========================================================

@router.get("/dispatch")
def get_dispatch_report(
    db: Session = Depends(get_db)
):
    dispatches = (
        db.query(Dispatch)
        .order_by(Dispatch.id.desc())
        .all()
    )

    customers = {
        customer.id: customer.name
        for customer in db.query(Customer).all()
    }

    dispatch_items = (
        db.query(DispatchItem)
        .all()
    )

    dispatch_quantity_by_dispatch = {}

    for item in dispatch_items:

        dispatch_quantity_by_dispatch[
            item.dispatch_id
        ] = (
            dispatch_quantity_by_dispatch.get(
                item.dispatch_id,
                0,
            )
            + safe_float(item.quantity)
        )

    status_summary = {}

    customer_summary = {}

    for dispatch in dispatches:

        status = dispatch.status or "Unknown"

        status_summary[status] = (
            status_summary.get(status, 0) + 1
        )

        customer_name = customers.get(
            dispatch.customer_id,
            f"Customer #{dispatch.customer_id}",
        )

        if customer_name not in customer_summary:
            customer_summary[customer_name] = {
                "customer_id": dispatch.customer_id,
                "dispatch_count": 0,
                "quantity": 0,
            }

        customer_summary[customer_name][
            "dispatch_count"
        ] += 1

        customer_summary[customer_name][
            "quantity"
        ] += dispatch_quantity_by_dispatch.get(
            dispatch.id,
            0,
        )

    return {
        "total_dispatches": len(dispatches),
        "total_quantity": round(
            sum(dispatch_quantity_by_dispatch.values()),
            2,
        ),
        "status_summary": [
            {
                "status": status,
                "count": count,
            }
            for status, count in status_summary.items()
        ],
        "customer_summary": [
            {
                **data,
                "quantity": round(
                    data["quantity"],
                    2,
                ),
            }
            for data in customer_summary.values()
        ],
        "recent_dispatches": [
            {
                "id": dispatch.id,
                "dispatch_no": dispatch.dispatch_no,
                "sales_order_id": (
                    dispatch.sales_order_id
                ),
                "customer_id": dispatch.customer_id,
                "customer_name": customers.get(
                    dispatch.customer_id,
                    f"Customer #{dispatch.customer_id}",
                ),
                "dispatch_date": date_to_string(
                    dispatch.dispatch_date
                ),
                "status": dispatch.status,
                "transporter": dispatch.transporter,
                "vehicle_no": dispatch.vehicle_no,
                "tracking_no": dispatch.tracking_no,
                "quantity": round(
                    dispatch_quantity_by_dispatch.get(
                        dispatch.id,
                        0,
                    ),
                    2,
                ),
            }
            for dispatch in dispatches[:10]
        ],
    }


# =========================================================
# FINANCE REPORT
# =========================================================

@router.get("/finance")
def get_finance_report(
    db: Session = Depends(get_db)
):
    invoices = (
        db.query(Invoice)
        .order_by(Invoice.id.desc())
        .all()
    )

    payments = (
        db.query(Payment)
        .order_by(Payment.id.desc())
        .all()
    )

    customers = {
        customer.id: customer.name
        for customer in db.query(Customer).all()
    }

    total_invoice_value = sum(
        safe_float(invoice.total_amount)
        for invoice in invoices
    )

    total_received = sum(
        safe_float(payment.amount)
        for payment in payments
    )

    payment_by_invoice = {}

    for payment in payments:

        payment_by_invoice[payment.invoice_id] = (
            payment_by_invoice.get(
                payment.invoice_id,
                0,
            )
            + safe_float(payment.amount)
        )

    customer_summary = {}

    overdue_invoices = []

    today = date.today()

    invoice_details = []

    for invoice in invoices:

        invoice_total = safe_float(
            invoice.total_amount
        )

        paid = payment_by_invoice.get(
            invoice.id,
            0,
        )

        remaining = max(
            invoice_total - paid,
            0,
        )

        customer_name = customers.get(
            invoice.customer_id,
            f"Customer #{invoice.customer_id}",
        )

        if customer_name not in customer_summary:
            customer_summary[customer_name] = {
                "customer_id": invoice.customer_id,
                "invoice_count": 0,
                "invoice_value": 0,
                "paid_amount": 0,
                "outstanding": 0,
            }

        customer_summary[customer_name][
            "invoice_count"
        ] += 1

        customer_summary[customer_name][
            "invoice_value"
        ] += invoice_total

        customer_summary[customer_name][
            "paid_amount"
        ] += paid

        customer_summary[customer_name][
            "outstanding"
        ] += remaining

        if (
            invoice.due_date
            and invoice.due_date < today
            and remaining > 0
        ):
            overdue_invoices.append({
                "invoice_id": invoice.id,
                "invoice_no": invoice.invoice_no,
                "customer_id": invoice.customer_id,
                "customer_name": customer_name,
                "due_date": date_to_string(
                    invoice.due_date
                ),
                "total_amount": invoice_total,
                "paid_amount": paid,
                "outstanding": remaining,
            })

        invoice_details.append({
            "id": invoice.id,
            "invoice_no": invoice.invoice_no,
            "customer_id": invoice.customer_id,
            "customer_name": customer_name,
            "invoice_date": date_to_string(
                invoice.invoice_date
            ),
            "due_date": date_to_string(
                invoice.due_date
            ),
            "total_amount": invoice_total,
            "paid_amount": round(
                paid,
                2,
            ),
            "outstanding": round(
                remaining,
                2,
            ),
            "status": (
                "Paid"
                if remaining <= 0
                and invoice_total > 0
                else (
                    "Partial"
                    if paid > 0
                    else "Unpaid"
                )
            ),
        })

    return {
        "total_invoices": len(invoices),
        "total_invoice_value": round(
            total_invoice_value,
            2,
        ),
        "total_payments": len(payments),
        "total_received": round(
            total_received,
            2,
        ),
        "total_outstanding": round(
            max(
                total_invoice_value
                - total_received,
                0,
            ),
            2,
        ),
        "paid_invoices": sum(
            1
            for invoice in invoice_details
            if invoice["status"] == "Paid"
        ),
        "partial_invoices": sum(
            1
            for invoice in invoice_details
            if invoice["status"] == "Partial"
        ),
        "unpaid_invoices": sum(
            1
            for invoice in invoice_details
            if invoice["status"] == "Unpaid"
        ),
        "overdue_invoice_count": len(
            overdue_invoices
        ),
        "customer_summary": [
            {
                **data,
                "invoice_value": round(
                    data["invoice_value"],
                    2,
                ),
                "paid_amount": round(
                    data["paid_amount"],
                    2,
                ),
                "outstanding": round(
                    data["outstanding"],
                    2,
                ),
            }
            for data in customer_summary.values()
        ],
        "overdue_invoices": overdue_invoices,
        "recent_invoices": invoice_details[:10],
        "recent_payments": [
            {
                "id": payment.id,
                "payment_no": payment.payment_no,
                "invoice_id": payment.invoice_id,
                "customer_id": payment.customer_id,
                "customer_name": customers.get(
                    payment.customer_id,
                    f"Customer #{payment.customer_id}",
                ),
                "payment_date": date_to_string(
                    payment.payment_date
                ),
                "amount": safe_float(
                    payment.amount
                ),
                "payment_method": (
                    payment.payment_method
                ),
                "reference_no": (
                    payment.reference_no
                ),
            }
            for payment in payments[:10]
        ],
    }


# =========================================================
# GOODS RECEIPT REPORT
# =========================================================

@router.get("/goods-receipts")
def get_goods_receipt_report(
    db: Session = Depends(get_db)
):
    receipts = (
        db.query(GoodsReceipt)
        .order_by(GoodsReceipt.id.desc())
        .all()
    )

    receipt_items = (
        db.query(GoodsReceiptItem)
        .all()
    )

    warehouses = {
        warehouse.id: warehouse.name
        for warehouse in db.query(Warehouse).all()
    }

    yarns = {
        yarn.id: yarn.name
        for yarn in db.query(Yarn).all()
    }

    fabrics = {
        fabric.id: fabric.name
        for fabric in db.query(Fabric).all()
    }

    total_received_quantity = sum(
        safe_float(item.received_quantity)
        for item in receipt_items
    )

    warehouse_summary = {}

    material_summary = {}

    for item in receipt_items:

        quantity = safe_float(
            item.received_quantity
        )

        warehouse_name = warehouses.get(
            item.warehouse_id,
            f"Warehouse #{item.warehouse_id}",
        )

        if warehouse_name not in warehouse_summary:
            warehouse_summary[warehouse_name] = {
                "warehouse_id": item.warehouse_id,
                "quantity": 0,
            }

        warehouse_summary[warehouse_name][
            "quantity"
        ] += quantity

        if item.yarn_id:
            material_name = yarns.get(
                item.yarn_id,
                f"Yarn #{item.yarn_id}",
            )
            material_type = "Yarn"
            material_id = item.yarn_id

        else:
            material_name = fabrics.get(
                item.fabric_id,
                f"Fabric #{item.fabric_id}",
            )
            material_type = "Fabric"
            material_id = item.fabric_id

        key = (
            material_type,
            material_id,
            material_name,
        )

        if key not in material_summary:
            material_summary[key] = {
                "material_type": material_type,
                "material_id": material_id,
                "material_name": material_name,
                "quantity": 0,
            }

        material_summary[key]["quantity"] += quantity

    return {
        "total_receipts": len(receipts),
        "total_received_quantity": round(
            total_received_quantity,
            2,
        ),
        "warehouse_summary": [
            {
                **data,
                "quantity": round(
                    data["quantity"],
                    2,
                ),
            }
            for data in warehouse_summary.values()
        ],
        "material_summary": [
            {
                **data,
                "quantity": round(
                    data["quantity"],
                    2,
                ),
            }
            for data in material_summary.values()
        ],
        "recent_receipts": [
            {
                "id": receipt.id,
                "receipt_no": receipt.receipt_no,
                "purchase_order_id": (
                    receipt.purchase_order_id
                ),
                "receipt_date": date_to_string(
                    receipt.receipt_date
                ),
                "status": receipt.status,
                "remarks": receipt.remarks,
            }
            for receipt in receipts[:10]
        ],
    }


# =========================================================
# PROCESSING REPORT
# =========================================================

@router.get("/processing")
def get_processing_report(
    db: Session = Depends(get_db)
):
    dyeing_orders = (
        db.query(DyeingOrder)
        .order_by(DyeingOrder.id.desc())
        .all()
    )

    finishing_orders = (
        db.query(FinishingOrder)
        .order_by(FinishingOrder.id.desc())
        .all()
    )

    dyeing_status = {}

    finishing_status = {}

    dyeing_quantity = 0
    finishing_quantity = 0

    for order in dyeing_orders:

        status = order.status or "Unknown"

        dyeing_status[status] = (
            dyeing_status.get(status, 0) + 1
        )

        dyeing_quantity += safe_float(
            order.quantity
        )

    for order in finishing_orders:

        status = order.status or "Unknown"

        finishing_status[status] = (
            finishing_status.get(status, 0) + 1
        )

        finishing_quantity += safe_float(
            order.quantity
        )

    return {
        "dyeing": {
            "total_orders": len(dyeing_orders),
            "total_quantity": round(
                dyeing_quantity,
                2,
            ),
            "status_summary": [
                {
                    "status": status,
                    "count": count,
                }
                for status, count in dyeing_status.items()
            ],
        },

        "finishing": {
            "total_orders": len(finishing_orders),
            "total_quantity": round(
                finishing_quantity,
                2,
            ),
            "status_summary": [
                {
                    "status": status,
                    "count": count,
                }
                for status, count in finishing_status.items()
            ],
        },
    }


# =========================================================
# STOCK MOVEMENT REPORT
# =========================================================

@router.get("/stock-movements")
def get_stock_movement_report(
    db: Session = Depends(get_db)
):
    movements = (
        db.query(StockMovement)
        .order_by(StockMovement.id.desc())
        .all()
    )

    movement_summary = {}

    for movement in movements:

        movement_type = (
            movement.movement_type
            or "Unknown"
        )

        if movement_type not in movement_summary:
            movement_summary[movement_type] = {
                "movement_type": movement_type,
                "count": 0,
                "quantity": 0,
            }

        movement_summary[movement_type]["count"] += 1

        movement_summary[movement_type][
            "quantity"
        ] += safe_float(movement.quantity)

    return {
        "total_movements": len(movements),
        "movement_summary": [
            {
                **data,
                "quantity": round(
                    data["quantity"],
                    2,
                ),
            }
            for data in movement_summary.values()
        ],
        "recent_movements": [
            {
                "id": movement.id,
                "inventory_id": (
                    movement.inventory_id
                ),
                "movement_type": (
                    movement.movement_type
                ),
                "quantity": safe_float(
                    movement.quantity
                ),
                "reference_type": (
                    movement.reference_type
                ),
                "reference_id": (
                    movement.reference_id
                ),
                "from_warehouse_id": (
                    movement.from_warehouse_id
                ),
                "to_warehouse_id": (
                    movement.to_warehouse_id
                ),
                "remarks": movement.remarks,
            }
            for movement in movements[:100]
        ],
    }


# =========================================================
# CUSTOMER REPORT
# =========================================================

@router.get("/customers")
def get_customer_report(
    db: Session = Depends(get_db)
):
    customers = (
        db.query(Customer)
        .order_by(Customer.id.desc())
        .all()
    )

    sales_orders = (
        db.query(SalesOrder)
        .all()
    )

    invoices = (
        db.query(Invoice)
        .all()
    )

    payments = (
        db.query(Payment)
        .all()
    )

    dispatches = (
        db.query(Dispatch)
        .all()
    )

    customer_report = {}

    for customer in customers:

        customer_report[customer.id] = {
            "customer_id": customer.id,
            "customer_code": customer.customer_code,
            "customer_name": customer.name,
            "active": customer.status,
            "sales_orders": 0,
            "sales_value": 0,
            "invoices": 0,
            "invoice_value": 0,
            "payments": 0,
            "paid_amount": 0,
            "outstanding": 0,
            "dispatches": 0,
        }

    for order in sales_orders:

        if order.customer_id in customer_report:

            customer_report[
                order.customer_id
            ]["sales_orders"] += 1

            customer_report[
                order.customer_id
            ]["sales_value"] += safe_float(
                order.total_amount
            )

    for invoice in invoices:

        if invoice.customer_id in customer_report:

            customer_report[
                invoice.customer_id
            ]["invoices"] += 1

            customer_report[
                invoice.customer_id
            ]["invoice_value"] += safe_float(
                invoice.total_amount
            )

    for payment in payments:

        if payment.customer_id in customer_report:

            customer_report[
                payment.customer_id
            ]["payments"] += 1

            customer_report[
                payment.customer_id
            ]["paid_amount"] += safe_float(
                payment.amount
            )

    for dispatch in dispatches:

        if dispatch.customer_id in customer_report:

            customer_report[
                dispatch.customer_id
            ]["dispatches"] += 1

    for data in customer_report.values():

        data["outstanding"] = max(
            data["invoice_value"]
            - data["paid_amount"],
            0,
        )

        data["sales_value"] = round(
            data["sales_value"],
            2,
        )

        data["invoice_value"] = round(
            data["invoice_value"],
            2,
        )

        data["paid_amount"] = round(
            data["paid_amount"],
            2,
        )

        data["outstanding"] = round(
            data["outstanding"],
            2,
        )

    return {
        "total_customers": len(customers),
        "active_customers": sum(
            1
            for customer in customers
            if customer.status
        ),
        "customers": list(
            customer_report.values()
        ),
    }