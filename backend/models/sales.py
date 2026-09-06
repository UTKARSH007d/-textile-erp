from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Text
from database import Base


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    quotation_no = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    quotation_date = Column(Date, nullable=False)
    valid_until = Column(Date, nullable=True)
    status = Column(String(50), default="Draft")
    total_amount = Column(Float, default=0)
    remarks = Column(Text, nullable=True)


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    description = Column(String(250), nullable=True)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), default="meter")
    unit_price = Column(Float, nullable=False)
    amount = Column(Float, default=0)


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(Integer, primary_key=True, index=True)
    sales_order_no = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=True)
    order_date = Column(Date, nullable=False)
    delivery_date = Column(Date, nullable=True)
    status = Column(String(50), default="Pending")
    total_amount = Column(Float, default=0)
    remarks = Column(Text, nullable=True)


class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"

    id = Column(Integer, primary_key=True, index=True)
    sales_order_id = Column(
        Integer,
        ForeignKey("sales_orders.id"),
        nullable=False
    )
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    fabric_id = Column(Integer, ForeignKey("fabrics.id"), nullable=True)
    yarn_id = Column(Integer, ForeignKey("yarns.id"), nullable=True)
    color_id = Column(Integer, ForeignKey("colors.id"), nullable=True)

    quantity = Column(Float, nullable=False)
    unit = Column(String(20), default="meter")
    unit_price = Column(Float, nullable=False)
    amount = Column(Float, default=0)

    # Material requirement is kept here rather than
    # creating a separate material requirement table.
    required_yarn_qty = Column(Float, default=0)
    required_fabric_qty = Column(Float, default=0)