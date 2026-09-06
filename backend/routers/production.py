from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import SessionLocal
from auth import get_current_user
from models.user import User

from models.production import (
    ProductionOrder,
    ProductionItem,
    DyeingOrder,
    FinishingOrder
)

from models.sales import SalesOrder

from models.master import (
    Product,
    Yarn,
    Fabric,
    Warehouse,
    Color
)

from models.inventory import (
    Inventory,
    StockMovement
)


router = APIRouter(
    prefix="/api/production",
    tags=["Production"],
    dependencies=[Depends(get_current_user)]
)


# =========================================================
# DATABASE DEPENDENCY
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

class ProductionItemCreate(BaseModel):

    yarn_id: Optional[int] = None
    fabric_id: Optional[int] = None

    planned_quantity: float
    consumed_quantity: float = 0

    unit: str = "kg"
    status: str = "Pending"


class ProductionOrderCreate(BaseModel):

    production_order_no: str

    sales_order_id: Optional[int] = None
    product_id: Optional[int] = None
    warehouse_id: Optional[int] = None

    planned_quantity: float

    start_date: Optional[date] = None
    expected_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None

    status: str = "Planned"

    remarks: Optional[str] = None

    items: list[ProductionItemCreate]


class ProductionStatusUpdate(BaseModel):

    status: str
    produced_quantity: float = 0
    actual_completion_date: Optional[date] = None


# =========================================================
# RESPONSE SCHEMAS
# =========================================================

class ProductionItemResponse(BaseModel):

    id: int
    production_order_id: int

    yarn_id: Optional[int] = None
    fabric_id: Optional[int] = None

    planned_quantity: float
    consumed_quantity: float

    unit: str
    status: str

    model_config = ConfigDict(from_attributes=True)


class ProductionOrderResponse(BaseModel):

    id: int

    production_order_no: str

    sales_order_id: Optional[int] = None
    product_id: Optional[int] = None
    warehouse_id: Optional[int] = None

    planned_quantity: float
    produced_quantity: float

    start_date: Optional[date] = None
    expected_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None

    status: str

    remarks: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def validate_sales_order(
    sales_order_id: Optional[int],
    db: Session
):
    if sales_order_id is None:
        return

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


def validate_product(
    product_id: Optional[int],
    db: Session
):
    if product_id is None:
        return None

    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product


def validate_warehouse(
    warehouse_id: Optional[int],
    db: Session
):
    if warehouse_id is None:
        return

    warehouse = (
        db.query(Warehouse)
        .filter(Warehouse.id == warehouse_id)
        .first()
    )

    if not warehouse:
        raise HTTPException(
            status_code=404,
            detail="Warehouse not found"
        )


def validate_production_order(
    production_order_id: Optional[int],
    db: Session
):
    if production_order_id is None:
        return

    production_order = (
        db.query(ProductionOrder)
        .filter(ProductionOrder.id == production_order_id)
        .first()
    )

    if not production_order:
        raise HTTPException(
            status_code=404,
            detail="Production order not found"
        )


def validate_fabric(
    fabric_id: Optional[int],
    db: Session
):
    if fabric_id is None:
        return

    fabric = (
        db.query(Fabric)
        .filter(Fabric.id == fabric_id)
        .first()
    )

    if not fabric:
        raise HTTPException(
            status_code=404,
            detail="Fabric not found"
        )


def validate_color(
    color_id: Optional[int],
    db: Session
):
    if color_id is None:
        return

    color = (
        db.query(Color)
        .filter(Color.id == color_id)
        .first()
    )

    if not color:
        raise HTTPException(
            status_code=404,
            detail="Color not found"
        )


def validate_production_item(
    item_data: ProductionItemCreate,
    db: Session
):
    if item_data.planned_quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "Production item planned quantity "
                "must be greater than zero"
            )
        )

    if item_data.consumed_quantity < 0:
        raise HTTPException(
            status_code=400,
            detail="Consumed quantity cannot be negative"
        )

    if (
        item_data.yarn_id is None
        and item_data.fabric_id is None
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Each production item must have "
                "a yarn or fabric"
            )
        )

    if (
        item_data.yarn_id is not None
        and item_data.fabric_id is not None
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "A production item cannot contain "
                "both yarn and fabric"
            )
        )

    if item_data.yarn_id is not None:

        yarn = (
            db.query(Yarn)
            .filter(Yarn.id == item_data.yarn_id)
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
            .filter(Fabric.id == item_data.fabric_id)
            .first()
        )

        if not fabric:
            raise HTTPException(
                status_code=404,
                detail="Fabric not found"
            )


# =========================================================
# ADD FINISHED PRODUCT TO INVENTORY
# =========================================================

def add_finished_product_to_inventory(
    production_order: ProductionOrder,
    db: Session
):
    if production_order.product_id is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Cannot complete production order "
                "without a product"
            )
        )

    if production_order.warehouse_id is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Cannot complete production order "
                "without a warehouse"
            )
        )

    if production_order.produced_quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "Produced quantity must be greater "
                "than zero before completing production"
            )
        )

    # Prevent duplicate finished product addition
    existing_movement = (
        db.query(StockMovement)
        .filter(
            StockMovement.reference_type == "Production Order",
            StockMovement.reference_id == production_order.id,
            StockMovement.movement_type == "Production Output"
        )
        .first()
    )

    if existing_movement:
        return

    product = (
        db.query(Product)
        .filter(Product.id == production_order.product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.product_id == production_order.product_id,
            Inventory.warehouse_id == production_order.warehouse_id
        )
        .first()
    )

    if not inventory:
        inventory = Inventory(
            product_id=production_order.product_id,
            warehouse_id=production_order.warehouse_id,
            quantity=0,
            reserved_quantity=0,
            unit=product.unit,
            reorder_level=0
        )

        db.add(inventory)
        db.flush()

    inventory.quantity += production_order.produced_quantity

    stock_movement = StockMovement(
        inventory_id=inventory.id,
        movement_type="Production Output",
        quantity=production_order.produced_quantity,
        reference_type="Production Order",
        reference_id=production_order.id,
        from_warehouse_id=None,
        to_warehouse_id=production_order.warehouse_id,
        remarks=(
            f"Finished product added from "
            f"production order "
            f"{production_order.production_order_no}"
        )
    )

    db.add(stock_movement)


# =========================================================
# CONSUME RAW MATERIALS FROM INVENTORY
# =========================================================

def consume_raw_materials_from_inventory(
    production_order: ProductionOrder,
    db: Session
):
    production_items = (
        db.query(ProductionItem)
        .filter(
            ProductionItem.production_order_id
            == production_order.id
        )
        .all()
    )

    for item in production_items:

        # No quantity consumed
        if item.consumed_quantity <= 0:
            continue

        # =================================================
        # YARN CONSUMPTION
        # =================================================

        if item.yarn_id is not None:

            # Prevent duplicate consumption
            existing_movement = (
                db.query(StockMovement)
                .filter(
                    StockMovement.reference_type
                    == "Production Item",

                    StockMovement.reference_id
                    == item.id,

                    StockMovement.movement_type
                    == "Material Consumption"
                )
                .first()
            )

            if existing_movement:
                continue

            inventory = (
                db.query(Inventory)
                .filter(
                    Inventory.yarn_id == item.yarn_id
                )
                .first()
            )

            if not inventory:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Yarn ID {item.yarn_id} "
                        f"not found in inventory"
                    )
                )

            if inventory.quantity < item.consumed_quantity:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Insufficient yarn stock. "
                        f"Available: {inventory.quantity}, "
                        f"Required: {item.consumed_quantity}"
                    )
                )

            inventory.quantity -= item.consumed_quantity

            stock_movement = StockMovement(
                inventory_id=inventory.id,
                movement_type="Material Consumption",
                quantity=item.consumed_quantity,
                reference_type="Production Item",
                reference_id=item.id,
                from_warehouse_id=inventory.warehouse_id,
                to_warehouse_id=None,
                remarks=(
                    f"Yarn consumed for production order "
                    f"{production_order.production_order_no}"
                )
            )

            db.add(stock_movement)

        # =================================================
        # FABRIC CONSUMPTION
        # =================================================

        elif item.fabric_id is not None:

            # Prevent duplicate consumption
            existing_movement = (
                db.query(StockMovement)
                .filter(
                    StockMovement.reference_type
                    == "Production Item",

                    StockMovement.reference_id
                    == item.id,

                    StockMovement.movement_type
                    == "Material Consumption"
                )
                .first()
            )

            if existing_movement:
                continue

            inventory = (
                db.query(Inventory)
                .filter(
                    Inventory.fabric_id == item.fabric_id
                )
                .first()
            )

            if not inventory:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Fabric ID {item.fabric_id} "
                        f"not found in inventory"
                    )
                )

            if inventory.quantity < item.consumed_quantity:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Insufficient fabric stock. "
                        f"Available: {inventory.quantity}, "
                        f"Required: {item.consumed_quantity}"
                    )
                )

            inventory.quantity -= item.consumed_quantity

            stock_movement = StockMovement(
                inventory_id=inventory.id,
                movement_type="Material Consumption",
                quantity=item.consumed_quantity,
                reference_type="Production Item",
                reference_id=item.id,
                from_warehouse_id=inventory.warehouse_id,
                to_warehouse_id=None,
                remarks=(
                    f"Fabric consumed for production order "
                    f"{production_order.production_order_no}"
                )
            )

            db.add(stock_movement)


# =========================================================
# GET ALL PRODUCTION ORDERS
# =========================================================

@router.get(
    "/",
    response_model=list[ProductionOrderResponse]
)
def get_production_orders(
    db: Session = Depends(get_db)
):
    return (
        db.query(ProductionOrder)
        .order_by(ProductionOrder.id.desc())
        .all()
    )


# =========================================================
# GET SINGLE PRODUCTION ORDER
# =========================================================

@router.get(
    "/{production_order_id}",
    response_model=ProductionOrderResponse
)
def get_production_order(
    production_order_id: int,
    db: Session = Depends(get_db)
):
    production_order = (
        db.query(ProductionOrder)
        .filter(
            ProductionOrder.id
            == production_order_id
        )
        .first()
    )

    if not production_order:
        raise HTTPException(
            status_code=404,
            detail="Production order not found"
        )

    return production_order


# =========================================================
# GET PRODUCTION ITEMS
# =========================================================

@router.get(
    "/{production_order_id}/items",
    response_model=list[ProductionItemResponse]
)
def get_production_items(
    production_order_id: int,
    db: Session = Depends(get_db)
):
    production_order = (
        db.query(ProductionOrder)
        .filter(
            ProductionOrder.id
            == production_order_id
        )
        .first()
    )

    if not production_order:
        raise HTTPException(
            status_code=404,
            detail="Production order not found"
        )

    return (
        db.query(ProductionItem)
        .filter(
            ProductionItem.production_order_id
            == production_order_id
        )
        .order_by(ProductionItem.id.asc())
        .all()
    )


# =========================================================
# CREATE PRODUCTION ORDER
# =========================================================

@router.post(
    "/",
    response_model=ProductionOrderResponse,
    status_code=201
)
def create_production_order(
    production_data: ProductionOrderCreate,
    db: Session = Depends(get_db)
):
    existing_order = (
        db.query(ProductionOrder)
        .filter(
            ProductionOrder.production_order_no
            == production_data.production_order_no
        )
        .first()
    )

    if existing_order:
        raise HTTPException(
            status_code=400,
            detail=(
                "Production order number already exists"
            )
        )

    if production_data.planned_quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "Planned quantity must be greater than zero"
            )
        )

    if not production_data.items:
        raise HTTPException(
            status_code=400,
            detail=(
                "Production order must contain "
                "at least one item"
            )
        )

    validate_sales_order(
        production_data.sales_order_id,
        db
    )

    validate_product(
        production_data.product_id,
        db
    )

    validate_warehouse(
        production_data.warehouse_id,
        db
    )

    for item_data in production_data.items:
        validate_production_item(
            item_data,
            db
        )

    production_order = ProductionOrder(
        production_order_no=production_data.production_order_no,
        sales_order_id=production_data.sales_order_id,
        product_id=production_data.product_id,
        warehouse_id=production_data.warehouse_id,
        planned_quantity=production_data.planned_quantity,
        produced_quantity=0,
        start_date=production_data.start_date,
        expected_completion_date=(
            production_data.expected_completion_date
        ),
        actual_completion_date=(
            production_data.actual_completion_date
        ),
        status=production_data.status,
        remarks=production_data.remarks
    )

    db.add(production_order)
    db.flush()

    for item_data in production_data.items:

        production_item = ProductionItem(
            production_order_id=production_order.id,
            yarn_id=item_data.yarn_id,
            fabric_id=item_data.fabric_id,
            planned_quantity=item_data.planned_quantity,
            consumed_quantity=item_data.consumed_quantity,
            unit=item_data.unit,
            status=item_data.status
        )

        db.add(production_item)

    db.commit()
    db.refresh(production_order)

    return production_order


# =========================================================
# UPDATE PRODUCTION STATUS
# =========================================================

@router.patch(
    "/{production_order_id}/status",
    response_model=ProductionOrderResponse
)
def update_production_status(
    production_order_id: int,
    status_data: ProductionStatusUpdate,
    db: Session = Depends(get_db)
):
    production_order = (
        db.query(ProductionOrder)
        .filter(
            ProductionOrder.id
            == production_order_id
        )
        .first()
    )

    if not production_order:
        raise HTTPException(
            status_code=404,
            detail="Production order not found"
        )

    allowed_statuses = [
        "Planned",
        "In Progress",
        "Completed"
    ]

    if status_data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                "Status must be Planned, "
                "In Progress, or Completed"
            )
        )

    if status_data.produced_quantity < 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "Produced quantity cannot be negative"
            )
        )

    if (
        status_data.produced_quantity
        > production_order.planned_quantity
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Produced quantity cannot be greater "
                "than planned quantity"
            )
        )

    production_order.status = status_data.status

    production_order.produced_quantity = (
        status_data.produced_quantity
    )

    if status_data.status == "Completed":

        production_order.actual_completion_date = (
            status_data.actual_completion_date
            or date.today()
        )

        # Consume raw yarn/fabric
        consume_raw_materials_from_inventory(
            production_order,
            db
        )

        # Add finished product
        add_finished_product_to_inventory(
            production_order,
            db
        )

    else:

        production_order.actual_completion_date = (
            status_data.actual_completion_date
        )

    db.commit()
    db.refresh(production_order)

    return production_order


# =========================================================
# UPDATE COMPLETE PRODUCTION ORDER
# =========================================================

@router.put(
    "/{production_order_id}",
    response_model=ProductionOrderResponse
)
def update_production_order(
    production_order_id: int,
    production_data: ProductionOrderCreate,
    db: Session = Depends(get_db)
):
    production_order = (
        db.query(ProductionOrder)
        .filter(
            ProductionOrder.id
            == production_order_id
        )
        .first()
    )

    if not production_order:
        raise HTTPException(
            status_code=404,
            detail="Production order not found"
        )

    duplicate_order = (
        db.query(ProductionOrder)
        .filter(
            ProductionOrder.production_order_no
            == production_data.production_order_no,

            ProductionOrder.id
            != production_order_id
        )
        .first()
    )

    if duplicate_order:
        raise HTTPException(
            status_code=400,
            detail=(
                "Production order number already exists"
            )
        )

    if production_data.planned_quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "Planned quantity must be greater than zero"
            )
        )

    if not production_data.items:
        raise HTTPException(
            status_code=400,
            detail=(
                "Production order must contain "
                "at least one item"
            )
        )

    validate_sales_order(
        production_data.sales_order_id,
        db
    )

    validate_product(
        production_data.product_id,
        db
    )

    validate_warehouse(
        production_data.warehouse_id,
        db
    )

    for item_data in production_data.items:
        validate_production_item(
            item_data,
            db
        )

    production_order.production_order_no = (
        production_data.production_order_no
    )

    production_order.sales_order_id = (
        production_data.sales_order_id
    )

    production_order.product_id = (
        production_data.product_id
    )

    production_order.warehouse_id = (
        production_data.warehouse_id
    )

    production_order.planned_quantity = (
        production_data.planned_quantity
    )

    production_order.start_date = (
        production_data.start_date
    )

    production_order.expected_completion_date = (
        production_data.expected_completion_date
    )

    production_order.actual_completion_date = (
        production_data.actual_completion_date
    )

    production_order.status = production_data.status

    production_order.remarks = (
        production_data.remarks
    )

    # Delete old production items
    db.query(ProductionItem).filter(
        ProductionItem.production_order_id
        == production_order_id
    ).delete(
        synchronize_session=False
    )

    # Flush deletion before adding new items
    db.flush()

    # Add updated production items
    for item_data in production_data.items:

        production_item = ProductionItem(
            production_order_id=production_order_id,
            yarn_id=item_data.yarn_id,
            fabric_id=item_data.fabric_id,
            planned_quantity=item_data.planned_quantity,
            consumed_quantity=item_data.consumed_quantity,
            unit=item_data.unit,
            status=item_data.status
        )

        db.add(production_item)

    # Flush so new production items get IDs
    db.flush()

    if production_order.status == "Completed":

        if production_order.produced_quantity <= 0:
            production_order.produced_quantity = (
                production_order.planned_quantity
            )

        if production_order.actual_completion_date is None:
            production_order.actual_completion_date = (
                date.today()
            )

        # Consume raw materials
        consume_raw_materials_from_inventory(
            production_order,
            db
        )

        # Add finished product
        add_finished_product_to_inventory(
            production_order,
            db
        )

    db.commit()
    db.refresh(production_order)

    return production_order


# =========================================================
# DELETE PRODUCTION ORDER
# =========================================================

@router.delete(
    "/{production_order_id}"
)
def delete_production_order(
    production_order_id: int,
    db: Session = Depends(get_db)
):
    production_order = (
        db.query(ProductionOrder)
        .filter(
            ProductionOrder.id
            == production_order_id
        )
        .first()
    )

    if not production_order:
        raise HTTPException(
            status_code=404,
            detail="Production order not found"
        )

    db.query(ProductionItem).filter(
        ProductionItem.production_order_id
        == production_order_id
    ).delete(
        synchronize_session=False
    )

    db.delete(production_order)

    db.commit()

    return {
        "message": (
            "Production order deleted successfully"
        )
    }


# =========================================================
# DYEING SCHEMAS
# =========================================================

class DyeingOrderCreate(BaseModel):

    dyeing_order_no: str

    production_order_id: Optional[int] = None
    fabric_id: Optional[int] = None
    color_id: Optional[int] = None

    quantity: float

    start_date: Optional[date] = None
    completion_date: Optional[date] = None

    status: str = "Pending"

    remarks: Optional[str] = None


class DyeingOrderResponse(DyeingOrderCreate):

    id: int

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# GET ALL DYEING ORDERS
# =========================================================

@router.get(
    "/dyeing/",
    response_model=list[DyeingOrderResponse]
)
def get_dyeing_orders(
    db: Session = Depends(get_db)
):
    return (
        db.query(DyeingOrder)
        .order_by(DyeingOrder.id.desc())
        .all()
    )


# =========================================================
# GET SINGLE DYEING ORDER
# =========================================================

@router.get(
    "/dyeing/{dyeing_order_id}",
    response_model=DyeingOrderResponse
)
def get_dyeing_order(
    dyeing_order_id: int,
    db: Session = Depends(get_db)
):
    dyeing_order = (
        db.query(DyeingOrder)
        .filter(
            DyeingOrder.id == dyeing_order_id
        )
        .first()
    )

    if not dyeing_order:
        raise HTTPException(
            status_code=404,
            detail="Dyeing order not found"
        )

    return dyeing_order


# =========================================================
# CREATE DYEING ORDER
# =========================================================

@router.post(
    "/dyeing/",
    response_model=DyeingOrderResponse,
    status_code=201
)
def create_dyeing_order(
    dyeing_data: DyeingOrderCreate,
    db: Session = Depends(get_db)
):
    existing = (
        db.query(DyeingOrder)
        .filter(
            DyeingOrder.dyeing_order_no
            == dyeing_data.dyeing_order_no
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Dyeing order number already exists"
        )

    if dyeing_data.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero"
        )

    validate_production_order(
        dyeing_data.production_order_id,
        db
    )

    validate_fabric(
        dyeing_data.fabric_id,
        db
    )

    validate_color(
        dyeing_data.color_id,
        db
    )

    dyeing_order = DyeingOrder(
        dyeing_order_no=dyeing_data.dyeing_order_no,
        production_order_id=dyeing_data.production_order_id,
        fabric_id=dyeing_data.fabric_id,
        color_id=dyeing_data.color_id,
        quantity=dyeing_data.quantity,
        start_date=dyeing_data.start_date,
        completion_date=dyeing_data.completion_date,
        status=dyeing_data.status,
        remarks=dyeing_data.remarks
    )

    db.add(dyeing_order)
    db.commit()
    db.refresh(dyeing_order)

    return dyeing_order


# =========================================================
# UPDATE DYEING ORDER
# =========================================================

@router.put(
    "/dyeing/{dyeing_order_id}",
    response_model=DyeingOrderResponse
)
def update_dyeing_order(
    dyeing_order_id: int,
    dyeing_data: DyeingOrderCreate,
    db: Session = Depends(get_db)
):
    dyeing_order = (
        db.query(DyeingOrder)
        .filter(
            DyeingOrder.id == dyeing_order_id
        )
        .first()
    )

    if not dyeing_order:
        raise HTTPException(
            status_code=404,
            detail="Dyeing order not found"
        )

    duplicate = (
        db.query(DyeingOrder)
        .filter(
            DyeingOrder.dyeing_order_no
            == dyeing_data.dyeing_order_no,

            DyeingOrder.id != dyeing_order_id
        )
        .first()
    )

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="Dyeing order number already exists"
        )

    if dyeing_data.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero"
        )

    validate_production_order(
        dyeing_data.production_order_id,
        db
    )

    validate_fabric(
        dyeing_data.fabric_id,
        db
    )

    validate_color(
        dyeing_data.color_id,
        db
    )

    dyeing_order.dyeing_order_no = (
        dyeing_data.dyeing_order_no
    )

    dyeing_order.production_order_id = (
        dyeing_data.production_order_id
    )

    dyeing_order.fabric_id = (
        dyeing_data.fabric_id
    )

    dyeing_order.color_id = (
        dyeing_data.color_id
    )

    dyeing_order.quantity = (
        dyeing_data.quantity
    )

    dyeing_order.start_date = (
        dyeing_data.start_date
    )

    dyeing_order.completion_date = (
        dyeing_data.completion_date
    )

    dyeing_order.status = (
        dyeing_data.status
    )

    dyeing_order.remarks = (
        dyeing_data.remarks
    )

    db.commit()
    db.refresh(dyeing_order)

    return dyeing_order


# =========================================================
# DELETE DYEING ORDER
# =========================================================

@router.delete(
    "/dyeing/{dyeing_order_id}"
)
def delete_dyeing_order(
    dyeing_order_id: int,
    db: Session = Depends(get_db)
):
    dyeing_order = (
        db.query(DyeingOrder)
        .filter(
            DyeingOrder.id == dyeing_order_id
        )
        .first()
    )

    if not dyeing_order:
        raise HTTPException(
            status_code=404,
            detail="Dyeing order not found"
        )

    db.delete(dyeing_order)
    db.commit()

    return {
        "message": "Dyeing order deleted successfully"
    }


# =========================================================
# FINISHING SCHEMAS
# =========================================================

class FinishingOrderCreate(BaseModel):

    finishing_order_no: str

    production_order_id: Optional[int] = None
    fabric_id: Optional[int] = None

    quantity: float

    finishing_type: Optional[str] = None

    start_date: Optional[date] = None
    completion_date: Optional[date] = None

    status: str = "Pending"

    remarks: Optional[str] = None


class FinishingOrderResponse(FinishingOrderCreate):

    id: int

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# GET ALL FINISHING ORDERS
# =========================================================

@router.get(
    "/finishing/",
    response_model=list[FinishingOrderResponse]
)
def get_finishing_orders(
    db: Session = Depends(get_db)
):
    return (
        db.query(FinishingOrder)
        .order_by(FinishingOrder.id.desc())
        .all()
    )


# =========================================================
# GET SINGLE FINISHING ORDER
# =========================================================

@router.get(
    "/finishing/{finishing_order_id}",
    response_model=FinishingOrderResponse
)
def get_finishing_order(
    finishing_order_id: int,
    db: Session = Depends(get_db)
):
    finishing_order = (
        db.query(FinishingOrder)
        .filter(
            FinishingOrder.id == finishing_order_id
        )
        .first()
    )

    if not finishing_order:
        raise HTTPException(
            status_code=404,
            detail="Finishing order not found"
        )

    return finishing_order


# =========================================================
# CREATE FINISHING ORDER
# =========================================================

@router.post(
    "/finishing/",
    response_model=FinishingOrderResponse,
    status_code=201
)
def create_finishing_order(
    finishing_data: FinishingOrderCreate,
    db: Session = Depends(get_db)
):
    existing = (
        db.query(FinishingOrder)
        .filter(
            FinishingOrder.finishing_order_no
            == finishing_data.finishing_order_no
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Finishing order number already exists"
        )

    if finishing_data.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero"
        )

    allowed_statuses = [
        "Pending",
        "In Progress",
        "Completed"
    ]

    if finishing_data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                "Status must be Pending, "
                "In Progress, or Completed"
            )
        )

    validate_production_order(
        finishing_data.production_order_id,
        db
    )

    validate_fabric(
        finishing_data.fabric_id,
        db
    )

    finishing_order = FinishingOrder(
        finishing_order_no=(
            finishing_data.finishing_order_no
        ),
        production_order_id=(
            finishing_data.production_order_id
        ),
        fabric_id=finishing_data.fabric_id,
        quantity=finishing_data.quantity,
        finishing_type=finishing_data.finishing_type,
        start_date=finishing_data.start_date,
        completion_date=finishing_data.completion_date,
        status=finishing_data.status,
        remarks=finishing_data.remarks
    )

    db.add(finishing_order)
    db.commit()
    db.refresh(finishing_order)

    return finishing_order


# =========================================================
# UPDATE FINISHING ORDER
# =========================================================

@router.put(
    "/finishing/{finishing_order_id}",
    response_model=FinishingOrderResponse
)
def update_finishing_order(
    finishing_order_id: int,
    finishing_data: FinishingOrderCreate,
    db: Session = Depends(get_db)
):
    finishing_order = (
        db.query(FinishingOrder)
        .filter(
            FinishingOrder.id == finishing_order_id
        )
        .first()
    )

    if not finishing_order:
        raise HTTPException(
            status_code=404,
            detail="Finishing order not found"
        )

    duplicate = (
        db.query(FinishingOrder)
        .filter(
            FinishingOrder.finishing_order_no
            == finishing_data.finishing_order_no,

            FinishingOrder.id
            != finishing_order_id
        )
        .first()
    )

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="Finishing order number already exists"
        )

    if finishing_data.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero"
        )

    allowed_statuses = [
        "Pending",
        "In Progress",
        "Completed"
    ]

    if finishing_data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                "Status must be Pending, "
                "In Progress, or Completed"
            )
        )

    validate_production_order(
        finishing_data.production_order_id,
        db
    )

    validate_fabric(
        finishing_data.fabric_id,
        db
    )

    finishing_order.finishing_order_no = (
        finishing_data.finishing_order_no
    )

    finishing_order.production_order_id = (
        finishing_data.production_order_id
    )

    finishing_order.fabric_id = (
        finishing_data.fabric_id
    )

    finishing_order.quantity = (
        finishing_data.quantity
    )

    finishing_order.finishing_type = (
        finishing_data.finishing_type
    )

    finishing_order.start_date = (
        finishing_data.start_date
    )

    finishing_order.completion_date = (
        finishing_data.completion_date
    )

    finishing_order.status = (
        finishing_data.status
    )

    finishing_order.remarks = (
        finishing_data.remarks
    )

    db.commit()
    db.refresh(finishing_order)

    return finishing_order


# =========================================================
# DELETE FINISHING ORDER
# =========================================================

@router.delete(
    "/finishing/{finishing_order_id}"
)
def delete_finishing_order(
    finishing_order_id: int,
    db: Session = Depends(get_db)
):
    finishing_order = (
        db.query(FinishingOrder)
        .filter(
            FinishingOrder.id == finishing_order_id
        )
        .first()
    )

    if not finishing_order:
        raise HTTPException(
            status_code=404,
            detail="Finishing order not found"
        )

    db.delete(finishing_order)
    db.commit()

    return {
        "message": "Finishing order deleted successfully"
    }