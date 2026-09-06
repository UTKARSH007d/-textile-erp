from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import SessionLocal
from models.finance import Invoice, Payment
from auth import get_current_user
from models.user import User


def require_finance_access(current_user: User = Depends(get_current_user)):
    """Allow Admin and Manager access to Finance; Employees are blocked."""
    role = (current_user.role or "").strip().lower()

    if role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=403,
            detail="Finance access is restricted to Admin and Manager roles."
        )

    return current_user


router = APIRouter(
    prefix="/api/finance",
    tags=["Finance"],
    dependencies=[Depends(require_finance_access)]
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
# INVOICE SCHEMAS
# =========================================================

class InvoiceCreate(BaseModel):
    invoice_no: str
    sales_order_id: int | None = None
    customer_id: int
    invoice_date: date
    due_date: date | None = None
    subtotal: float = 0
    tax_amount: float = 0
    total_amount: float = 0
    status: str = "Unpaid"
    remarks: str | None = None


class InvoiceUpdate(BaseModel):
    invoice_no: str | None = None
    sales_order_id: int | None = None
    customer_id: int | None = None
    invoice_date: date | None = None
    due_date: date | None = None
    subtotal: float | None = None
    tax_amount: float | None = None
    total_amount: float | None = None
    status: str | None = None
    remarks: str | None = None


class InvoiceResponse(BaseModel):
    id: int
    invoice_no: str
    sales_order_id: int | None
    customer_id: int
    invoice_date: date
    due_date: date | None
    subtotal: float
    tax_amount: float
    total_amount: float
    status: str
    remarks: str | None

    class Config:
        from_attributes = True


# =========================================================
# PAYMENT SCHEMAS
# =========================================================

class PaymentCreate(BaseModel):
    payment_no: str
    invoice_id: int
    customer_id: int
    payment_date: date
    amount: float
    payment_method: str = "Bank Transfer"
    reference_no: str | None = None
    remarks: str | None = None


class PaymentUpdate(BaseModel):
    payment_no: str | None = None
    invoice_id: int | None = None
    customer_id: int | None = None
    payment_date: date | None = None
    amount: float | None = None
    payment_method: str | None = None
    reference_no: str | None = None
    remarks: str | None = None


class PaymentResponse(BaseModel):
    id: int
    payment_no: str
    invoice_id: int
    customer_id: int
    payment_date: date
    amount: float
    payment_method: str
    reference_no: str | None
    remarks: str | None

    class Config:
        from_attributes = True


# =========================================================
# INVOICE ↔ PAYMENT INTEGRATION HELPERS
# =========================================================

def get_total_paid(
    invoice_id: int,
    db: Session,
    exclude_payment_id: int | None = None
):
    query = db.query(Payment).filter(
        Payment.invoice_id == invoice_id
    )

    if exclude_payment_id is not None:
        query = query.filter(
            Payment.id != exclude_payment_id
        )

    payments = query.all()

    return sum(
        float(payment.amount or 0)
        for payment in payments
    )


def update_invoice_payment_status(
    invoice_id: int,
    db: Session
):
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id)
        .first()
    )

    if not invoice:
        return

    total_paid = get_total_paid(
        invoice_id,
        db
    )

    invoice_total = float(
        invoice.total_amount or 0
    )

    if total_paid <= 0:
        invoice.status = "Unpaid"

    elif total_paid < invoice_total:
        invoice.status = "Partial"

    else:
        invoice.status = "Paid"


def validate_payment_amount(
    invoice_id: int,
    payment_amount: float,
    db: Session,
    exclude_payment_id: int | None = None
):
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id)
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    if payment_amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Payment amount must be greater than 0"
        )

    total_paid = get_total_paid(
        invoice_id,
        db,
        exclude_payment_id
    )

    invoice_total = float(
        invoice.total_amount or 0
    )

    remaining_balance = (
        invoice_total - total_paid
    )

    if payment_amount > remaining_balance:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Payment amount exceeds remaining "
                f"invoice balance. Remaining balance: "
                f"{remaining_balance:.2f}"
            )
        )

    return invoice


# =========================================================
# INVOICE ENDPOINTS
# =========================================================


# ---------------------------------------------------------
# GET ALL INVOICES
# ---------------------------------------------------------

@router.get(
    "/invoices",
    response_model=list[InvoiceResponse]
)
def get_invoices(
    db: Session = Depends(get_db)
):
    return (
        db.query(Invoice)
        .order_by(Invoice.id.desc())
        .all()
    )


# ---------------------------------------------------------
# GET SINGLE INVOICE
# ---------------------------------------------------------

@router.get(
    "/invoices/{invoice_id}",
    response_model=InvoiceResponse
)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db)
):
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id)
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    return invoice


# ---------------------------------------------------------
# CREATE INVOICE
# ---------------------------------------------------------

@router.post(
    "/invoices",
    response_model=InvoiceResponse
)
def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db)
):
    existing_invoice = (
        db.query(Invoice)
        .filter(
            Invoice.invoice_no
            == invoice_data.invoice_no
        )
        .first()
    )

    if existing_invoice:
        raise HTTPException(
            status_code=400,
            detail="Invoice number already exists"
        )

    new_invoice = Invoice(
        invoice_no=invoice_data.invoice_no,
        sales_order_id=invoice_data.sales_order_id,
        customer_id=invoice_data.customer_id,
        invoice_date=invoice_data.invoice_date,
        due_date=invoice_data.due_date,
        subtotal=invoice_data.subtotal,
        tax_amount=invoice_data.tax_amount,
        total_amount=invoice_data.total_amount,
        status="Unpaid",
        remarks=invoice_data.remarks
    )

    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)

    return new_invoice


# ---------------------------------------------------------
# UPDATE INVOICE
# ---------------------------------------------------------

@router.put(
    "/invoices/{invoice_id}",
    response_model=InvoiceResponse
)
def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    db: Session = Depends(get_db)
):
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id)
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    if invoice_data.invoice_no is not None:
        existing_invoice = (
            db.query(Invoice)
            .filter(
                Invoice.invoice_no
                == invoice_data.invoice_no,
                Invoice.id != invoice_id
            )
            .first()
        )

        if existing_invoice:
            raise HTTPException(
                status_code=400,
                detail="Invoice number already exists"
            )

    update_data = invoice_data.model_dump(
        exclude_unset=True
    )

    for key, value in update_data.items():
        if key != "status":
            setattr(invoice, key, value)

    # Recalculate status based on payments
    update_invoice_payment_status(
        invoice_id,
        db
    )

    db.commit()
    db.refresh(invoice)

    return invoice


# ---------------------------------------------------------
# DELETE INVOICE
# ---------------------------------------------------------

@router.delete(
    "/invoices/{invoice_id}"
)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db)
):
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id)
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    existing_payments = (
        db.query(Payment)
        .filter(
            Payment.invoice_id == invoice_id
        )
        .count()
    )

    if existing_payments > 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "Cannot delete invoice because "
                "payments are linked to it"
            )
        )

    db.delete(invoice)
    db.commit()

    return {
        "message": "Invoice deleted successfully"
    }


# =========================================================
# PAYMENT ENDPOINTS
# =========================================================


# ---------------------------------------------------------
# GET ALL PAYMENTS
# ---------------------------------------------------------

@router.get(
    "/payments",
    response_model=list[PaymentResponse]
)
def get_payments(
    db: Session = Depends(get_db)
):
    return (
        db.query(Payment)
        .order_by(Payment.id.desc())
        .all()
    )


# ---------------------------------------------------------
# GET SINGLE PAYMENT
# ---------------------------------------------------------

@router.get(
    "/payments/{payment_id}",
    response_model=PaymentResponse
)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db)
):
    payment = (
        db.query(Payment)
        .filter(Payment.id == payment_id)
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found"
        )

    return payment


# ---------------------------------------------------------
# CREATE PAYMENT
# ---------------------------------------------------------

@router.post(
    "/payments",
    response_model=PaymentResponse
)
def create_payment(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db)
):
    existing_payment = (
        db.query(Payment)
        .filter(
            Payment.payment_no
            == payment_data.payment_no
        )
        .first()
    )

    if existing_payment:
        raise HTTPException(
            status_code=400,
            detail="Payment number already exists"
        )

    invoice = validate_payment_amount(
        invoice_id=payment_data.invoice_id,
        payment_amount=payment_data.amount,
        db=db
    )

    if invoice.customer_id != payment_data.customer_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "Selected customer does not match "
                "the invoice customer"
            )
        )

    new_payment = Payment(
        payment_no=payment_data.payment_no,
        invoice_id=payment_data.invoice_id,
        customer_id=payment_data.customer_id,
        payment_date=payment_data.payment_date,
        amount=payment_data.amount,
        payment_method=payment_data.payment_method,
        reference_no=payment_data.reference_no,
        remarks=payment_data.remarks
    )

    db.add(new_payment)

    # Flush so the payment is included
    # before recalculating invoice status
    db.flush()

    update_invoice_payment_status(
        payment_data.invoice_id,
        db
    )

    db.commit()
    db.refresh(new_payment)

    return new_payment


# ---------------------------------------------------------
# UPDATE PAYMENT
# ---------------------------------------------------------

@router.put(
    "/payments/{payment_id}",
    response_model=PaymentResponse
)
def update_payment(
    payment_id: int,
    payment_data: PaymentUpdate,
    db: Session = Depends(get_db)
):
    payment = (
        db.query(Payment)
        .filter(Payment.id == payment_id)
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found"
        )

    old_invoice_id = payment.invoice_id

    update_data = payment_data.model_dump(
        exclude_unset=True
    )

    new_invoice_id = update_data.get(
        "invoice_id",
        payment.invoice_id
    )

    new_amount = update_data.get(
        "amount",
        payment.amount
    )

    new_customer_id = update_data.get(
        "customer_id",
        payment.customer_id
    )

    # Validate the new payment amount.
    # Exclude current payment because its
    # existing amount is already in the database.
    invoice = validate_payment_amount(
        invoice_id=new_invoice_id,
        payment_amount=new_amount,
        db=db,
        exclude_payment_id=payment_id
    )

    if invoice.customer_id != new_customer_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "Selected customer does not match "
                "the invoice customer"
            )
        )

    if "payment_no" in update_data:
        existing_payment = (
            db.query(Payment)
            .filter(
                Payment.payment_no
                == update_data["payment_no"],
                Payment.id != payment_id
            )
            .first()
        )

        if existing_payment:
            raise HTTPException(
                status_code=400,
                detail="Payment number already exists"
            )

    for key, value in update_data.items():
        setattr(payment, key, value)

    db.flush()

    # Recalculate old invoice if payment
    # was moved to another invoice
    if old_invoice_id != new_invoice_id:
        update_invoice_payment_status(
            old_invoice_id,
            db
        )

    # Recalculate current/new invoice
    update_invoice_payment_status(
        new_invoice_id,
        db
    )

    db.commit()
    db.refresh(payment)

    return payment


# ---------------------------------------------------------
# DELETE PAYMENT
# ---------------------------------------------------------

@router.delete(
    "/payments/{payment_id}"
)
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db)
):
    payment = (
        db.query(Payment)
        .filter(Payment.id == payment_id)
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found"
        )

    invoice_id = payment.invoice_id

    db.delete(payment)

    # Flush deletion before recalculating
    db.flush()

    update_invoice_payment_status(
        invoice_id,
        db
    )

    db.commit()

    return {
        "message": "Payment deleted successfully"
    }