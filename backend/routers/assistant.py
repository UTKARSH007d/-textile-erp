from datetime import date
import json
import os
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import SessionLocal

from models.sales import SalesOrder
from models.inventory import Inventory, StockMovement
from models.master import Yarn, Fabric, Product, Warehouse
from models.production import ProductionOrder
from models.quality import QualityInspection
from models.finance import Invoice, Payment
from models.customer import Customer
from models.dispatch import Dispatch, DispatchItem

from google import genai
from dotenv import load_dotenv


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.7-flash"
)

if GEMINI_API_KEY:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
else:
    gemini_client = None


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/api/assistant",
    tags=["AI ERP Assistant"]
)


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# =========================================================
# BASIC HELPERS
# =========================================================

def normalize_question(question: str):
    return question.lower().strip()


def safe_float(value):
    return float(value or 0)


def safe_date(value):
    return str(value) if value else None


def customer_name(db: Session, customer_id):
    if not customer_id:
        return None

    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id)
        .first()
    )

    return customer.name if customer else f"Customer #{customer_id}"


def product_name(db: Session, product_id):
    if not product_id:
        return None

    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    return product.name if product else f"Product #{product_id}"


def fabric_name(db: Session, fabric_id):
    if not fabric_id:
        return None

    fabric = (
        db.query(Fabric)
        .filter(Fabric.id == fabric_id)
        .first()
    )

    return fabric.name if fabric else f"Fabric #{fabric_id}"


def yarn_name(db: Session, yarn_id):
    if not yarn_id:
        return None

    yarn = (
        db.query(Yarn)
        .filter(Yarn.id == yarn_id)
        .first()
    )

    return yarn.name if yarn else f"Yarn #{yarn_id}"


def warehouse_name(db: Session, warehouse_id):
    if not warehouse_id:
        return None

    warehouse = (
        db.query(Warehouse)
        .filter(Warehouse.id == warehouse_id)
        .first()
    )

    return warehouse.name if warehouse else f"Warehouse #{warehouse_id}"


# =========================================================
# PAYMENT HELPERS
# =========================================================

def get_total_paid(
    invoice_id: int,
    db: Session
):
    payments = (
        db.query(Payment)
        .filter(Payment.invoice_id == invoice_id)
        .all()
    )

    return sum(
        safe_float(payment.amount)
        for payment in payments
    )


def get_invoice_payment_status(
    invoice: Invoice,
    db: Session
):
    total_amount = safe_float(invoice.total_amount)
    total_paid = get_total_paid(invoice.id, db)

    remaining = max(
        total_amount - total_paid,
        0
    )

    if total_paid <= 0:
        status = "Unpaid"
    elif total_paid < total_amount:
        status = "Partial"
    else:
        status = "Paid"

    overdue = (
        invoice.due_date is not None
        and invoice.due_date < date.today()
        and remaining > 0
    )

    return {
        "invoice_no": invoice.invoice_no,
        "customer": customer_name(
            db,
            invoice.customer_id
        ),
        "invoice_date": safe_date(
            invoice.invoice_date
        ),
        "due_date": safe_date(
            invoice.due_date
        ),
        "total_amount": total_amount,
        "paid_amount": total_paid,
        "outstanding_amount": remaining,
        "status": status,
        "overdue": overdue
    }


# =========================================================
# INVENTORY DATA
# =========================================================

def get_inventory_data(db: Session):

    inventory_items = (
        db.query(Inventory)
        .order_by(Inventory.id.desc())
        .all()
    )

    result = []

    for item in inventory_items:

        item_name = "Unknown Item"
        item_type = "Inventory"

        if item.product_id:
            item_name = product_name(
                db,
                item.product_id
            )
            item_type = "Product"

        elif item.fabric_id:
            item_name = fabric_name(
                db,
                item.fabric_id
            )
            item_type = "Fabric"

        elif item.yarn_id:
            item_name = yarn_name(
                db,
                item.yarn_id
            )
            item_type = "Yarn"

        product = None
        fabric = None
        yarn = None

        if item.product_id:
            product = db.query(Product).filter(Product.id == item.product_id).first()
        elif item.fabric_id:
            fabric = db.query(Fabric).filter(Fabric.id == item.fabric_id).first()
        elif item.yarn_id:
            yarn = db.query(Yarn).filter(Yarn.id == item.yarn_id).first()

        result.append({
            "inventory_id": item.id,
            "item": item_name,
            "type": item_type,
            "product_id": item.product_id,
            "product_code": getattr(product, "product_code", None),
            "fabric_id": item.fabric_id,
            "fabric_code": getattr(fabric, "fabric_code", None),
            "yarn_id": item.yarn_id,
            "yarn_code": getattr(yarn, "yarn_code", None),
            "quantity": safe_float(item.quantity),
            "reserved_quantity": safe_float(
                item.reserved_quantity
            ),
            "available_quantity": max(
                safe_float(item.quantity)
                - safe_float(item.reserved_quantity),
                0
            ),
            "unit": item.unit,
            "reorder_level": safe_float(
                item.reorder_level
            ),
            "warehouse": warehouse_name(
                db,
                item.warehouse_id
            )
        })

    return result


# =========================================================
# SALES ORDER DATA
# =========================================================

def get_sales_order_data(db: Session):

    orders = (
        db.query(SalesOrder)
        .order_by(SalesOrder.id.desc())
        .all()
    )

    result = []

    for order in orders:

        result.append({
            "sales_order_no": order.sales_order_no,
            "customer": customer_name(
                db,
                order.customer_id
            ),
            "order_date": safe_date(
                order.order_date
            ),
            "delivery_date": safe_date(
                order.delivery_date
            ),
            "status": order.status,
            "total_amount": safe_float(
                order.total_amount
            )
        })

    return result


# =========================================================
# PRODUCTION DATA
# =========================================================

def get_production_data(db: Session):

    orders = (
        db.query(ProductionOrder)
        .order_by(ProductionOrder.id.desc())
        .all()
    )

    result = []

    for order in orders:

        result.append({
            "production_order_no":
                order.production_order_no,

            "product":
                product_name(
                    db,
                    order.product_id
                ),

            "warehouse":
                warehouse_name(
                    db,
                    order.warehouse_id
                ),

            "planned_quantity":
                safe_float(
                    order.planned_quantity
                ),

            "produced_quantity":
                safe_float(
                    order.produced_quantity
                ),

            "status":
                order.status,

            "start_date":
                safe_date(
                    order.start_date
                ),

            "expected_completion_date":
                safe_date(
                    order.expected_completion_date
                ),

            "actual_completion_date":
                safe_date(
                    order.actual_completion_date
                )
        })

    return result


# =========================================================
# QUALITY DATA
# =========================================================

def get_quality_data(db: Session):

    inspections = (
        db.query(QualityInspection)
        .order_by(QualityInspection.id.desc())
        .all()
    )

    result = []

    for inspection in inspections:

        result.append({
            "inspection_no":
                inspection.inspection_no,

            "product":
                product_name(
                    db,
                    inspection.product_id
                ),

            "fabric":
                fabric_name(
                    db,
                    inspection.fabric_id
                ),

            "inspection_date":
                safe_date(
                    inspection.inspection_date
                ),

            "inspected_quantity":
                safe_float(
                    inspection.inspected_quantity
                ),

            "passed_quantity":
                safe_float(
                    inspection.passed_quantity
                ),

            "rejected_quantity":
                safe_float(
                    inspection.rejected_quantity
                ),

            "result":
                inspection.result,

            "defect_type":
                inspection.defect_type,

            "remarks":
                inspection.remarks
        })

    return result


# =========================================================
# DISPATCH DATA
# =========================================================

def get_dispatch_data(db: Session):

    dispatches = (
        db.query(Dispatch)
        .order_by(Dispatch.id.desc())
        .all()
    )

    result = []

    for dispatch in dispatches:

        items = (
            db.query(DispatchItem)
            .filter(
                DispatchItem.dispatch_id
                == dispatch.id
            )
            .all()
        )

        dispatch_items = []

        for item in items:

            item_name = None
            item_type = None

            if item.product_id:
                item_name = product_name(
                    db,
                    item.product_id
                )
                item_type = "Product"

            elif item.fabric_id:
                item_name = fabric_name(
                    db,
                    item.fabric_id
                )
                item_type = "Fabric"

            dispatch_items.append({
                "item": item_name,
                "type": item_type,
                "quantity": safe_float(
                    item.quantity
                ),
                "unit": item.unit
            })

        result.append({
            "dispatch_no":
                dispatch.dispatch_no,

            "customer":
                customer_name(
                    db,
                    dispatch.customer_id
                ),

            "sales_order_id":
                dispatch.sales_order_id,

            "dispatch_date":
                safe_date(
                    dispatch.dispatch_date
                ),

            "status":
                dispatch.status,

            "transporter":
                dispatch.transporter,

            "vehicle_no":
                dispatch.vehicle_no,

            "tracking_no":
                dispatch.tracking_no,

            "items":
                dispatch_items
        })

    return result


# =========================================================
# FINANCE DATA
# =========================================================

def get_finance_data(db: Session):

    invoices = (
        db.query(Invoice)
        .order_by(Invoice.id.desc())
        .all()
    )

    result = []

    for invoice in invoices:

        result.append(
            get_invoice_payment_status(
                invoice,
                db
            )
        )

    return result


# =========================================================
# CUSTOMERS
# =========================================================

def get_customer_data(db: Session):

    customers = (
        db.query(Customer)
        .order_by(Customer.id.desc())
        .all()
    )

    result = []

    for customer in customers:

        result.append({
            "customer_id":
                customer.id,

            "customer_code":
                customer.customer_code,

            "name":
                customer.name,

            "email":
                customer.email,

            "phone":
                customer.phone,

            "city":
                customer.city,

            "state":
                customer.state,

            "country":
                customer.country,

            "status":
                customer.status
        })

    return result


# =========================================================
# BUILD ERP CONTEXT
# =========================================================

def build_erp_context(db: Session):

    inventory = get_inventory_data(db)
    sales_orders = get_sales_order_data(db)
    production = get_production_data(db)
    quality = get_quality_data(db)
    dispatch = get_dispatch_data(db)
    finance = get_finance_data(db)
    customers = get_customer_data(db)

    today = date.today()

    pending_orders = [
        order
        for order in sales_orders
        if order["status"] in [
            "Pending",
            "Confirmed",
            "In Progress"
        ]
    ]

    low_stock = [
        item
        for item in inventory
        if item["quantity"]
        <= item["reorder_level"]
    ]

    delayed_sales_orders = [
        order
        for order in sales_orders
        if (
            order["delivery_date"]
            and order["delivery_date"] < str(today)
            and order["status"]
            not in [
                "Completed",
                "Delivered",
                "Cancelled"
            ]
        )
    ]

    delayed_production = [
        order
        for order in production
        if (
            order["expected_completion_date"]
            and order["expected_completion_date"]
            < str(today)
            and order["status"]
            not in [
                "Completed",
                "Cancelled"
            ]
        )
    ]

    quality_issues = [
        item
        for item in quality
        if (
            safe_float(
                item["rejected_quantity"]
            ) > 0
            or item["result"]
            in [
                "Failed",
                "Rejected"
            ]
        )
    ]

    outstanding_invoices = [
        invoice
        for invoice in finance
        if invoice["outstanding_amount"] > 0
    ]

    overdue_invoices = [
        invoice
        for invoice in outstanding_invoices
        if invoice["overdue"]
    ]

    completed_production = [
        order
        for order in production
        if order["status"] == "Completed"
    ]

    completed_production.sort(
        key=lambda order: (
            order["actual_completion_date"] or "",
            order["production_order_no"] or ""
        ),
        reverse=True
    )

    latest_completed_production = (
        completed_production[0]
        if completed_production
        else None
    )

    total_outstanding = sum(
        invoice["outstanding_amount"]
        for invoice in outstanding_invoices
    )

    return {
        "current_date": str(today),

        "customers": customers,

        "inventory": inventory,

        "low_stock_items": low_stock,

        "sales_orders": sales_orders,

        "pending_sales_orders": pending_orders,

        "delayed_sales_orders":
            delayed_sales_orders,

        "production_orders":
            production,

        "delayed_production_orders":
            delayed_production,

        "latest_completed_production":
            latest_completed_production,

        "quality_inspections":
            quality,

        "quality_issues":
            quality_issues,

        "dispatches":
            dispatch,

        "invoices":
            finance,

        "outstanding_invoices":
            outstanding_invoices,

        "overdue_invoices":
            overdue_invoices,

        "total_outstanding_amount":
            total_outstanding
    }


# =========================================================
# DISPLAY DATA
# =========================================================

def get_relevant_display_data(
    question: str,
    context: dict
):
    """Return only records relevant to the user's question."""
    q = normalize_question(question)

    if any(word in q for word in ["stock", "inventory", "quantity available", "available"]):
        inventory = context["inventory"]
        match = re.search(r"\bproduct\s*#?\s*(\d+)\b", q)
        if match:
            product_id = int(match.group(1))
            return [x for x in inventory if x.get("product_id") == product_id]

        matches = []
        for item in inventory:
            name = str(item.get("item") or "").lower()
            code = str(item.get("product_code") or "").lower()
            if item.get("type") == "Product" and ((name and name in q) or (code and code in q)):
                matches.append(item)
        if matches:
            return matches

        matches = []
        for item in inventory:
            name = str(item.get("item") or "").lower()
            codes = [str(item.get("fabric_code") or "").lower(), str(item.get("yarn_code") or "").lower()]
            if (name and name in q) or any(code and code in q for code in codes):
                matches.append(item)
        return matches or inventory

    if any(word in q for word in ["production", "produced", "manufacturing"]):
        production = context["production_orders"]
        if "latest" in q or "most recent" in q:
            completed = [x for x in production if x.get("status") == "Completed"]
            completed.sort(key=lambda x: (x.get("actual_completion_date") or "", x.get("production_order_no") or ""), reverse=True)
            return completed[:1]
        match = re.search(r"\b(?:production\s*)?(?:order\s*)?#?\s*(\d+)\b", q)
        if match:
            no = f"PROD-{int(match.group(1)):04d}"
            found = [x for x in production if str(x.get("production_order_no") or "").upper() == no]
            if found:
                return found
        return production

    if any(word in q for word in ["invoice", "payment", "outstanding", "overdue", "paid"]):
        invoices = context["invoices"]
        match = re.search(r"\bINV[-\s]?(\d+)\b", q, re.IGNORECASE)
        if match:
            no = f"INV-{int(match.group(1)):03d}"
            return [x for x in invoices if str(x.get("invoice_no", "")).upper() == no]
        if "outstanding" in q and "overdue" not in q:
            return context["outstanding_invoices"]
        if "overdue" in q:
            return context["overdue_invoices"]
        return invoices

    if any(word in q for word in ["dispatch", "dispatched", "shipment", "shipped"]):
        return context["dispatches"]
    if any(word in q for word in ["quality", "defect", "rejected", "inspection"]):
        return context["quality_inspections"]
    if any(word in q for word in ["order", "sales order", "pending order", "delayed order"]):
        if "pending" in q:
            return context["pending_sales_orders"]
        if "delayed" in q or "late" in q:
            return context["delayed_sales_orders"]
        return context["sales_orders"]
    return context


# =========================================================
# GEMINI ANSWER
# =========================================================

def generate_gemini_answer(
    question: str,
    context: dict
):

    if not gemini_client:
        raise HTTPException(
            status_code=500,
            detail=(
                "Gemini API key is not configured. "
                "Add GEMINI_API_KEY to backend/.env "
                "and restart FastAPI."
            )
        )

    system_instruction = """
You are the AI Assistant for a Textile ERP system.

Your job is to answer business questions using ONLY
the ERP data supplied in the user prompt.

IMPORTANT RULES:

1. The ERP database is the source of truth.
2. Never invent quantities, names, dates, amounts,
   statuses or other ERP facts.
3. If the requested information is not present,
   clearly say that it is not available.
4. Do not pretend to have access to information
   that is not included in the ERP data.
5. Calculate simple totals, differences and percentages
   when the required values are present.
6. Give direct, useful business answers.
7. Keep answers concise but informative.
8. Mention the relevant order, product, customer,
   invoice or record number when useful.
9. For financial questions, distinguish:
   invoice total, paid amount and outstanding amount.
10. For inventory questions, mention quantity and unit.
11. For production questions, distinguish planned quantity
    from produced quantity.
12. For quality questions, mention rejected quantity
    and defect information when available.
13. If there are multiple matching records, summarize them
    clearly rather than choosing one arbitrarily.
14. Do not provide programming explanations unless the
    user asks for them.

You are answering for a textile manufacturing ERP.
Use professional business language.
"""

    user_prompt = f"""
USER QUESTION:
{question}

CURRENT ERP DATA:
{json.dumps(context, indent=2, default=str)}

Answer the user's question using the ERP data above.
"""

    try:

        interaction = gemini_client.interactions.create(
            model=GEMINI_MODEL,
            system_instruction=system_instruction,
            input=user_prompt,
            generation_config={
                "thinking_level": "low",
                "temperature": 0.2
            }
        )

        answer = interaction.output_text

        if not answer:
            return (
                "I could not generate an answer from "
                "the available ERP data."
            )

        return answer.strip()

    except Exception as error:

        print(
            "Gemini API error:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to generate the AI response. "
                "Check your Gemini API key, model access "
                "and backend terminal for the exact error."
            )
        )


# =========================================================
# MAIN AI ASSISTANT
# =========================================================

@router.post("/ask")
def ask_assistant(
    question: str,
    db: Session = Depends(get_db)
):

    if not question or not question.strip():

        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )

    context = build_erp_context(db)

    display_data = get_relevant_display_data(
        question,
        context
    )

    answer = generate_gemini_answer(
        question,
        context
    )

    return {
        "answer": answer,
        "data": display_data
    }


# =========================================================
# BUSINESS INSIGHTS
# =========================================================

@router.get("/insights")
def business_insights(
    db: Session = Depends(get_db)
):

    context = build_erp_context(db)

    insight_question = """
Give me an overall business summary of the current
textile ERP.

Cover:
- sales orders
- inventory and low stock
- production
- delayed orders
- quality issues
- dispatches
- outstanding invoices

Highlight the most important issues that management
should pay attention to.

Use only the ERP data provided.
"""

    answer = generate_gemini_answer(
        insight_question,
        context
    )

    return {
        "answer": answer,
        "data": {
            "pending_orders":
                len(
                    context[
                        "pending_sales_orders"
                    ]
                ),

            "low_stock_items":
                len(
                    context[
                        "low_stock_items"
                    ]
                ),

            "delayed_sales_orders":
                len(
                    context[
                        "delayed_sales_orders"
                    ]
                ),

            "delayed_production_orders":
                len(
                    context[
                        "delayed_production_orders"
                    ]
                ),

            "quality_issues":
                len(
                    context[
                        "quality_issues"
                    ]
                ),

            "outstanding_invoices":
                len(
                    context[
                        "outstanding_invoices"
                    ]
                ),

            "overdue_invoices":
                len(
                    context[
                        "overdue_invoices"
                    ]
                ),

            "total_outstanding_amount":
                context[
                    "total_outstanding_amount"
                ]
        }
    }