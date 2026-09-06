from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Text
from database import Base


class ProductionOrder(Base):
    __tablename__ = "production_orders"

    id = Column(Integer, primary_key=True, index=True)

    production_order_no = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    sales_order_id = Column(
        Integer,
        ForeignKey("sales_orders.id"),
        nullable=True
    )

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=True
    )

    # Warehouse where the finished product
    # will be added after production is completed
    warehouse_id = Column(
        Integer,
        ForeignKey("warehouses.id"),
        nullable=True
    )

    planned_quantity = Column(Float, nullable=False)
    produced_quantity = Column(Float, default=0)

    start_date = Column(Date, nullable=True)
    expected_completion_date = Column(Date, nullable=True)
    actual_completion_date = Column(Date, nullable=True)

    status = Column(String(50), default="Planned")

    remarks = Column(Text, nullable=True)


class ProductionItem(Base):
    __tablename__ = "production_items"

    id = Column(Integer, primary_key=True, index=True)

    production_order_id = Column(
        Integer,
        ForeignKey("production_orders.id"),
        nullable=False
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

    planned_quantity = Column(Float, default=0)
    consumed_quantity = Column(Float, default=0)

    unit = Column(String(20), default="kg")

    status = Column(String(50), default="Pending")


class DyeingOrder(Base):
    __tablename__ = "dyeing_orders"

    id = Column(Integer, primary_key=True, index=True)

    dyeing_order_no = Column(
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

    quantity = Column(Float, nullable=False)

    start_date = Column(Date, nullable=True)
    completion_date = Column(Date, nullable=True)

    status = Column(String(50), default="Pending")

    remarks = Column(Text, nullable=True)


class FinishingOrder(Base):
    __tablename__ = "finishing_orders"

    id = Column(Integer, primary_key=True)

    finishing_order_no = Column(
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

    fabric_id = Column(
        Integer,
        ForeignKey("fabrics.id"),
        nullable=True
    )

    quantity = Column(Float, nullable=False)

    finishing_type = Column(
        String(100),
        nullable=True
    )

    start_date = Column(Date, nullable=True)
    completion_date = Column(Date, nullable=True)

    status = Column(String(50), default="Pending")

    remarks = Column(Text, nullable=True)