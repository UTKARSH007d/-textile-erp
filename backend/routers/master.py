from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import SessionLocal
from models.master import Yarn, Fabric, Product, Color, Warehouse
from permissions import require_manager_or_admin, require_authenticated_user
from models.user import User


router = APIRouter(
    prefix="/api",
    tags=["Master Data"]
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
# YARN SCHEMAS
# =========================================================

class YarnCreate(BaseModel):
    yarn_code: str
    name: str
    yarn_type: Optional[str] = None
    count: Optional[str] = None
    unit: str = "kg"
    status: bool = True


class YarnResponse(YarnCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# FABRIC SCHEMAS
# =========================================================

class FabricCreate(BaseModel):
    fabric_code: str
    name: str
    fabric_type: Optional[str] = None
    composition: Optional[str] = None
    width: Optional[float] = None
    unit: str = "meter"
    status: bool = True


class FabricResponse(FabricCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# PRODUCT SCHEMAS
# =========================================================

class ProductCreate(BaseModel):
    product_code: str
    name: str
    product_type: Optional[str] = None
    fabric_id: Optional[int] = None
    unit: str = "meter"
    status: bool = True


class ProductResponse(ProductCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# COLOR SCHEMAS
# =========================================================

class ColorCreate(BaseModel):
    color_code: str
    name: str
    hex_code: Optional[str] = None
    status: bool = True


class ColorResponse(ColorCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# WAREHOUSE SCHEMAS
# =========================================================

class WarehouseCreate(BaseModel):
    warehouse_code: str
    name: str
    location: Optional[str] = None
    warehouse_type: Optional[str] = None
    status: bool = True


class WarehouseResponse(WarehouseCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# YARNS
# =========================================================

@router.get("/yarns/", response_model=list[YarnResponse])
def get_yarns(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user)
):
    return db.query(Yarn).order_by(Yarn.id.desc()).all()


@router.get("/yarns/{yarn_id}", response_model=YarnResponse)
def get_yarn(
    yarn_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user)
):
    yarn = db.query(Yarn).filter(Yarn.id == yarn_id).first()

    if not yarn:
        raise HTTPException(
            status_code=404,
            detail="Yarn not found"
        )

    return yarn


@router.post(
    "/yarns/",
    response_model=YarnResponse,
    status_code=201
)
def create_yarn(
    yarn_data: YarnCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    existing = db.query(Yarn).filter(
        Yarn.yarn_code == yarn_data.yarn_code
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Yarn code already exists"
        )

    yarn = Yarn(**yarn_data.model_dump())

    db.add(yarn)
    db.commit()
    db.refresh(yarn)

    return yarn


@router.put(
    "/yarns/{yarn_id}",
    response_model=YarnResponse
)
def update_yarn(
    yarn_id: int,
    yarn_data: YarnCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    yarn = db.query(Yarn).filter(
        Yarn.id == yarn_id
    ).first()

    if not yarn:
        raise HTTPException(
            status_code=404,
            detail="Yarn not found"
        )

    duplicate = db.query(Yarn).filter(
        Yarn.yarn_code == yarn_data.yarn_code,
        Yarn.id != yarn_id
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="Yarn code already exists"
        )

    for key, value in yarn_data.model_dump().items():
        setattr(yarn, key, value)

    db.commit()
    db.refresh(yarn)

    return yarn


@router.delete("/yarns/{yarn_id}")
def delete_yarn(
    yarn_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    yarn = db.query(Yarn).filter(
        Yarn.id == yarn_id
    ).first()

    if not yarn:
        raise HTTPException(
            status_code=404,
            detail="Yarn not found"
        )

    db.delete(yarn)
    db.commit()

    return {
        "message": "Yarn deleted successfully"
    }


# =========================================================
# FABRICS
# =========================================================

@router.get(
    "/fabrics/",
    response_model=list[FabricResponse]
)
def get_fabrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user)
):
    return db.query(Fabric).order_by(
        Fabric.id.desc()
    ).all()


@router.get(
    "/fabrics/{fabric_id}",
    response_model=FabricResponse
)
def get_fabric(
    fabric_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user)
):
    fabric = db.query(Fabric).filter(
        Fabric.id == fabric_id
    ).first()

    if not fabric:
        raise HTTPException(
            status_code=404,
            detail="Fabric not found"
        )

    return fabric


@router.post(
    "/fabrics/",
    response_model=FabricResponse,
    status_code=201
)
def create_fabric(
    fabric_data: FabricCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    existing = db.query(Fabric).filter(
        Fabric.fabric_code == fabric_data.fabric_code
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Fabric code already exists"
        )

    fabric = Fabric(**fabric_data.model_dump())

    db.add(fabric)
    db.commit()
    db.refresh(fabric)

    return fabric


@router.put(
    "/fabrics/{fabric_id}",
    response_model=FabricResponse
)
def update_fabric(
    fabric_id: int,
    fabric_data: FabricCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    fabric = db.query(Fabric).filter(
        Fabric.id == fabric_id
    ).first()

    if not fabric:
        raise HTTPException(
            status_code=404,
            detail="Fabric not found"
        )

    duplicate = db.query(Fabric).filter(
        Fabric.fabric_code == fabric_data.fabric_code,
        Fabric.id != fabric_id
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="Fabric code already exists"
        )

    for key, value in fabric_data.model_dump().items():
        setattr(fabric, key, value)

    db.commit()
    db.refresh(fabric)

    return fabric


@router.delete("/fabrics/{fabric_id}")
def delete_fabric(
    fabric_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    fabric = db.query(Fabric).filter(
        Fabric.id == fabric_id
    ).first()

    if not fabric:
        raise HTTPException(
            status_code=404,
            detail="Fabric not found"
        )

    db.delete(fabric)
    db.commit()

    return {
        "message": "Fabric deleted successfully"
    }


# =========================================================
# PRODUCTS
# =========================================================

@router.get(
    "/products/",
    response_model=list[ProductResponse]
)
def get_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user)
):
    return db.query(Product).order_by(
        Product.id.desc()
    ).all()


@router.get(
    "/products/{product_id}",
    response_model=ProductResponse
)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user)
):
    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product


@router.post(
    "/products/",
    response_model=ProductResponse,
    status_code=201
)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    existing = db.query(Product).filter(
        Product.product_code == product_data.product_code
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Product code already exists"
        )

    if product_data.fabric_id:
        fabric = db.query(Fabric).filter(
            Fabric.id == product_data.fabric_id
        ).first()

        if not fabric:
            raise HTTPException(
                status_code=404,
                detail="Fabric not found"
            )

    product = Product(**product_data.model_dump())

    db.add(product)
    db.commit()
    db.refresh(product)

    return product


@router.put(
    "/products/{product_id}",
    response_model=ProductResponse
)
def update_product(
    product_id: int,
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    duplicate = db.query(Product).filter(
        Product.product_code == product_data.product_code,
        Product.id != product_id
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="Product code already exists"
        )

    if product_data.fabric_id:
        fabric = db.query(Fabric).filter(
            Fabric.id == product_data.fabric_id
        ).first()

        if not fabric:
            raise HTTPException(
                status_code=404,
                detail="Fabric not found"
            )

    for key, value in product_data.model_dump().items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)

    return product


@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    db.delete(product)
    db.commit()

    return {
        "message": "Product deleted successfully"
    }


# =========================================================
# COLORS
# =========================================================

@router.get(
    "/colors/",
    response_model=list[ColorResponse]
)
def get_colors(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user)
):
    return db.query(Color).order_by(
        Color.id.desc()
    ).all()


@router.get(
    "/colors/{color_id}",
    response_model=ColorResponse
)
def get_color(
    color_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user)
):
    color = db.query(Color).filter(
        Color.id == color_id
    ).first()

    if not color:
        raise HTTPException(
            status_code=404,
            detail="Color not found"
        )

    return color


@router.post(
    "/colors/",
    response_model=ColorResponse,
    status_code=201
)
def create_color(
    color_data: ColorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    existing = db.query(Color).filter(
        Color.color_code == color_data.color_code
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Color code already exists"
        )

    color = Color(**color_data.model_dump())

    db.add(color)
    db.commit()
    db.refresh(color)

    return color


@router.put(
    "/colors/{color_id}",
    response_model=ColorResponse
)
def update_color(
    color_id: int,
    color_data: ColorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    color = db.query(Color).filter(
        Color.id == color_id
    ).first()

    if not color:
        raise HTTPException(
            status_code=404,
            detail="Color not found"
        )

    duplicate = db.query(Color).filter(
        Color.color_code == color_data.color_code,
        Color.id != color_id
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="Color code already exists"
        )

    for key, value in color_data.model_dump().items():
        setattr(color, key, value)

    db.commit()
    db.refresh(color)

    return color


@router.delete("/colors/{color_id}")
def delete_color(
    color_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    color = db.query(Color).filter(
        Color.id == color_id
    ).first()

    if not color:
        raise HTTPException(
            status_code=404,
            detail="Color not found"
        )

    db.delete(color)
    db.commit()

    return {
        "message": "Color deleted successfully"
    }


# =========================================================
# WAREHOUSES
# =========================================================

@router.get(
    "/warehouses/",
    response_model=list[WarehouseResponse]
)
def get_warehouses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user)
):
    return db.query(Warehouse).order_by(
        Warehouse.id.desc()
    ).all()


@router.get(
    "/warehouses/{warehouse_id}",
    response_model=WarehouseResponse
)
def get_warehouse(
    warehouse_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user)
):
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id
    ).first()

    if not warehouse:
        raise HTTPException(
            status_code=404,
            detail="Warehouse not found"
        )

    return warehouse


@router.post(
    "/warehouses/",
    response_model=WarehouseResponse,
    status_code=201
)
def create_warehouse(
    warehouse_data: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    existing = db.query(Warehouse).filter(
        Warehouse.warehouse_code ==
        warehouse_data.warehouse_code
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Warehouse code already exists"
        )

    warehouse = Warehouse(**warehouse_data.model_dump())

    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)

    return warehouse


@router.put(
    "/warehouses/{warehouse_id}",
    response_model=WarehouseResponse
)
def update_warehouse(
    warehouse_id: int,
    warehouse_data: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id
    ).first()

    if not warehouse:
        raise HTTPException(
            status_code=404,
            detail="Warehouse not found"
        )

    duplicate = db.query(Warehouse).filter(
        Warehouse.warehouse_code ==
        warehouse_data.warehouse_code,
        Warehouse.id != warehouse_id
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="Warehouse code already exists"
        )

    for key, value in warehouse_data.model_dump().items():
        setattr(warehouse, key, value)

    db.commit()
    db.refresh(warehouse)

    return warehouse


@router.delete("/warehouses/{warehouse_id}")
def delete_warehouse(
    warehouse_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id
    ).first()

    if not warehouse:
        raise HTTPException(
            status_code=404,
            detail="Warehouse not found"
        )

    db.delete(warehouse)
    db.commit()

    return {
        "message": "Warehouse deleted successfully"
    }