from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import SessionLocal
from auth import get_current_user
from models.inventory import (
    Inventory,
    StockMovement,
)


router = APIRouter(
    prefix="/api/inventory",
    tags=["Inventory"],
    dependencies=[Depends(get_current_user)]
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
# RESPONSE SCHEMAS
# =========================================================

class InventoryResponse(BaseModel):

    id: int

    yarn_id: int | None
    fabric_id: int | None
    product_id: int | None

    warehouse_id: int

    quantity: float
    reserved_quantity: float

    unit: str
    reorder_level: float

    class Config:
        from_attributes = True


class StockMovementResponse(BaseModel):

    id: int
    inventory_id: int

    movement_type: str
    quantity: float

    reference_type: str | None
    reference_id: int | None

    from_warehouse_id: int | None
    to_warehouse_id: int | None

    remarks: str | None

    class Config:
        from_attributes = True


# =========================================================
# GET ALL INVENTORY
# =========================================================

@router.get(
    "/",
    response_model=list[InventoryResponse]
)
def get_inventory(
    db: Session = Depends(get_db)
):

    return (
        db.query(Inventory)
        .order_by(
            Inventory.id.desc()
        )
        .all()
    )


# =========================================================
# STOCK MOVEMENTS
#
# IMPORTANT:
# Keep this static route before /{inventory_id}.
# =========================================================

@router.get(
    "/movements/all",
    response_model=list[StockMovementResponse]
)
def get_stock_movements(
    db: Session = Depends(get_db)
):

    return (
        db.query(StockMovement)
        .order_by(
            StockMovement.id.desc()
        )
        .all()
    )


# =========================================================
# GET SINGLE INVENTORY
# =========================================================

@router.get(
    "/{inventory_id}",
    response_model=InventoryResponse
)
def get_inventory_item(
    inventory_id: int,
    db: Session = Depends(get_db)
):

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == inventory_id
        )
        .first()
    )

    if not inventory:

        raise HTTPException(
            status_code=404,
            detail="Inventory record not found"
        )

    return inventory


# =========================================================
# GET MOVEMENTS FOR INVENTORY
# =========================================================

@router.get(
    "/{inventory_id}/movements",
    response_model=list[StockMovementResponse]
)
def get_inventory_movements(
    inventory_id: int,
    db: Session = Depends(get_db)
):

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.id == inventory_id
        )
        .first()
    )

    if not inventory:

        raise HTTPException(
            status_code=404,
            detail="Inventory record not found"
        )

    return (
        db.query(StockMovement)
        .filter(
            StockMovement.inventory_id ==
            inventory_id
        )
        .order_by(
            StockMovement.id.desc()
        )
        .all()
    )