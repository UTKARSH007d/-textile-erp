from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    ForeignKey,
    Text,
)

from database import Base


class QualityInspection(Base):
    __tablename__ = "quality_inspections"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    inspection_no = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

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

    inspection_date = Column(
        Date,
        nullable=False
    )

    inspected_quantity = Column(
        Float,
        nullable=False
    )

    passed_quantity = Column(
        Float,
        default=0
    )

    rejected_quantity = Column(
        Float,
        default=0
    )

    result = Column(
        String(50),
        default="Pending"
    )

    defect_type = Column(
        String(150),
        nullable=True
    )

    remarks = Column(
        Text,
        nullable=True
    )

    inspector_name = Column(
        String(150),
        nullable=True
    )