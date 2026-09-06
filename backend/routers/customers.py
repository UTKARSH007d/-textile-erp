from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import SessionLocal
from models.customer import Customer


router = APIRouter(
    prefix="/api/customers",
    tags=["Customers"]
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


class CustomerCreate(BaseModel):
    customer_code: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    status: bool = True


class CustomerResponse(CustomerCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


@router.get("/", response_model=list[CustomerResponse])
def get_customers(db: Session = Depends(get_db)):
    return db.query(Customer).order_by(Customer.id.desc()).all()


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id)
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    return customer


@router.post("/", response_model=CustomerResponse, status_code=201)
def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_db)
):
    existing_customer = (
        db.query(Customer)
        .filter(
            Customer.customer_code == customer_data.customer_code
        )
        .first()
    )

    if existing_customer:
        raise HTTPException(
            status_code=400,
            detail="Customer code already exists"
        )

    customer = Customer(
        customer_code=customer_data.customer_code,
        name=customer_data.name,
        email=customer_data.email,
        phone=customer_data.phone,
        address=customer_data.address,
        city=customer_data.city,
        state=customer_data.state,
        country=customer_data.country,
        status=customer_data.status,
    )

    db.add(customer)
    db.commit()
    db.refresh(customer)

    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    customer_data: CustomerCreate,
    db: Session = Depends(get_db)
):
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id)
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    existing_customer = (
        db.query(Customer)
        .filter(
            Customer.customer_code == customer_data.customer_code,
            Customer.id != customer_id
        )
        .first()
    )

    if existing_customer:
        raise HTTPException(
            status_code=400,
            detail="Customer code already exists"
        )

    customer.customer_code = customer_data.customer_code
    customer.name = customer_data.name
    customer.email = customer_data.email
    customer.phone = customer_data.phone
    customer.address = customer_data.address
    customer.city = customer_data.city
    customer.state = customer_data.state
    customer.country = customer_data.country
    customer.status = customer_data.status

    db.commit()
    db.refresh(customer)

    return customer


@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db)
):
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id)
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    db.delete(customer)
    db.commit()

    return {
        "message": "Customer deleted successfully"
    }