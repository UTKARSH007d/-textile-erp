from typing import Optional
from datetime import date

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from pydantic import (
    BaseModel,
    ConfigDict,
)

from sqlalchemy.orm import Session

from database import SessionLocal
from auth import get_current_user

from models.dyeing_finishing import (
    DyeingFinishing,
)

from models.production import (
    ProductionOrder,
)

from models.master import (
    Product,
    Fabric,
    Color,
)

from models.quality import (
    QualityInspection,
)


router = APIRouter(
    prefix="/api/dyeing-finishing",
    tags=["Dyeing & Finishing"],
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
# SCHEMAS
# =========================================================

class DyeingFinishingBase(BaseModel):

    process_no: str

    process_type: str = "Dyeing"

    production_order_id: Optional[int] = None

    product_id: Optional[int] = None

    fabric_id: Optional[int] = None

    color_id: Optional[int] = None

    process_date: date

    expected_completion_date: Optional[date] = None

    input_quantity: float

    output_quantity: float = 0

    rejected_quantity: float = 0

    unit: str = "meter"

    color_name: Optional[str] = None

    shade: Optional[str] = None

    dye_lot_no: Optional[str] = None

    finishing_type: Optional[str] = None

    status: str = "Planned"

    operator_name: Optional[str] = None

    remarks: Optional[str] = None

    active: bool = True


class DyeingFinishingCreate(
    DyeingFinishingBase
):
    pass


class DyeingFinishingUpdate(
    DyeingFinishingBase
):
    pass


class DyeingFinishingResponse(
    DyeingFinishingBase
):

    id: int

    model_config = ConfigDict(
        from_attributes=True
    )


# =========================================================
# CONSTANTS
# =========================================================

VALID_PROCESS_TYPES = [
    "Dyeing",
    "Finishing",
    "Dyeing & Finishing",
]


VALID_STATUSES = [
    "Planned",
    "In Progress",
    "Completed",
    "Cancelled",
]


# =========================================================
# GENERATE FINISHING NUMBER
# =========================================================

def generate_finishing_process_no(
    db: Session
):

    finishing_records = (
        db.query(DyeingFinishing)
        .filter(
            DyeingFinishing.process_type ==
            "Finishing"
        )
        .all()
    )

    numbers = []

    for record in finishing_records:

        try:

            value = int(
                record.process_no
                .split("-")[-1]
            )

            numbers.append(value)

        except (ValueError, AttributeError):
            continue

    next_number = (
        max(numbers) + 1
        if numbers
        else 1
    )

    return f"FN-{next_number:03d}"


# =========================================================
# GENERATE QUALITY NUMBER
# =========================================================

def generate_quality_inspection_no(
    db: Session
):

    inspections = (
        db.query(QualityInspection)
        .all()
    )

    numbers = []

    for inspection in inspections:

        try:

            value = int(
                inspection.inspection_no
                .split("-")[-1]
            )

            numbers.append(value)

        except (ValueError, AttributeError):
            continue

    next_number = (
        max(numbers) + 1
        if numbers
        else 1
    )

    return f"QC-{next_number:04d}"


# =========================================================
# VALIDATION
# =========================================================

def validate_data(
    data: DyeingFinishingBase,
    db: Session
):

    if (
        data.process_type
        not in VALID_PROCESS_TYPES
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid process type. "
                "Use Dyeing, Finishing "
                "or Dyeing & Finishing"
            )
        )

    if (
        data.status
        not in VALID_STATUSES
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. Use Planned, "
                "In Progress, Completed or Cancelled"
            )
        )

    if data.input_quantity <= 0:

        raise HTTPException(
            status_code=400,
            detail=(
                "Input quantity must be "
                "greater than zero"
            )
        )

    if data.output_quantity < 0:

        raise HTTPException(
            status_code=400,
            detail=(
                "Output quantity cannot be negative"
            )
        )

    if data.rejected_quantity < 0:

        raise HTTPException(
            status_code=400,
            detail=(
                "Rejected quantity cannot be negative"
            )
        )

    if (
        data.output_quantity +
        data.rejected_quantity >
        data.input_quantity
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Output quantity + rejected quantity "
                "cannot exceed input quantity"
            )
        )

    if (
        data.status == "Completed"
        and
        data.output_quantity <= 0
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Completed process must have "
                "an output quantity greater than zero"
            )
        )

    if (
        data.expected_completion_date
        is not None
        and
        data.expected_completion_date <
        data.process_date
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Expected completion date cannot "
                "be before process date"
            )
        )

    # -----------------------------------------------------
    # PRODUCTION ORDER
    # -----------------------------------------------------

    if (
        data.production_order_id
        is not None
    ):

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
                detail=(
                    "Production order not found"
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

    # -----------------------------------------------------
    # COLOR
    # -----------------------------------------------------

    if data.color_id is not None:

        color = (
            db.query(Color)
            .filter(
                Color.id ==
                data.color_id
            )
            .first()
        )

        if not color:

            raise HTTPException(
                status_code=404,
                detail="Color not found"
            )

    # -----------------------------------------------------
    # DYEING
    # -----------------------------------------------------

    if data.process_type == "Dyeing":

        if data.fabric_id is None:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Fabric is required for Dyeing"
                )
            )

        if data.color_id is None:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Color is required for Dyeing"
                )
            )

    # -----------------------------------------------------
    # FINISHING
    # -----------------------------------------------------

    if data.process_type == "Finishing":

        if not data.finishing_type:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Finishing type is required"
                )
            )


# =========================================================
# DYEING -> FINISHING
# =========================================================

def create_finishing_from_dyeing(
    dyeing_process: DyeingFinishing,
    db: Session
):

    if (
        dyeing_process.process_type !=
        "Dyeing"
    ):
        return None

    if (
        dyeing_process.status !=
        "Completed"
    ):
        return None

    if (
        dyeing_process.output_quantity <=
        0
    ):
        return None

    marker = (
        f"Automatically created from completed "
        f"Dyeing process "
        f"{dyeing_process.process_no}"
    )

    existing_finishing = (
        db.query(DyeingFinishing)
        .filter(
            DyeingFinishing.process_type ==
            "Finishing",

            DyeingFinishing.remarks ==
            marker,
        )
        .first()
    )

    if existing_finishing:
        return existing_finishing

    finishing_process = DyeingFinishing(

        process_no=
            generate_finishing_process_no(db),

        process_type=
            "Finishing",

        production_order_id=
            dyeing_process.production_order_id,

        product_id=
            dyeing_process.product_id,

        fabric_id=
            dyeing_process.fabric_id,

        color_id=
            dyeing_process.color_id,

        process_date=
            date.today(),

        expected_completion_date=
            None,

        input_quantity=
            dyeing_process.output_quantity,

        output_quantity=
            0,

        rejected_quantity=
            0,

        unit=
            dyeing_process.unit,

        color_name=
            dyeing_process.color_name,

        shade=
            dyeing_process.shade,

        dye_lot_no=
            dyeing_process.dye_lot_no,

        finishing_type=
            "General Finish",

        status=
            "Planned",

        operator_name=
            None,

        remarks=
            marker,

        active=True,
    )

    db.add(
        finishing_process
    )

    return finishing_process


# =========================================================
# FINISHING -> QUALITY
# =========================================================

def create_quality_from_finishing(
    finishing_process: DyeingFinishing,
    db: Session
):

    if (
        finishing_process.process_type !=
        "Finishing"
    ):
        return None

    if (
        finishing_process.status !=
        "Completed"
    ):
        return None

    if (
        finishing_process.output_quantity <=
        0
    ):
        return None

    marker = (
        f"Automatically created from completed "
        f"Finishing process "
        f"{finishing_process.process_no}"
    )

    existing_quality = (
        db.query(QualityInspection)
        .filter(
            QualityInspection.remarks ==
            marker
        )
        .first()
    )

    if existing_quality:
        return existing_quality

    quality_inspection = QualityInspection(

        inspection_no=
            generate_quality_inspection_no(
                db
            ),

        production_order_id=
            finishing_process.production_order_id,

        product_id=
            finishing_process.product_id,

        fabric_id=
            finishing_process.fabric_id,

        inspection_date=
            date.today(),

        inspected_quantity=
            finishing_process.output_quantity,

        passed_quantity=
            0,

        rejected_quantity=
            0,

        result=
            "Pending",

        defect_type=
            None,

        remarks=
            marker,

        inspector_name=
            None,
    )

    db.add(
        quality_inspection
    )

    return quality_inspection


# =========================================================
# RUN WORKFLOW
# =========================================================

def handle_completed_process(
    process: DyeingFinishing,
    db: Session
):

    if process.status != "Completed":
        return

    if process.process_type == "Dyeing":

        create_finishing_from_dyeing(
            process,
            db
        )

    elif process.process_type == "Finishing":

        create_quality_from_finishing(
            process,
            db
        )


# =========================================================
# GET ALL
# =========================================================

@router.get(
    "/",
    response_model=
        list[DyeingFinishingResponse]
)
def get_all_processes(
    db: Session = Depends(get_db)
):

    return (
        db.query(DyeingFinishing)
        .order_by(
            DyeingFinishing.id.desc()
        )
        .all()
    )


# =========================================================
# GET DYEING
# =========================================================

@router.get(
    "/dyeing",
    response_model=
        list[DyeingFinishingResponse]
)
def get_dyeing_orders(
    db: Session = Depends(get_db)
):

    return (
        db.query(DyeingFinishing)
        .filter(
            DyeingFinishing.process_type ==
            "Dyeing"
        )
        .order_by(
            DyeingFinishing.id.desc()
        )
        .all()
    )


# =========================================================
# GET FINISHING
# =========================================================

@router.get(
    "/finishing",
    response_model=
        list[DyeingFinishingResponse]
)
def get_finishing_orders(
    db: Session = Depends(get_db)
):

    return (
        db.query(DyeingFinishing)
        .filter(
            DyeingFinishing.process_type ==
            "Finishing"
        )
        .order_by(
            DyeingFinishing.id.desc()
        )
        .all()
    )


# =========================================================
# GET ONE
# =========================================================

@router.get(
    "/{process_id}",
    response_model=
        DyeingFinishingResponse
)
def get_process(
    process_id: int,
    db: Session = Depends(get_db)
):

    process = (
        db.query(DyeingFinishing)
        .filter(
            DyeingFinishing.id ==
            process_id
        )
        .first()
    )

    if not process:

        raise HTTPException(
            status_code=404,
            detail=(
                "Process record not found"
            )
        )

    return process


# =========================================================
# CREATE
# =========================================================

@router.post(
    "/",
    response_model=
        DyeingFinishingResponse,
    status_code=201
)
def create_process(
    process_data:
        DyeingFinishingCreate,

    db: Session = Depends(get_db)
):

    existing_process = (
        db.query(DyeingFinishing)
        .filter(
            DyeingFinishing.process_no ==
            process_data.process_no
        )
        .first()
    )

    if existing_process:

        raise HTTPException(
            status_code=400,
            detail=(
                "Process number already exists"
            )
        )

    validate_data(
        process_data,
        db
    )

    process = DyeingFinishing(
        **process_data.model_dump()
    )

    db.add(process)

    db.flush()

    handle_completed_process(
        process,
        db
    )

    db.commit()

    db.refresh(process)

    return process


# =========================================================
# UPDATE
# =========================================================

@router.put(
    "/{process_id}",
    response_model=
        DyeingFinishingResponse
)
def update_process(
    process_id: int,

    process_data:
        DyeingFinishingUpdate,

    db: Session = Depends(get_db)
):

    process = (
        db.query(DyeingFinishing)
        .filter(
            DyeingFinishing.id ==
            process_id
        )
        .first()
    )

    if not process:

        raise HTTPException(
            status_code=404,
            detail=(
                "Process record not found"
            )
        )

    existing_process = (
        db.query(DyeingFinishing)
        .filter(
            DyeingFinishing.process_no ==
            process_data.process_no,

            DyeingFinishing.id !=
            process_id,
        )
        .first()
    )

    if existing_process:

        raise HTTPException(
            status_code=400,
            detail=(
                "Process number already exists"
            )
        )

    validate_data(
        process_data,
        db
    )

    update_data = (
        process_data.model_dump()
    )

    for key, value in (
        update_data.items()
    ):

        setattr(
            process,
            key,
            value
        )

    db.flush()

    handle_completed_process(
        process,
        db
    )

    db.commit()

    db.refresh(process)

    return process


# =========================================================
# DELETE
# =========================================================

@router.delete(
    "/{process_id}"
)
def delete_process(
    process_id: int,
    db: Session = Depends(get_db)
):

    process = (
        db.query(DyeingFinishing)
        .filter(
            DyeingFinishing.id ==
            process_id
        )
        .first()
    )

    if not process:

        raise HTTPException(
            status_code=404,
            detail=(
                "Process record not found"
            )
        )

    db.delete(process)

    db.commit()

    return {
        "message":
            "Process record deleted successfully"
    }