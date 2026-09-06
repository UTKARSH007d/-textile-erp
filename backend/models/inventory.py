from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    ForeignKey,
    DateTime,
)

from datetime import datetime

from database import Base


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    yarn_id = Column(
        Integer,
        ForeignKey("yarns.id"),
        nullable=True
    )

    fabric_id = Column(
        Integer,
        ForeignKey("fabrics.id"),
        nullable=True
    )

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=True
    )

    warehouse_id = Column(
        Integer,
        ForeignKey("warehouses.id"),
        nullable=False
    )

    quantity = Column(
        Float,
        default=0
    )

    reserved_quantity = Column(
        Float,
        default=0
    )

    unit = Column(
        String(20),
        default="kg"
    )

    reorder_level = Column(
        Float,
        default=0
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    inventory_id = Column(
        Integer,
        ForeignKey("inventory.id"),
        nullable=False
    )

    movement_type = Column(
        String(50),
        nullable=False
    )

    quantity = Column(
        Float,
        nullable=False
    )

    reference_type = Column(
        String(50),
        nullable=True
    )

    reference_id = Column(
        Integer,
        nullable=True
    )

    from_warehouse_id = Column(
        Integer,
        ForeignKey("warehouses.id"),
        nullable=True
    )

    to_warehouse_id = Column(
        Integer,
        ForeignKey("warehouses.id"),
        nullable=True
    )

    movement_date = Column(
        DateTime,
        default=datetime.utcnow
    )

    remarks = Column(
        String(250),
        nullable=True
    )