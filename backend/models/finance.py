from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Text
from database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)

    invoice_no = Column(
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

    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)

    subtotal = Column(Float, default=0)
    tax_amount = Column(Float, default=0)
    total_amount = Column(Float, default=0)

    status = Column(String(50), default="Unpaid")

    remarks = Column(Text, nullable=True)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)

    payment_no = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    invoice_id = Column(
        Integer,
        ForeignKey("invoices.id"),
        nullable=False
    )

    customer_id = Column(
        Integer,
        ForeignKey("customers.id"),
        nullable=False
    )

    payment_date = Column(Date, nullable=False)

    amount = Column(Float, nullable=False)

    payment_method = Column(
        String(50),
        default="Bank Transfer"
    )

    reference_no = Column(String(100), nullable=True)

    remarks = Column(Text, nullable=True)