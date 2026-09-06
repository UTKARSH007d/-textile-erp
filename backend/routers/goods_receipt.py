from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import SessionLocal
from models.purchase import (
    GoodsReceipt,
    GoodsReceiptItem,
    PurchaseOrder,
    PurchaseOrderItem,
)

from models.inventory import (
    Inventory,
    StockMovement,
)

from models.master import (
    Yarn,
    Fabric,
    Warehouse,
)

from permissions import require_manager_or_admin


router = APIRouter(
    prefix="/api/goods-receipts",
    tags=["Goods Receipts"]
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ---------------------------------
# REQUEST SCHEMAS
# ---------------------------------

class GoodsReceiptItemCreate(BaseModel):
    yarn_id: Optional[int] = None
    fabric_id: Optional[int] = None
    received_quantity: float
    unit: str = "kg"
    warehouse_id: int


class GoodsReceiptCreate(BaseModel):
    receipt_no: str
    purchase_order_id: int
    receipt_date: date
    status: str = "Received"
    remarks: Optional[str] = None
    items: list[GoodsReceiptItemCreate]


# ---------------------------------
# RESPONSE SCHEMAS
# ---------------------------------

class GoodsReceiptItemResponse(BaseModel):
    id: int
    goods_receipt_id: int
    yarn_id: Optional[int]
    fabric_id: Optional[int]
    received_quantity: float
    unit: str
    warehouse_id: int

    model_config = ConfigDict(from_attributes=True)


class GoodsReceiptResponse(BaseModel):
    id: int
    receipt_no: str
    purchase_order_id: int
    receipt_date: date
    status: str
    remarks: Optional[str]

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------
# GET ALL GOODS RECEIPTS
# ---------------------------------

@router.get(
    "/",
    response_model=list[GoodsReceiptResponse]
)
def get_goods_receipts(
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    return (
        db.query(GoodsReceipt)
        .order_by(GoodsReceipt.id.desc())
        .all()
    )


# ---------------------------------
# GET SINGLE GOODS RECEIPT
# ---------------------------------

@router.get(
    "/{goods_receipt_id}",
    response_model=GoodsReceiptResponse
)
def get_goods_receipt(
    goods_receipt_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    receipt = (
        db.query(GoodsReceipt)
        .filter(
            GoodsReceipt.id == goods_receipt_id
        )
        .first()
    )

    if not receipt:
        raise HTTPException(
            status_code=404,
            detail="Goods receipt not found"
        )

    return receipt


# ---------------------------------
# CREATE GOODS RECEIPT
# ---------------------------------

@router.post(
    "/",
    response_model=GoodsReceiptResponse,
    status_code=201
)
def create_goods_receipt(
    receipt_data: GoodsReceiptCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    try:
        # Check duplicate receipt number
        existing_receipt = (
            db.query(GoodsReceipt)
            .filter(
                GoodsReceipt.receipt_no
                == receipt_data.receipt_no
            )
            .first()
        )

        if existing_receipt:
            raise HTTPException(
                status_code=400,
                detail="Receipt number already exists"
            )

        # Check purchase order
        purchase_order = (
            db.query(PurchaseOrder)
            .filter(
                PurchaseOrder.id
                == receipt_data.purchase_order_id
            )
            .first()
        )

        if not purchase_order:
            raise HTTPException(
                status_code=404,
                detail="Purchase order not found"
            )

        # At least one item
        if not receipt_data.items:
            raise HTTPException(
                status_code=400,
                detail="Goods receipt must contain at least one item"
            )

        # ---------------------------------
        # CREATE GOODS RECEIPT HEADER
        # ---------------------------------

        receipt = GoodsReceipt(
            receipt_no=receipt_data.receipt_no,
            purchase_order_id=receipt_data.purchase_order_id,
            receipt_date=receipt_data.receipt_date,
            status=receipt_data.status,
            remarks=receipt_data.remarks
        )

        db.add(receipt)
        db.flush()

        # ---------------------------------
        # PROCESS EACH RECEIPT ITEM
        # ---------------------------------

        for item_data in receipt_data.items:

            # Validate quantity
            if item_data.received_quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Received quantity must "
                        "be greater than zero"
                    )
                )

            # Must have yarn or fabric
            if (
                item_data.yarn_id is None
                and item_data.fabric_id is None
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Each receipt item must "
                        "have a yarn or fabric"
                    )
                )

            # Cannot have both
            if (
                item_data.yarn_id is not None
                and item_data.fabric_id is not None
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "An item cannot contain "
                        "both yarn and fabric"
                    )
                )

            # ---------------------------------
            # VALIDATE MATERIAL
            # ---------------------------------

            if item_data.yarn_id is not None:

                yarn = (
                    db.query(Yarn)
                    .filter(
                        Yarn.id == item_data.yarn_id
                    )
                    .first()
                )

                if not yarn:
                    raise HTTPException(
                        status_code=404,
                        detail="Yarn not found"
                    )

            if item_data.fabric_id is not None:

                fabric = (
                    db.query(Fabric)
                    .filter(
                        Fabric.id == item_data.fabric_id
                    )
                    .first()
                )

                if not fabric:
                    raise HTTPException(
                        status_code=404,
                        detail="Fabric not found"
                    )

            # ---------------------------------
            # VALIDATE WAREHOUSE
            # ---------------------------------

            warehouse = (
                db.query(Warehouse)
                .filter(
                    Warehouse.id
                    == item_data.warehouse_id
                )
                .first()
            )

            if not warehouse:
                raise HTTPException(
                    status_code=404,
                    detail="Warehouse not found"
                )

            # ---------------------------------
            # CREATE GOODS RECEIPT ITEM
            # ---------------------------------

            receipt_item = GoodsReceiptItem(
                goods_receipt_id=receipt.id,
                yarn_id=item_data.yarn_id,
                fabric_id=item_data.fabric_id,
                received_quantity=item_data.received_quantity,
                unit=item_data.unit,
                warehouse_id=item_data.warehouse_id
            )

            db.add(receipt_item)

            # ---------------------------------
            # FIND EXISTING INVENTORY
            # ---------------------------------

            inventory_query = (
                db.query(Inventory)
                .filter(
                    Inventory.warehouse_id
                    == item_data.warehouse_id
                )
            )

            if item_data.yarn_id is not None:
                inventory_query = (
                    inventory_query.filter(
                        Inventory.yarn_id
                        == item_data.yarn_id
                    )
                )

            if item_data.fabric_id is not None:
                inventory_query = (
                    inventory_query.filter(
                        Inventory.fabric_id
                        == item_data.fabric_id
                    )
                )

            inventory = (
                inventory_query.first()
            )

            # ---------------------------------
            # CREATE INVENTORY IF NOT EXISTS
            # ---------------------------------

            if not inventory:

                inventory = Inventory(
                    yarn_id=item_data.yarn_id,
                    fabric_id=item_data.fabric_id,
                    product_id=None,
                    warehouse_id=item_data.warehouse_id,
                    quantity=0,
                    reserved_quantity=0,
                    unit=item_data.unit,
                    reorder_level=0
                )

                db.add(inventory)
                db.flush()

            # ---------------------------------
            # INCREASE STOCK
            # ---------------------------------

            inventory.quantity += (
                item_data.received_quantity
            )

            db.flush()

            # ---------------------------------
            # CREATE STOCK MOVEMENT
            # ---------------------------------

            stock_movement = StockMovement(
                inventory_id=inventory.id,
                movement_type="IN",
                quantity=item_data.received_quantity,
                reference_type="GoodsReceipt",
                reference_id=receipt.id,
                from_warehouse_id=None,
                to_warehouse_id=item_data.warehouse_id,
                remarks=(
                    f"Stock received through "
                    f"Goods Receipt "
                    f"{receipt.receipt_no}"
                )
            )

            db.add(stock_movement)

        # ---------------------------------
        # SAVE EVERYTHING TOGETHER
        # ---------------------------------

        db.commit()
        db.refresh(receipt)

        return receipt

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

        db.add(receipt_item)

    db.commit()
    db.refresh(receipt)

    return receipt


# ---------------------------------
# UPDATE GOODS RECEIPT
# ---------------------------------

@router.put(
    "/{goods_receipt_id}",
    response_model=GoodsReceiptResponse
)
def update_goods_receipt(
    goods_receipt_id: int,
    receipt_data: GoodsReceiptCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    receipt = (
        db.query(GoodsReceipt)
        .filter(
            GoodsReceipt.id == goods_receipt_id
        )
        .first()
    )

    if not receipt:
        raise HTTPException(
            status_code=404,
            detail="Goods receipt not found"
        )

    purchase_order = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.id
            == receipt_data.purchase_order_id
        )
        .first()
    )

    if not purchase_order:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found"
        )

    duplicate_receipt = (
        db.query(GoodsReceipt)
        .filter(
            GoodsReceipt.receipt_no
            == receipt_data.receipt_no,
            GoodsReceipt.id != goods_receipt_id
        )
        .first()
    )

    if duplicate_receipt:
        raise HTTPException(
            status_code=400,
            detail="Receipt number already exists"
        )

    if not receipt_data.items:
        raise HTTPException(
            status_code=400,
            detail="Goods receipt must contain at least one item"
        )

    receipt.receipt_no = receipt_data.receipt_no
    receipt.purchase_order_id = (
        receipt_data.purchase_order_id
    )
    receipt.receipt_date = receipt_data.receipt_date
    receipt.status = receipt_data.status
    receipt.remarks = receipt_data.remarks

    # Delete old items
    db.query(GoodsReceiptItem).filter(
        GoodsReceiptItem.goods_receipt_id
        == goods_receipt_id
    ).delete(
        synchronize_session=False
    )

    for item_data in receipt_data.items:

        if item_data.received_quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Received quantity must be greater than zero"
            )

        if (
            item_data.yarn_id is None
            and item_data.fabric_id is None
        ):
            raise HTTPException(
                status_code=400,
                detail="Each receipt item must have a yarn or fabric"
            )

        if (
            item_data.yarn_id is not None
            and item_data.fabric_id is not None
        ):
            raise HTTPException(
                status_code=400,
                detail="An item cannot contain both yarn and fabric"
            )

        receipt_item = GoodsReceiptItem(
            goods_receipt_id=goods_receipt_id,
            yarn_id=item_data.yarn_id,
            fabric_id=item_data.fabric_id,
            received_quantity=item_data.received_quantity,
            unit=item_data.unit,
            warehouse_id=item_data.warehouse_id
        )

        db.add(receipt_item)

    db.commit()
    db.refresh(receipt)

    return receipt


# ---------------------------------
# DELETE GOODS RECEIPT
# ---------------------------------

@router.delete("/{goods_receipt_id}")
def delete_goods_receipt(
    goods_receipt_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_manager_or_admin)
):
    receipt = (
        db.query(GoodsReceipt)
        .filter(
            GoodsReceipt.id == goods_receipt_id
        )
        .first()
    )

    if not receipt:
        raise HTTPException(
            status_code=404,
            detail="Goods receipt not found"
        )

    db.query(GoodsReceiptItem).filter(
        GoodsReceiptItem.goods_receipt_id
        == goods_receipt_id
    ).delete(
        synchronize_session=False
    )

    db.delete(receipt)
    db.commit()

    return {
        "message": "Goods receipt deleted successfully"
    }