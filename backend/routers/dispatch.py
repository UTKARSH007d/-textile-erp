from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import date

from database import SessionLocal
from models.dispatch import Dispatch, DispatchItem
from models.inventory import Inventory, StockMovement
from permissions import require_authenticated_user


router = APIRouter(
    prefix="/api/dispatch",
    tags=["Dispatch"]
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
# REQUEST SCHEMAS
# =========================================================

class DispatchItemCreate(BaseModel):
    product_id: int | None = None
    fabric_id: int | None = None
    quantity: float = Field(gt=0)
    unit: str = "meter"


class DispatchCreate(BaseModel):
    dispatch_no: str
    sales_order_id: int | None = None
    customer_id: int
    dispatch_date: date
    status: str = "Pending"
    transporter: str | None = None
    vehicle_no: str | None = None
    tracking_no: str | None = None
    remarks: str | None = None
    items: list[DispatchItemCreate] = []


class DispatchUpdate(BaseModel):
    dispatch_no: str | None = None
    sales_order_id: int | None = None
    customer_id: int | None = None
    dispatch_date: date | None = None
    status: str | None = None
    transporter: str | None = None
    vehicle_no: str | None = None
    tracking_no: str | None = None
    remarks: str | None = None
    items: list[DispatchItemCreate] | None = None


# =========================================================
# RESPONSE SCHEMAS
# =========================================================

class DispatchItemResponse(BaseModel):
    id: int
    product_id: int | None
    fabric_id: int | None
    quantity: float
    unit: str

    class Config:
        from_attributes = True


class DispatchResponse(BaseModel):
    id: int
    dispatch_no: str
    sales_order_id: int | None
    customer_id: int
    dispatch_date: date
    status: str
    transporter: str | None
    vehicle_no: str | None
    tracking_no: str | None
    remarks: str | None
    items: list[DispatchItemResponse] = []



# =========================================================
# HELPERS
# =========================================================

FINAL_STATUSES = {"Dispatched", "Delivered"}


def validate_status(status: str):
    allowed = {"Pending", "Dispatched", "Delivered", "Cancelled"}

    if status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid dispatch status. "
                "Use Pending, Dispatched, Delivered or Cancelled."
            )
        )


def validate_item(item: DispatchItemCreate):
    if item.product_id is None and item.fabric_id is None:
        raise HTTPException(
            status_code=400,
            detail="Dispatch item must contain product_id or fabric_id."
        )

    if item.product_id is not None and item.fabric_id is not None:
        raise HTTPException(
            status_code=400,
            detail="Dispatch item cannot contain both product_id and fabric_id."
        )

    if item.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Dispatch quantity must be greater than zero."
        )


def get_items(db: Session, dispatch_id: int):
    return (
        db.query(DispatchItem)
        .filter(DispatchItem.dispatch_id == dispatch_id)
        .order_by(DispatchItem.id)
        .all()
    )


def build_response(db: Session, dispatch: Dispatch):
    return {
        "id": dispatch.id,
        "dispatch_no": dispatch.dispatch_no,
        "sales_order_id": dispatch.sales_order_id,
        "customer_id": dispatch.customer_id,
        "dispatch_date": dispatch.dispatch_date,
        "status": dispatch.status,
        "transporter": dispatch.transporter,
        "vehicle_no": dispatch.vehicle_no,
        "tracking_no": dispatch.tracking_no,
        "remarks": dispatch.remarks,
        "items": get_items(db, dispatch.id),
    }


def get_inventory_for_item(
    db: Session,
    item: DispatchItem
):
    query = db.query(Inventory)

    if item.product_id is not None:
        query = query.filter(
            Inventory.product_id == item.product_id
        )
    else:
        query = query.filter(
            Inventory.fabric_id == item.fabric_id
        )

    # Prefer inventory records that have enough available stock.
    inventory = (
        query
        .filter(
            (Inventory.quantity - Inventory.reserved_quantity)
            >= item.quantity
        )
        .order_by(Inventory.id.asc())
        .first()
    )

    return inventory


def dispatch_already_processed(
    db: Session,
    dispatch_id: int
) -> bool:
    return (
        db.query(StockMovement)
        .filter(
            StockMovement.reference_type == "Dispatch",
            StockMovement.reference_id == dispatch_id,
            StockMovement.movement_type == "Dispatch Out",
        )
        .first()
        is not None
    )


def process_dispatch_inventory(
    db: Session,
    dispatch: Dispatch
):
    """
    Reduce finished-goods/material inventory when a dispatch becomes
    Dispatched or Delivered.

    Inventory is reduced exactly once. A StockMovement is created for
    every dispatch item so the transaction remains auditable.
    """

    if dispatch_already_processed(db, dispatch.id):
        return

    items = get_items(db, dispatch.id)

    if not items:
        raise HTTPException(
            status_code=400,
            detail="A dispatch must contain at least one item before it can be dispatched."
        )

    # Validate all inventory first so a partial stock update never occurs.
    inventory_pairs = []

    for item in items:
        inventory = get_inventory_for_item(db, item)

        if not inventory:
            material = (
                f"product #{item.product_id}"
                if item.product_id is not None
                else f"fabric #{item.fabric_id}"
            )

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient available inventory for {material}. "
                    f"Required: {item.quantity} {item.unit}."
                )
            )

        inventory_unit = (inventory.unit or "").lower()
        item_unit = (item.unit or "").lower()

        if inventory_unit and item_unit and inventory_unit != item_unit:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Unit mismatch for inventory item. "
                    f"Inventory uses '{inventory.unit}' but dispatch uses '{item.unit}'."
                )
            )

        available = (
            (inventory.quantity or 0)
            - (inventory.reserved_quantity or 0)
        )

        if available < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient available inventory. "
                    f"Available: {available} {inventory.unit}, "
                    f"required: {item.quantity} {item.unit}."
                )
            )

        inventory_pairs.append((item, inventory))

    # Apply all stock reductions after every item has passed validation.
    for item, inventory in inventory_pairs:
        inventory.quantity -= item.quantity

        movement = StockMovement(
            inventory_id=inventory.id,
            movement_type="Dispatch Out",
            quantity=item.quantity,
            reference_type="Dispatch",
            reference_id=dispatch.id,
            from_warehouse_id=inventory.warehouse_id,
            to_warehouse_id=None,
            remarks=(
                f"{item.quantity} {item.unit} dispatched in "
                f"dispatch {dispatch.dispatch_no}"
            ),
        )

        db.add(movement)


# =========================================================
# GET ALL DISPATCHES
# =========================================================

@router.get(
    "/",
    response_model=list[DispatchResponse]
)
def get_dispatches(
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated_user)
):
    dispatches = (
        db.query(Dispatch)
        .order_by(Dispatch.id.desc())
        .all()
    )

    return [
        build_response(db, dispatch)
        for dispatch in dispatches
    ]


# =========================================================
# GET SINGLE DISPATCH
# =========================================================

@router.get(
    "/{dispatch_id}",
    response_model=DispatchResponse
)
def get_dispatch(
    dispatch_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated_user)
):
    dispatch = (
        db.query(Dispatch)
        .filter(Dispatch.id == dispatch_id)
        .first()
    )

    if not dispatch:
        raise HTTPException(
            status_code=404,
            detail="Dispatch not found"
        )

    return build_response(db, dispatch)


# =========================================================
# CREATE DISPATCH
# =========================================================

@router.post(
    "/",
    response_model=DispatchResponse
)
def create_dispatch(
    data: DispatchCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated_user)
):
    validate_status(data.status)

    if not data.items:
        raise HTTPException(
            status_code=400,
            detail="At least one dispatch item is required."
        )

    existing_dispatch = (
        db.query(Dispatch)
        .filter(Dispatch.dispatch_no == data.dispatch_no)
        .first()
    )

    if existing_dispatch:
        raise HTTPException(
            status_code=400,
            detail="Dispatch number already exists."
        )

    for item in data.items:
        validate_item(item)

    try:
        dispatch = Dispatch(
            dispatch_no=data.dispatch_no,
            sales_order_id=data.sales_order_id,
            customer_id=data.customer_id,
            dispatch_date=data.dispatch_date,
            status=data.status,
            transporter=data.transporter,
            vehicle_no=data.vehicle_no,
            tracking_no=data.tracking_no,
            remarks=data.remarks,
        )

        db.add(dispatch)
        db.flush()

        for item in data.items:
            db.add(
                DispatchItem(
                    dispatch_id=dispatch.id,
                    product_id=item.product_id,
                    fabric_id=item.fabric_id,
                    quantity=item.quantity,
                    unit=item.unit,
                )
            )

        db.flush()

        if data.status in FINAL_STATUSES:
            process_dispatch_inventory(db, dispatch)

        db.commit()
        db.refresh(dispatch)

        return build_response(db, dispatch)

    except HTTPException:
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        print("Create dispatch error:", error)
        raise HTTPException(
            status_code=500,
            detail="Unable to create dispatch."
        )


# =========================================================
# UPDATE DISPATCH
# =========================================================

@router.put(
    "/{dispatch_id}",
    response_model=DispatchResponse
)
def update_dispatch(
    dispatch_id: int,
    data: DispatchUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated_user)
):
    dispatch = (
        db.query(Dispatch)
        .filter(Dispatch.id == dispatch_id)
        .first()
    )

    if not dispatch:
        raise HTTPException(
            status_code=404,
            detail="Dispatch not found"
        )

    if data.status is not None:
        validate_status(data.status)

    was_processed = dispatch_already_processed(
        db,
        dispatch.id
    )

    # Once stock has been deducted, changing the items would make the
    # stock movement inaccurate. Keep the prototype data consistent.
    if was_processed and data.items is not None:
        raise HTTPException(
            status_code=400,
            detail=(
                "This dispatch has already affected inventory. "
                "Dispatch items cannot be changed."
            )
        )

    if was_processed and data.status == "Pending":
        raise HTTPException(
            status_code=400,
            detail=(
                "A dispatched record cannot be moved back to Pending "
                "because inventory has already been deducted."
            )
        )

    try:
        if data.dispatch_no is not None:
            existing_dispatch = (
                db.query(Dispatch)
                .filter(
                    Dispatch.dispatch_no == data.dispatch_no,
                    Dispatch.id != dispatch_id
                )
                .first()
            )

            if existing_dispatch:
                raise HTTPException(
                    status_code=400,
                    detail="Dispatch number already exists."
                )

            dispatch.dispatch_no = data.dispatch_no

        if data.sales_order_id is not None:
            dispatch.sales_order_id = data.sales_order_id

        if data.customer_id is not None:
            dispatch.customer_id = data.customer_id

        if data.dispatch_date is not None:
            dispatch.dispatch_date = data.dispatch_date

        if data.transporter is not None:
            dispatch.transporter = data.transporter

        if data.vehicle_no is not None:
            dispatch.vehicle_no = data.vehicle_no

        if data.tracking_no is not None:
            dispatch.tracking_no = data.tracking_no

        if data.remarks is not None:
            dispatch.remarks = data.remarks

        if data.items is not None:
            if not data.items:
                raise HTTPException(
                    status_code=400,
                    detail="At least one dispatch item is required."
                )

            for item in data.items:
                validate_item(item)

            db.query(DispatchItem).filter(
                DispatchItem.dispatch_id == dispatch_id
            ).delete(synchronize_session=False)

            for item in data.items:
                db.add(
                    DispatchItem(
                        dispatch_id=dispatch.id,
                        product_id=item.product_id,
                        fabric_id=item.fabric_id,
                        quantity=item.quantity,
                        unit=item.unit,
                    )
                )

        old_status = dispatch.status

        if data.status is not None:
            dispatch.status = data.status

        db.flush()

        # Process stock only when the dispatch crosses into a final
        # shipping state for the first time.
        if (
            not was_processed
            and old_status not in FINAL_STATUSES
            and dispatch.status in FINAL_STATUSES
        ):
            process_dispatch_inventory(
                db,
                dispatch
            )

        db.commit()
        db.refresh(dispatch)

        return build_response(db, dispatch)

    except HTTPException:
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        print("Update dispatch error:", error)
        raise HTTPException(
            status_code=500,
            detail="Unable to update dispatch."
        )


# =========================================================
# DELETE DISPATCH
# =========================================================

@router.delete(
    "/{dispatch_id}"
)
def delete_dispatch(
    dispatch_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated_user)
):
    dispatch = (
        db.query(Dispatch)
        .filter(Dispatch.id == dispatch_id)
        .first()
    )

    if not dispatch:
        raise HTTPException(
            status_code=404,
            detail="Dispatch not found"
        )

    if dispatch_already_processed(db, dispatch.id):
        raise HTTPException(
            status_code=400,
            detail=(
                "This dispatch has already affected inventory "
                "and cannot be deleted."
            )
        )

    try:
        db.query(DispatchItem).filter(
            DispatchItem.dispatch_id == dispatch_id
        ).delete(synchronize_session=False)

        db.delete(dispatch)
        db.commit()

        return {
            "message": "Dispatch deleted successfully"
        }

    except Exception as error:
        db.rollback()
        print("Delete dispatch error:", error)
        raise HTTPException(
            status_code=500,
            detail="Unable to delete dispatch."
        )
