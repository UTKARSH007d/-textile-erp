from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    Text,
    Date,
    DateTime,
    ForeignKey,
)
from sqlalchemy.sql import func

from database import Base


class DyeingFinishing(Base):
    __tablename__ = "dyeing_finishing"

    # -------------------------
    # PRIMARY KEY
    # -------------------------
    id = Column(Integer, primary_key=True, index=True)

    # -------------------------
    # PROCESS IDENTIFICATION
    # -------------------------
    process_no = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    process_type = Column(
        String(50),
        nullable=False,
        default="Dyeing"
    )

    # Possible values:
    # Dyeing
    # Finishing
    # Dyeing & Finishing

    # -------------------------
    # RELATED RECORDS
    # -------------------------
    production_order_id = Column(
        Integer,
        ForeignKey("production_orders.id"),
        nullable=True
    )

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=True
    )

    fabric_id = Column(
        Integer,
        ForeignKey("fabrics.id"),
        nullable=True
    )

    color_id = Column(
        Integer,
        ForeignKey("colors.id"),
        nullable=True
    )

    # -------------------------
    # PROCESS DETAILS
    # -------------------------
    process_date = Column(
        Date,
        nullable=False
    )

    expected_completion_date = Column(
        Date,
        nullable=True
    )

    # -------------------------
    # QUANTITY DETAILS
    # -------------------------
    input_quantity = Column(
        Float,
        nullable=False,
        default=0
    )

    output_quantity = Column(
        Float,
        nullable=False,
        default=0
    )

    rejected_quantity = Column(
        Float,
        nullable=False,
        default=0
    )

    unit = Column(
        String(20),
        nullable=False,
        default="meter"
    )

    # -------------------------
    # DYEING DETAILS
    # -------------------------
    color_name = Column(
        String(100),
        nullable=True
    )

    shade = Column(
        String(100),
        nullable=True
    )

    dye_lot_no = Column(
        String(100),
        nullable=True
    )

    # -------------------------
    # FINISHING DETAILS
    # -------------------------
    finishing_type = Column(
        String(150),
        nullable=True
    )

    # Examples:
    # Soft Finish
    # Anti-Shrink
    # Water Repellent
    # Heat Setting
    # Calendering

    # -------------------------
    # STATUS
    # -------------------------
    status = Column(
        String(50),
        nullable=False,
        default="Planned"
    )

    # Possible values:
    # Planned
    # In Progress
    # Completed
    # Cancelled

    # -------------------------
    # ADDITIONAL DETAILS
    # -------------------------
    operator_name = Column(
        String(150),
        nullable=True
    )

    remarks = Column(
        Text,
        nullable=True
    )

    # -------------------------
    # RECORD STATUS
    # -------------------------
    active = Column(
        Boolean,
        default=True
    )

    # -------------------------
    # TIMESTAMPS
    # -------------------------
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now()
    )