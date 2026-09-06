from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import SessionLocal
from models.supplier import Supplier


router = APIRouter(
    prefix="/api/suppliers",
    tags=["Suppliers"]
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


class SupplierCreate(BaseModel):
    supplier_code: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    status: bool = True


class SupplierResponse(SupplierCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


@router.get("/", response_model=list[SupplierResponse])
def get_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).order_by(Supplier.id.desc()).all()


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db)
):
    supplier = (
        db.query(Supplier)
        .filter(Supplier.id == supplier_id)
        .first()
    )

    if not supplier:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found"
        )

    return supplier


@router.post(
    "/",
    response_model=SupplierResponse,
    status_code=201
)
def create_supplier(
    supplier_data: SupplierCreate,
    db: Session = Depends(get_db)
):
    existing_supplier = (
        db.query(Supplier)
        .filter(
            Supplier.supplier_code
            == supplier_data.supplier_code
        )
        .first()
    )

    if existing_supplier:
        raise HTTPException(
            status_code=400,
            detail="Supplier code already exists"
        )

    supplier = Supplier(
        supplier_code=supplier_data.supplier_code,
        name=supplier_data.name,
        email=supplier_data.email,
        phone=supplier_data.phone,
        address=supplier_data.address,
        city=supplier_data.city,
        state=supplier_data.state,
        country=supplier_data.country,
        status=supplier_data.status,
    )

    db.add(supplier)
    db.commit()
    db.refresh(supplier)

    return supplier


@router.put(
    "/{supplier_id}",
    response_model=SupplierResponse
)
def update_supplier(
    supplier_id: int,
    supplier_data: SupplierCreate,
    db: Session = Depends(get_db)
):
    supplier = (
        db.query(Supplier)
        .filter(Supplier.id == supplier_id)
        .first()
    )

    if not supplier:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found"
        )

    existing_supplier = (
        db.query(Supplier)
        .filter(
            Supplier.supplier_code
            == supplier_data.supplier_code,
            Supplier.id != supplier_id
        )
        .first()
    )

    if existing_supplier:
        raise HTTPException(
            status_code=400,
            detail="Supplier code already exists"
        )

    supplier.supplier_code = supplier_data.supplier_code
    supplier.name = supplier_data.name
    supplier.email = supplier_data.email
    supplier.phone = supplier_data.phone
    supplier.address = supplier_data.address
    supplier.city = supplier_data.city
    supplier.state = supplier_data.state
    supplier.country = supplier_data.country
    supplier.status = supplier_data.status

    db.commit()
    db.refresh(supplier)

    return supplier


@router.delete("/{supplier_id}")
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db)
):
    supplier = (
        db.query(Supplier)
        .filter(Supplier.id == supplier_id)
        .first()
    )

    if not supplier:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found"
        )

    db.delete(supplier)
    db.commit()

    return {
        "message": "Supplier deleted successfully"
    }