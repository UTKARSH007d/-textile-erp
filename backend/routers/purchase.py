from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import SessionLocal
from models.purchase import PurchaseOrder, PurchaseOrderItem
from models.supplier import Supplier
from permissions import require_manager_or_admin


router = APIRouter(
    prefix="/api/purchase-orders",
    tags=["Purchase Orders"],
    dependencies=[Depends(require_manager_or_admin)]
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# -----------------------------
# Request Schemas
# -----------------------------

class PurchaseOrderItemCreate(BaseModel):
    yarn_id: Optional[int] = None
    fabric_id: Optional[int] = None
    description: Optional[str] = None
    quantity: float
    unit: str = "kg"
    unit_price: float


class PurchaseOrderCreate(BaseModel):
    purchase_order_no: str
    supplier_id: int
    order_date: date
    expected_date: Optional[date] = None
    status: str = "Pending"
    remarks: Optional[str] = None
    items: list[PurchaseOrderItemCreate]


# -----------------------------
# Response Schemas
# -----------------------------

class PurchaseOrderItemResponse(BaseModel):
    id: int
    purchase_order_id: int
    yarn_id: Optional[int]
    fabric_id: Optional[int]
    description: Optional[str]
    quantity: float
    unit: str
    unit_price: float
    amount: float

    model_config = ConfigDict(from_attributes=True)


class PurchaseOrderResponse(BaseModel):
    id: int
    purchase_order_no: str
    supplier_id: int
    order_date: date
    expected_date: Optional[date]
    status: str
    total_amount: float
    remarks: Optional[str]

    model_config = ConfigDict(from_attributes=True)


# -----------------------------
# GET ALL PURCHASE ORDERS
# -----------------------------

@router.get("/", response_model=list[PurchaseOrderResponse])
def get_purchase_orders(
    db: Session = Depends(get_db)
):
    return (
        db.query(PurchaseOrder)
        .order_by(PurchaseOrder.id.desc())
        .all()
    )


# -----------------------------
# GET SINGLE PURCHASE ORDER
# -----------------------------

@router.get(
    "/{purchase_order_id}",
    response_model=PurchaseOrderResponse
)
def get_purchase_order(
    purchase_order_id: int,
    db: Session = Depends(get_db)
):
    purchase_order = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == purchase_order_id)
        .first()
    )

    if not purchase_order:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found"
        )

    return purchase_order


# -----------------------------
# CREATE PURCHASE ORDER
# -----------------------------

@router.post(
    "/",
    response_model=PurchaseOrderResponse,
    status_code=201
)
def create_purchase_order(
    purchase_data: PurchaseOrderCreate,
    db: Session = Depends(get_db)
):
    # Check duplicate PO number
    existing_po = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.purchase_order_no
            == purchase_data.purchase_order_no
        )
        .first()
    )

    if existing_po:
        raise HTTPException(
            status_code=400,
            detail="Purchase order number already exists"
        )

    # Check supplier exists
    supplier = (
        db.query(Supplier)
        .filter(
            Supplier.id == purchase_data.supplier_id
        )
        .first()
    )

    if not supplier:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found"
        )

    # At least one item required
    if not purchase_data.items:
        raise HTTPException(
            status_code=400,
            detail="Purchase order must contain at least one item"
        )

    purchase_order = PurchaseOrder(
        purchase_order_no=purchase_data.purchase_order_no,
        supplier_id=purchase_data.supplier_id,
        order_date=purchase_data.order_date,
        expected_date=purchase_data.expected_date,
        status=purchase_data.status,
        remarks=purchase_data.remarks,
        total_amount=0
    )

    db.add(purchase_order)
    db.flush()

    total_amount = 0

    for item_data in purchase_data.items:

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

        # An item should represent either yarn or fabric.
        if item_data.yarn_id is None and item_data.fabric_id is None:
            if not item_data.description:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Each item must have a yarn, fabric, "
                        "or description"
                    )
                )

        if (
            item_data.yarn_id is not None
            and item_data.fabric_id is not None
        ):
            raise HTTPException(
                status_code=400,
                detail="An item cannot contain both yarn and fabric"
            )

        amount = item_data.quantity * item_data.unit_price

        purchase_item = PurchaseOrderItem(
            purchase_order_id=purchase_order.id,
            yarn_id=item_data.yarn_id,
            fabric_id=item_data.fabric_id,
            description=item_data.description,
            quantity=item_data.quantity,
            unit=item_data.unit,
            unit_price=item_data.unit_price,
            amount=amount
        )

        db.add(purchase_item)

        total_amount += amount

    purchase_order.total_amount = total_amount

    db.commit()
    db.refresh(purchase_order)

    return purchase_order


# -----------------------------
# UPDATE PURCHASE ORDER
# -----------------------------

@router.put(
    "/{purchase_order_id}",
    response_model=PurchaseOrderResponse
)
def update_purchase_order(
    purchase_order_id: int,
    purchase_data: PurchaseOrderCreate,
    db: Session = Depends(get_db)
):
    purchase_order = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == purchase_order_id)
        .first()
    )

    if not purchase_order:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found"
        )

    supplier = (
        db.query(Supplier)
        .filter(
            Supplier.id == purchase_data.supplier_id
        )
        .first()
    )

    if not supplier:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found"
        )

    duplicate_po = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.purchase_order_no
            == purchase_data.purchase_order_no,
            PurchaseOrder.id != purchase_order_id
        )
        .first()
    )

    if duplicate_po:
        raise HTTPException(
            status_code=400,
            detail="Purchase order number already exists"
        )

    if not purchase_data.items:
        raise HTTPException(
            status_code=400,
            detail="Purchase order must contain at least one item"
        )

    purchase_order.purchase_order_no = (
        purchase_data.purchase_order_no
    )
    purchase_order.supplier_id = purchase_data.supplier_id
    purchase_order.order_date = purchase_data.order_date
    purchase_order.expected_date = (
        purchase_data.expected_date
    )
    purchase_order.status = purchase_data.status
    purchase_order.remarks = purchase_data.remarks

    # Remove old items
    db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.purchase_order_id
        == purchase_order_id
    ).delete(
        synchronize_session=False
    )

    total_amount = 0

    for item_data in purchase_data.items:

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

        if item_data.yarn_id is None and item_data.fabric_id is None:
            if not item_data.description:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Each item must have a yarn, fabric, "
                        "or description"
                    )
                )

        if (
            item_data.yarn_id is not None
            and item_data.fabric_id is not None
        ):
            raise HTTPException(
                status_code=400,
                detail="An item cannot contain both yarn and fabric"
            )

        amount = item_data.quantity * item_data.unit_price

        purchase_item = PurchaseOrderItem(
            purchase_order_id=purchase_order_id,
            yarn_id=item_data.yarn_id,
            fabric_id=item_data.fabric_id,
            description=item_data.description,
            quantity=item_data.quantity,
            unit=item_data.unit,
            unit_price=item_data.unit_price,
            amount=amount
        )

        db.add(purchase_item)

        total_amount += amount

    purchase_order.total_amount = total_amount

    db.commit()
    db.refresh(purchase_order)

    return purchase_order


# -----------------------------
# DELETE PURCHASE ORDER
# -----------------------------

@router.delete("/{purchase_order_id}")
def delete_purchase_order(
    purchase_order_id: int,
    db: Session = Depends(get_db)
):
    purchase_order = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == purchase_order_id)
        .first()
    )

    if not purchase_order:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found"
        )

    db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.purchase_order_id
        == purchase_order_id
    ).delete(
        synchronize_session=False
    )

    db.delete(purchase_order)
    db.commit()

    return {
        "message": "Purchase order deleted successfully"
    }