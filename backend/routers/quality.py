from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import SessionLocal
from auth import get_current_user

from models.quality import QualityInspection
from models.production import ProductionOrder
from models.master import Product, Fabric
from models.inventory import Inventory, StockMovement


router = APIRouter(
    prefix="/api/quality",
    tags=["Quality"],
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
# REQUEST SCHEMAS
# =========================================================

class QualityInspectionCreate(BaseModel):
    inspection_no: str
    inspection_date: date

    inspected_quantity: float

    passed_quantity: float = 0
    rejected_quantity: float = 0

    result: str = "Pending"

    production_order_id: Optional[int] = None
    product_id: Optional[int] = None
    fabric_id: Optional[int] = None

    defect_type: Optional[str] = None
    remarks: Optional[str] = None
    inspector_name: Optional[str] = None


class QualityInspectionUpdate(BaseModel):
    inspection_no: str
    inspection_date: date

    inspected_quantity: float

    passed_quantity: float = 0
    rejected_quantity: float = 0

    result: str = "Pending"

    production_order_id: Optional[int] = None
    product_id: Optional[int] = None
    fabric_id: Optional[int] = None

    defect_type: Optional[str] = None
    remarks: Optional[str] = None
    inspector_name: Optional[str] = None


# =========================================================
# VALID RESULTS
# =========================================================

VALID_RESULTS = [
    "Pending",
    "Passed",
    "Failed",
    "Partially Passed",
]


# =========================================================
# SERIALIZER
# =========================================================

def serialize_inspection(inspection):

    return {
        "id": inspection.id,
        "inspection_no": inspection.inspection_no,

        "production_order_id":
            inspection.production_order_id,

        "product_id":
            inspection.product_id,

        "fabric_id":
            inspection.fabric_id,

        "inspection_date":
            inspection.inspection_date,

        "inspected_quantity":
            inspection.inspected_quantity,

        "passed_quantity":
            inspection.passed_quantity,

        "rejected_quantity":
            inspection.rejected_quantity,

        "result":
            inspection.result,

        "defect_type":
            inspection.defect_type,

        "remarks":
            inspection.remarks,

        "inspector_name":
            inspection.inspector_name,
    }


# =========================================================
# VALIDATE QUALITY DATA
# =========================================================

def validate_quality_data(
    data,
    db: Session
):

    # -----------------------------------------------------
    # QUANTITY VALIDATION
    # -----------------------------------------------------

    if data.inspected_quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Inspected quantity must be greater than zero"
        )

    if data.passed_quantity < 0:
        raise HTTPException(
            status_code=400,
            detail="Passed quantity cannot be negative"
        )

    if data.rejected_quantity < 0:
        raise HTTPException(
            status_code=400,
            detail="Rejected quantity cannot be negative"
        )

    if (
        data.passed_quantity +
        data.rejected_quantity >
        data.inspected_quantity
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Passed quantity + rejected quantity "
                "cannot exceed inspected quantity"
            )
        )

    # -----------------------------------------------------
    # RESULT VALIDATION
    # -----------------------------------------------------

    if data.result not in VALID_RESULTS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid result. Use Pending, Passed, "
                "Failed or Partially Passed"
            )
        )

    # -----------------------------------------------------
    # COMPLETED QUALITY CHECK
    # -----------------------------------------------------

    if data.result != "Pending":

        if (
            data.passed_quantity +
            data.rejected_quantity
            != data.inspected_quantity
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "For a completed quality inspection, "
                    "passed + rejected quantity must equal "
                    "inspected quantity"
                )
            )

    # -----------------------------------------------------
    # PRODUCTION ORDER
    # -----------------------------------------------------

    if data.production_order_id is not None:

        production_order = (
            db.query(ProductionOrder)
            .filter(
                ProductionOrder.id ==
                data.production_order_id
            )
            .first()
        )

        if not production_order:
            raise HTTPException(
                status_code=404,
                detail="Production order not found"
            )

        if (
            data.inspected_quantity >
            production_order.produced_quantity
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Inspected quantity cannot exceed "
                    "produced quantity"
                )
            )

    # -----------------------------------------------------
    # PRODUCT
    # -----------------------------------------------------

    if data.product_id is not None:

        product = (
            db.query(Product)
            .filter(
                Product.id ==
                data.product_id
            )
            .first()
        )

        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

    # -----------------------------------------------------
    # FABRIC
    # -----------------------------------------------------

    if data.fabric_id is not None:

        fabric = (
            db.query(Fabric)
            .filter(
                Fabric.id ==
                data.fabric_id
            )
            .first()
        )

        if not fabric:
            raise HTTPException(
                status_code=404,
                detail="Fabric not found"
            )


# =========================================================
# FIND PRODUCTION ORDER
# =========================================================

def get_production_order(
    inspection: QualityInspection,
    db: Session
):

    if inspection.production_order_id is None:
        return None

    production_order = (
        db.query(ProductionOrder)
        .filter(
            ProductionOrder.id ==
            inspection.production_order_id
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
# FIND FINISHED GOODS INVENTORY
# =========================================================

def get_finished_goods_inventory(
    inspection: QualityInspection,
    production_order: ProductionOrder,
    db: Session
):

    if inspection.product_id is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Quality inspection does not have "
                "a product linked to it"
            )
        )

    if production_order.warehouse_id is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Production order does not have "
                "a warehouse"
            )
        )

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.product_id ==
            inspection.product_id,

            Inventory.warehouse_id ==
            production_order.warehouse_id,
        )
        .first()
    )

    if not inventory:
        raise HTTPException(
            status_code=400,
            detail=(
                "Finished goods inventory was not found. "
                "Complete production first."
            )
        )

    return inventory


# =========================================================
# PROCESS QUALITY RESULT INTO INVENTORY
# =========================================================

def process_quality_inventory(
    inspection: QualityInspection,
    db: Session
):

    # -----------------------------------------------------
    # PENDING DOES NOT AFFECT INVENTORY
    # -----------------------------------------------------

    if inspection.result == "Pending":
        return

    # -----------------------------------------------------
    # QUALITY WITHOUT PRODUCTION ORDER
    # -----------------------------------------------------

    if inspection.production_order_id is None:
        return

    # -----------------------------------------------------
    # GET PRODUCTION ORDER
    # -----------------------------------------------------

    production_order = get_production_order(
        inspection,
        db
    )

    # -----------------------------------------------------
    # GET FINISHED GOODS INVENTORY
    # -----------------------------------------------------

    inventory = get_finished_goods_inventory(
        inspection,
        production_order,
        db
    )

    # -----------------------------------------------------
    # IMPORTANT:
    #
    # Production has already added the produced quantity
    # to finished-goods inventory.
    #
    # Therefore:
    #
    # Passed quantity = remains in inventory
    # Rejected quantity = removed from inventory
    #
    # We DO NOT add passed quantity again.
    # -----------------------------------------------------

    rejected_quantity = (
        inspection.rejected_quantity or 0
    )

    # -----------------------------------------------------
    # CHECK WHETHER THIS QC WAS ALREADY PROCESSED
    # -----------------------------------------------------

    existing_movements = (
        db.query(StockMovement)
        .filter(
            StockMovement.reference_type ==
            "Quality Inspection",

            StockMovement.reference_id ==
            inspection.id,
        )
        .all()
    )

    if existing_movements:
        return

    # -----------------------------------------------------
    # RECORD PASSED QUANTITY
    #
    # This is an informational stock movement only.
    # It does NOT increase inventory.
    # -----------------------------------------------------

    passed_quantity = (
        inspection.passed_quantity or 0
    )

    if passed_quantity > 0:

        approval_movement = StockMovement(
            inventory_id=inventory.id,

            movement_type="Quality Approved",

            quantity=passed_quantity,

            reference_type="Quality Inspection",

            reference_id=inspection.id,

            from_warehouse_id=None,

            to_warehouse_id=
                production_order.warehouse_id,

            remarks=(
                f"{passed_quantity} "
                f"{inventory.unit} passed quality "
                f"inspection "
                f"{inspection.inspection_no}"
            )
        )

        db.add(
            approval_movement
        )

    # -----------------------------------------------------
    # REMOVE REJECTED QUANTITY
    # -----------------------------------------------------

    if rejected_quantity > 0:

        if inventory.quantity < rejected_quantity:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Not enough finished goods inventory "
                    "to record the rejected quantity"
                )
            )

        inventory.quantity -= rejected_quantity

        rejection_movement = StockMovement(
            inventory_id=inventory.id,

            movement_type="Quality Rejection",

            quantity=rejected_quantity,

            reference_type="Quality Inspection",

            reference_id=inspection.id,

            from_warehouse_id=
                production_order.warehouse_id,

            to_warehouse_id=None,

            remarks=(
                f"{rejected_quantity} "
                f"{inventory.unit} rejected during "
                f"quality inspection "
                f"{inspection.inspection_no}"
            )
        )

        db.add(
            rejection_movement
        )


# =========================================================
# GET ALL QUALITY INSPECTIONS
# =========================================================

@router.get("/")
def get_quality_inspections(
    db: Session = Depends(get_db)
):

    inspections = (
        db.query(QualityInspection)
        .order_by(
            QualityInspection.id.desc()
        )
        .all()
    )

    return [
        serialize_inspection(
            inspection
        )
        for inspection in inspections
    ]


# =========================================================
# CREATE QUALITY INSPECTION
# =========================================================

@router.post("/")
def create_quality_inspection(
    inspection_data: QualityInspectionCreate,
    db: Session = Depends(get_db)
):

    # -----------------------------------------------------
    # DUPLICATE INSPECTION NUMBER
    # -----------------------------------------------------

    existing_inspection = (
        db.query(QualityInspection)
        .filter(
            QualityInspection.inspection_no ==
            inspection_data.inspection_no
        )
        .first()
    )

    if existing_inspection:
        raise HTTPException(
            status_code=400,
            detail="Inspection number already exists"
        )

    # -----------------------------------------------------
    # VALIDATE
    # -----------------------------------------------------

    validate_quality_data(
        inspection_data,
        db
    )

    # -----------------------------------------------------
    # AUTO GET PRODUCT FROM PRODUCTION ORDER
    # -----------------------------------------------------

    product_id = (
        inspection_data.product_id
    )

    if (
        inspection_data.production_order_id
        is not None
        and product_id is None
    ):

        production_order = (
            db.query(ProductionOrder)
            .filter(
                ProductionOrder.id ==
                inspection_data.production_order_id
            )
            .first()
        )

        if production_order:
            product_id = (
                production_order.product_id
            )

    # -----------------------------------------------------
    # CREATE
    # -----------------------------------------------------

    new_inspection = QualityInspection(

        inspection_no=
            inspection_data.inspection_no,

        production_order_id=
            inspection_data.production_order_id,

        product_id=
            product_id,

        fabric_id=
            inspection_data.fabric_id,

        inspection_date=
            inspection_data.inspection_date,

        inspected_quantity=
            inspection_data.inspected_quantity,

        passed_quantity=
            inspection_data.passed_quantity,

        rejected_quantity=
            inspection_data.rejected_quantity,

        result=
            inspection_data.result,

        defect_type=
            inspection_data.defect_type,

        remarks=
            inspection_data.remarks,

        inspector_name=
            inspection_data.inspector_name,
    )

    db.add(
        new_inspection
    )

    # Get ID before creating stock movement
    db.flush()

    # -----------------------------------------------------
    # PROCESS INVENTORY
    # -----------------------------------------------------

    process_quality_inventory(
        new_inspection,
        db
    )

    db.commit()

    db.refresh(
        new_inspection
    )

    return {
        "message":
            "Quality inspection created successfully",

        "data":
            serialize_inspection(
                new_inspection
            )
    }


# =========================================================
# GET SINGLE QUALITY INSPECTION
# =========================================================

@router.get("/{inspection_id}")
def get_quality_inspection(
    inspection_id: int,
    db: Session = Depends(get_db)
):

    inspection = (
        db.query(QualityInspection)
        .filter(
            QualityInspection.id ==
            inspection_id
        )
        .first()
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Quality inspection not found"
        )

    return serialize_inspection(
        inspection
    )


# =========================================================
# UPDATE QUALITY INSPECTION
# =========================================================

@router.put("/{inspection_id}")
def update_quality_inspection(
    inspection_id: int,
    inspection_data: QualityInspectionUpdate,
    db: Session = Depends(get_db)
):

    inspection = (
        db.query(QualityInspection)
        .filter(
            QualityInspection.id ==
            inspection_id
        )
        .first()
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Quality inspection not found"
        )

    # -----------------------------------------------------
    # DUPLICATE INSPECTION NUMBER
    # -----------------------------------------------------

    duplicate = (
        db.query(QualityInspection)
        .filter(
            QualityInspection.inspection_no ==
            inspection_data.inspection_no,

            QualityInspection.id !=
            inspection_id,
        )
        .first()
    )

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="Inspection number already exists"
        )

    # -----------------------------------------------------
    # CHECK IF INVENTORY WAS ALREADY PROCESSED
    # -----------------------------------------------------

    existing_movement = (
        db.query(StockMovement)
        .filter(
            StockMovement.reference_type ==
            "Quality Inspection",

            StockMovement.reference_id ==
            inspection.id,
        )
        .first()
    )

    if existing_movement:

        raise HTTPException(
            status_code=400,
            detail=(
                "This quality inspection has already "
                "been processed into inventory and "
                "cannot be modified."
            )
        )

    # -----------------------------------------------------
    # VALIDATE
    # -----------------------------------------------------

    validate_quality_data(
        inspection_data,
        db
    )

    # -----------------------------------------------------
    # AUTO PRODUCT
    # -----------------------------------------------------

    product_id = (
        inspection_data.product_id
    )

    if (
        inspection_data.production_order_id
        is not None
        and product_id is None
    ):

        production_order = (
            db.query(ProductionOrder)
            .filter(
                ProductionOrder.id ==
                inspection_data.production_order_id
            )
            .first()
        )

        if production_order:
            product_id = (
                production_order.product_id
            )

    # -----------------------------------------------------
    # UPDATE
    # -----------------------------------------------------

    inspection.inspection_no = (
        inspection_data.inspection_no
    )

    inspection.production_order_id = (
        inspection_data.production_order_id
    )

    inspection.product_id = (
        product_id
    )

    inspection.fabric_id = (
        inspection_data.fabric_id
    )

    inspection.inspection_date = (
        inspection_data.inspection_date
    )

    inspection.inspected_quantity = (
        inspection_data.inspected_quantity
    )

    inspection.passed_quantity = (
        inspection_data.passed_quantity
    )

    inspection.rejected_quantity = (
        inspection_data.rejected_quantity
    )

    inspection.result = (
        inspection_data.result
    )

    inspection.defect_type = (
        inspection_data.defect_type
    )

    inspection.remarks = (
        inspection_data.remarks
    )

    inspection.inspector_name = (
        inspection_data.inspector_name
    )

    # -----------------------------------------------------
    # PROCESS INVENTORY
    # -----------------------------------------------------

    db.flush()

    process_quality_inventory(
        inspection,
        db
    )

    db.commit()

    db.refresh(
        inspection
    )

    return {
        "message":
            "Quality inspection updated successfully",

        "data":
            serialize_inspection(
                inspection
            )
    }


# =========================================================
# DELETE QUALITY INSPECTION
# =========================================================

@router.delete("/{inspection_id}")
def delete_quality_inspection(
    inspection_id: int,
    db: Session = Depends(get_db)
):

    inspection = (
        db.query(QualityInspection)
        .filter(
            QualityInspection.id ==
            inspection_id
        )
        .first()
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Quality inspection not found"
        )

    # -----------------------------------------------------
    # DON'T DELETE AFTER INVENTORY IMPACT
    # -----------------------------------------------------

    existing_movement = (
        db.query(StockMovement)
        .filter(
            StockMovement.reference_type ==
            "Quality Inspection",

            StockMovement.reference_id ==
            inspection.id,
        )
        .first()
    )

    if existing_movement:

        raise HTTPException(
            status_code=400,
            detail=(
                "Cannot delete this quality inspection "
                "because it has already affected inventory."
            )
        )

    db.delete(
        inspection
    )

    db.commit()

    return {
        "message":
            "Quality inspection deleted successfully"
    }