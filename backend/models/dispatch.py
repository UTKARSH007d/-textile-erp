from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Text
from database import Base


class Dispatch(Base):
    __tablename__ = "dispatches"

    id = Column(Integer, primary_key=True, index=True)

    dispatch_no = Column(
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

    customer_id = Column(
        Integer,
        ForeignKey("customers.id"),
        nullable=False
    )

    dispatch_date = Column(Date, nullable=False)

    status = Column(String(50), default="Pending")

    transporter = Column(String(150), nullable=True)
    vehicle_no = Column(String(50), nullable=True)
    tracking_no = Column(String(100), nullable=True)

    remarks = Column(Text, nullable=True)


class DispatchItem(Base):
    __tablename__ = "dispatch_items"

    id = Column(Integer, primary_key=True, index=True)

    dispatch_id = Column(
        Integer,
        ForeignKey("dispatches.id"),
        nullable=False
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

    quantity = Column(Float, nullable=False)

    unit = Column(String(20), default="meter")