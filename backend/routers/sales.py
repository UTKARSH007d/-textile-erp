from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import SessionLocal

from models.sales import (
    Quotation,
    QuotationItem,
    SalesOrder,
    SalesOrderItem
)

from models.customer import Customer
from models.master import Product
from permissions import require_manager_or_admin


router = APIRouter(
    prefix="/api/sales",
    tags=["Sales"]
)


# -----------------------------
# DATABASE DEPENDENCY
# -----------------------------

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# =====================================================
# QUOTATION SCHEMAS
# =====================================================

class QuotationItemCreate(BaseModel):
    product_id: Optional[int] = None
    description: Optional[str] = None
    quantity: float
    unit: str = "meter"
    unit_price: float


class QuotationCreate(BaseModel):
    quotation_no: str
    customer_id: int
    quotation_date: date
    valid_until: Optional[date] = None
    status: str = "Draft"
    remarks: Optional[str] = None
    items: list[QuotationItemCreate]


class QuotationItemResponse(BaseModel):
    id: int
    quotation_id: int
    product_id: Optional[int]
    description: Optional[str]
    quantity: float
    unit: str
    unit_price: float
    amount: float

    model_config = ConfigDict(from_attributes=True)


class QuotationResponse(BaseModel):
    id: int
    quotation_no: str
    customer_id: int
    quotation_date: date
    valid_until: Optional[date]
    status: str
    total_amount: float
    remarks: Optional[str]

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# SALES ORDER SCHEMAS
# =====================================================

class SalesOrderItemCreate(BaseModel):
    product_id: Optional[int] = None
    fabric_id: Optional[int] = None
    yarn_id: Optional[int] = None
    color_id: Optional[int] = None

    quantity: float
    unit: str = "meter"
    unit_price: float

    required_yarn_qty: float = 0
    required_fabric_qty: float = 0


class SalesOrderCreate(BaseModel):
    sales_order_no: str
    customer_id: int
    quotation_id: Optional[int] = None
    order_date: date
    delivery_date: Optional[date] = None
    status: str = "Pending"
    remarks: Optional[str] = None
    items: list[SalesOrderItemCreate]


class SalesOrderItemResponse(BaseModel):
    id: int
    sales_order_id: int
    product_id: Optional[int]
    fabric_id: Optional[int]
    yarn_id: Optional[int]
    color_id: Optional[int]

    quantity: float
    unit: str
    unit_price: float
    amount: float

    required_yarn_qty: float
    required_fabric_qty: float

    model_config = ConfigDict(from_attributes=True)


class SalesOrderResponse(BaseModel):
    id: int
    sales_order_no: str
    customer_id: int
    quotation_id: Optional[int]
    order_date: date
    delivery_date: Optional[date]
    status: str
    total_amount: float
    remarks: Optional[str]

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# QUOTATION ENDPOINTS
# =====================================================

# -----------------------------
# GET ALL QUOTATIONS
# -----------------------------

@router.get(
    "/quotations/",
    response_model=list[QuotationResponse]
)
def get_quotations(
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    return (
        db.query(Quotation)
        .order_by(Quotation.id.desc())
        .all()
    )


# -----------------------------
# GET SINGLE QUOTATION
# -----------------------------

@router.get(
    "/quotations/{quotation_id}",
    response_model=QuotationResponse
)
def get_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    quotation = (
        db.query(Quotation)
        .filter(Quotation.id == quotation_id)
        .first()
    )

    if not quotation:
        raise HTTPException(
            status_code=404,
            detail="Quotation not found"
        )

    return quotation


# -----------------------------
# GET QUOTATION ITEMS
# -----------------------------

@router.get(
    "/quotations/{quotation_id}/items",
    response_model=list[QuotationItemResponse]
)
def get_quotation_items(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    quotation = (
        db.query(Quotation)
        .filter(Quotation.id == quotation_id)
        .first()
    )

    if not quotation:
        raise HTTPException(
            status_code=404,
            detail="Quotation not found"
        )

    return (
        db.query(QuotationItem)
        .filter(
            QuotationItem.quotation_id == quotation_id
        )
        .all()
    )


# -----------------------------
# CREATE QUOTATION
# -----------------------------

@router.post(
    "/quotations/",
    response_model=QuotationResponse,
    status_code=201
)
def create_quotation(
    quotation_data: QuotationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    existing_quotation = (
        db.query(Quotation)
        .filter(
            Quotation.quotation_no
            == quotation_data.quotation_no
        )
        .first()
    )

    if existing_quotation:
        raise HTTPException(
            status_code=400,
            detail="Quotation number already exists"
        )

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == quotation_data.customer_id
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    if not quotation_data.items:
        raise HTTPException(
            status_code=400,
            detail="Quotation must contain at least one item"
        )

    quotation = Quotation(
        quotation_no=quotation_data.quotation_no,
        customer_id=quotation_data.customer_id,
        quotation_date=quotation_data.quotation_date,
        valid_until=quotation_data.valid_until,
        status=quotation_data.status,
        remarks=quotation_data.remarks,
        total_amount=0
    )

    db.add(quotation)
    db.flush()

    total_amount = 0

    for item_data in quotation_data.items:

        if item_data.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Quantity must be greater than zero"
            )

        if item_data.unit_price < 0:
            raise HTTPException(
                status_code=400,
                detail="Unit price cannot be negative"
            )

        if (
            item_data.product_id is None
            and not item_data.description
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Each quotation item must have "
                    "a product or description"
                )
            )

        if item_data.product_id is not None:
            product = (
                db.query(Product)
                .filter(
                    Product.id == item_data.product_id
                )
                .first()
            )

            if not product:
                raise HTTPException(
                    status_code=404,
                    detail="Product not found"
                )

        amount = (
            item_data.quantity
            * item_data.unit_price
        )

        quotation_item = QuotationItem(
            quotation_id=quotation.id,
            product_id=item_data.product_id,
            description=item_data.description,
            quantity=item_data.quantity,
            unit=item_data.unit,
            unit_price=item_data.unit_price,
            amount=amount
        )

        db.add(quotation_item)

        total_amount += amount

    quotation.total_amount = total_amount

    db.commit()
    db.refresh(quotation)

    return quotation


# -----------------------------
# UPDATE QUOTATION
# -----------------------------

@router.put(
    "/quotations/{quotation_id}",
    response_model=QuotationResponse
)
def update_quotation(
    quotation_id: int,
    quotation_data: QuotationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    quotation = (
        db.query(Quotation)
        .filter(Quotation.id == quotation_id)
        .first()
    )

    if not quotation:
        raise HTTPException(
            status_code=404,
            detail="Quotation not found"
        )

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == quotation_data.customer_id
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    duplicate_quotation = (
        db.query(Quotation)
        .filter(
            Quotation.quotation_no
            == quotation_data.quotation_no,
            Quotation.id != quotation_id
        )
        .first()
    )

    if duplicate_quotation:
        raise HTTPException(
            status_code=400,
            detail="Quotation number already exists"
        )

    if not quotation_data.items:
        raise HTTPException(
            status_code=400,
            detail="Quotation must contain at least one item"
        )

    quotation.quotation_no = (
        quotation_data.quotation_no
    )
    quotation.customer_id = (
        quotation_data.customer_id
    )
    quotation.quotation_date = (
        quotation_data.quotation_date
    )
    quotation.valid_until = (
        quotation_data.valid_until
    )
    quotation.status = quotation_data.status
    quotation.remarks = quotation_data.remarks

    db.query(QuotationItem).filter(
        QuotationItem.quotation_id == quotation_id
    ).delete(
        synchronize_session=False
    )

    total_amount = 0

    for item_data in quotation_data.items:

        if item_data.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Quantity must be greater than zero"
            )

        if item_data.unit_price < 0:
            raise HTTPException(
                status_code=400,
                detail="Unit price cannot be negative"
            )

        if (
            item_data.product_id is None
            and not item_data.description
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Each quotation item must have "
                    "a product or description"
                )
            )

        if item_data.product_id is not None:
            product = (
                db.query(Product)
                .filter(
                    Product.id == item_data.product_id
                )
                .first()
            )

            if not product:
                raise HTTPException(
                    status_code=404,
                    detail="Product not found"
                )

        amount = (
            item_data.quantity
            * item_data.unit_price
        )

        quotation_item = QuotationItem(
            quotation_id=quotation_id,
            product_id=item_data.product_id,
            description=item_data.description,
            quantity=item_data.quantity,
            unit=item_data.unit,
            unit_price=item_data.unit_price,
            amount=amount
        )

        db.add(quotation_item)

        total_amount += amount

    quotation.total_amount = total_amount

    db.commit()
    db.refresh(quotation)

    return quotation


# -----------------------------
# DELETE QUOTATION
# -----------------------------

@router.delete(
    "/quotations/{quotation_id}"
)
def delete_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    quotation = (
        db.query(Quotation)
        .filter(Quotation.id == quotation_id)
        .first()
    )

    if not quotation:
        raise HTTPException(
            status_code=404,
            detail="Quotation not found"
        )

    db.query(QuotationItem).filter(
        QuotationItem.quotation_id == quotation_id
    ).delete(
        synchronize_session=False
    )

    db.delete(quotation)
    db.commit()

    return {
        "message": "Quotation deleted successfully"
    }


# =====================================================
# SALES ORDER ENDPOINTS
# =====================================================

# -----------------------------
# GET ALL SALES ORDERS
# -----------------------------

@router.get(
    "/orders/",
    response_model=list[SalesOrderResponse]
)
def get_sales_orders(
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    return (
        db.query(SalesOrder)
        .order_by(SalesOrder.id.desc())
        .all()
    )


# -----------------------------
# GET SINGLE SALES ORDER
# -----------------------------

@router.get(
    "/orders/{sales_order_id}",
    response_model=SalesOrderResponse
)
def get_sales_order(
    sales_order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    sales_order = (
        db.query(SalesOrder)
        .filter(SalesOrder.id == sales_order_id)
        .first()
    )

    if not sales_order:
        raise HTTPException(
            status_code=404,
            detail="Sales order not found"
        )

    return sales_order


# -----------------------------
# GET SALES ORDER ITEMS
# -----------------------------

@router.get(
    "/orders/{sales_order_id}/items",
    response_model=list[SalesOrderItemResponse]
)
def get_sales_order_items(
    sales_order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    sales_order = (
        db.query(SalesOrder)
        .filter(SalesOrder.id == sales_order_id)
        .first()
    )

    if not sales_order:
        raise HTTPException(
            status_code=404,
            detail="Sales order not found"
        )

    return (
        db.query(SalesOrderItem)
        .filter(
            SalesOrderItem.sales_order_id
            == sales_order_id
        )
        .all()
    )


# -----------------------------
# CREATE SALES ORDER
# -----------------------------

@router.post(
    "/orders/",
    response_model=SalesOrderResponse,
    status_code=201
)
def create_sales_order(
    order_data: SalesOrderCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    existing_order = (
        db.query(SalesOrder)
        .filter(
            SalesOrder.sales_order_no
            == order_data.sales_order_no
        )
        .first()
    )

    if existing_order:
        raise HTTPException(
            status_code=400,
            detail="Sales order number already exists"
        )

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == order_data.customer_id
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    if order_data.quotation_id is not None:
        quotation = (
            db.query(Quotation)
            .filter(
                Quotation.id
                == order_data.quotation_id
            )
            .first()
        )

        if not quotation:
            raise HTTPException(
                status_code=404,
                detail="Quotation not found"
            )

    if not order_data.items:
        raise HTTPException(
            status_code=400,
            detail="Sales order must contain at least one item"
        )

    sales_order = SalesOrder(
        sales_order_no=order_data.sales_order_no,
        customer_id=order_data.customer_id,
        quotation_id=order_data.quotation_id,
        order_date=order_data.order_date,
        delivery_date=order_data.delivery_date,
        status=order_data.status,
        remarks=order_data.remarks,
        total_amount=0
    )

    db.add(sales_order)
    db.flush()

    total_amount = 0

    for item_data in order_data.items:

        if item_data.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Quantity must be greater than zero"
            )

        if item_data.unit_price < 0:
            raise HTTPException(
                status_code=400,
                detail="Unit price cannot be negative"
            )

        if item_data.product_id is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Each sales order item "
                    "must have a product"
                )
            )

        product = (
            db.query(Product)
            .filter(
                Product.id == item_data.product_id
            )
            .first()
        )

        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        amount = (
            item_data.quantity
            * item_data.unit_price
        )

        order_item = SalesOrderItem(
            sales_order_id=sales_order.id,
            product_id=item_data.product_id,
            fabric_id=item_data.fabric_id,
            yarn_id=item_data.yarn_id,
            color_id=item_data.color_id,
            quantity=item_data.quantity,
            unit=item_data.unit,
            unit_price=item_data.unit_price,
            amount=amount,
            required_yarn_qty=(
                item_data.required_yarn_qty
            ),
            required_fabric_qty=(
                item_data.required_fabric_qty
            )
        )

        db.add(order_item)

        total_amount += amount

    sales_order.total_amount = total_amount

    db.commit()
    db.refresh(sales_order)

    return sales_order


# -----------------------------
# UPDATE SALES ORDER
# -----------------------------

@router.put(
    "/orders/{sales_order_id}",
    response_model=SalesOrderResponse
)
def update_sales_order(
    sales_order_id: int,
    order_data: SalesOrderCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    sales_order = (
        db.query(SalesOrder)
        .filter(
            SalesOrder.id == sales_order_id
        )
        .first()
    )

    if not sales_order:
        raise HTTPException(
            status_code=404,
            detail="Sales order not found"
        )

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == order_data.customer_id
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    duplicate_order = (
        db.query(SalesOrder)
        .filter(
            SalesOrder.sales_order_no
            == order_data.sales_order_no,
            SalesOrder.id != sales_order_id
        )
        .first()
    )

    if duplicate_order:
        raise HTTPException(
            status_code=400,
            detail="Sales order number already exists"
        )

    if order_data.quotation_id is not None:
        quotation = (
            db.query(Quotation)
            .filter(
                Quotation.id
                == order_data.quotation_id
            )
            .first()
        )

        if not quotation:
            raise HTTPException(
                status_code=404,
                detail="Quotation not found"
            )

    if not order_data.items:
        raise HTTPException(
            status_code=400,
            detail="Sales order must contain at least one item"
        )

    sales_order.sales_order_no = (
        order_data.sales_order_no
    )
    sales_order.customer_id = order_data.customer_id
    sales_order.quotation_id = (
        order_data.quotation_id
    )
    sales_order.order_date = order_data.order_date
    sales_order.delivery_date = (
        order_data.delivery_date
    )
    sales_order.status = order_data.status
    sales_order.remarks = order_data.remarks

    db.query(SalesOrderItem).filter(
        SalesOrderItem.sales_order_id
        == sales_order_id
    ).delete(
        synchronize_session=False
    )

    total_amount = 0

    for item_data in order_data.items:

        if item_data.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Quantity must be greater than zero"
            )

        if item_data.unit_price < 0:
            raise HTTPException(
                status_code=400,
                detail="Unit price cannot be negative"
            )

        if item_data.product_id is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Each sales order item "
                    "must have a product"
                )
            )

        product = (
            db.query(Product)
            .filter(
                Product.id == item_data.product_id
            )
            .first()
        )

        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        amount = (
            item_data.quantity
            * item_data.unit_price
        )

        order_item = SalesOrderItem(
            sales_order_id=sales_order_id,
            product_id=item_data.product_id,
            fabric_id=item_data.fabric_id,
            yarn_id=item_data.yarn_id,
            color_id=item_data.color_id,
            quantity=item_data.quantity,
            unit=item_data.unit,
            unit_price=item_data.unit_price,
            amount=amount,
            required_yarn_qty=(
                item_data.required_yarn_qty
            ),
            required_fabric_qty=(
                item_data.required_fabric_qty
            )
        )

        db.add(order_item)

        total_amount += amount

    sales_order.total_amount = total_amount

    db.commit()
    db.refresh(sales_order)

    return sales_order


# -----------------------------
# DELETE SALES ORDER
# -----------------------------

@router.delete(
    "/orders/{sales_order_id}"
)
def delete_sales_order(
    sales_order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    sales_order = (
        db.query(SalesOrder)
        .filter(
            SalesOrder.id == sales_order_id
        )
        .first()
    )

    if not sales_order:
        raise HTTPException(
            status_code=404,
            detail="Sales order not found"
        )

    db.query(SalesOrderItem).filter(
        SalesOrderItem.sales_order_id
        == sales_order_id
    ).delete(
        synchronize_session=False
    )

    db.delete(sales_order)
    db.commit()

    return {
        "message": "Sales order deleted successfully"
    }