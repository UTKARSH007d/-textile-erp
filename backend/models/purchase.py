from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Text
from database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_no = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    order_date = Column(Date, nullable=False)
    expected_date = Column(Date, nullable=True)
    status = Column(String(50), default="Pending")
    total_amount = Column(Float, default=0)
    remarks = Column(Text, nullable=True)


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(
        Integer,
        ForeignKey("purchase_orders.id"),
        nullable=False
    )

    yarn_id = Column(Integer, ForeignKey("yarns.id"), nullable=True)
    fabric_id = Column(Integer, ForeignKey("fabrics.id"), nullable=True)

    description = Column(String(250), nullable=True)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), default="kg")
    unit_price = Column(Float, nullable=False)
    amount = Column(Float, default=0)


class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"

    id = Column(Integer, primary_key=True, index=True)
    receipt_no = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )
    purchase_order_id = Column(
        Integer,
        ForeignKey("purchase_orders.id"),
        nullable=False
    )
    receipt_date = Column(Date, nullable=False)
    status = Column(String(50), default="Received")
    remarks = Column(Text, nullable=True)


class GoodsReceiptItem(Base):
    __tablename__ = "goods_receipt_items"

    id = Column(Integer, primary_key=True, index=True)
    goods_receipt_id = Column(
        Integer,
        ForeignKey("goods_receipts.id"),
        nullable=False
    )

    yarn_id = Column(Integer, ForeignKey("yarns.id"), nullable=True)
    fabric_id = Column(Integer, ForeignKey("fabrics.id"), nullable=True)

    received_quantity = Column(Float, nullable=False)
    unit = Column(String(20), default="kg")
    warehouse_id = Column(
        Integer,
        ForeignKey("warehouses.id"),
        nullable=False
    )