from sqlalchemy import Column, Integer, String, Float, Boolean, Text, ForeignKey
from database import Base


class Yarn(Base):
    __tablename__ = "yarns"

    id = Column(Integer, primary_key=True, index=True)
    yarn_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    yarn_type = Column(String(100), nullable=True)
    count = Column(String(50), nullable=True)
    unit = Column(String(20), default="kg")
    status = Column(Boolean, default=True)


class Fabric(Base):
    __tablename__ = "fabrics"

    id = Column(Integer, primary_key=True, index=True)
    fabric_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    fabric_type = Column(String(100), nullable=True)
    composition = Column(String(150), nullable=True)
    width = Column(Float, nullable=True)
    unit = Column(String(20), default="meter")
    status = Column(Boolean, default=True)


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    product_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    product_type = Column(String(100), nullable=True)
    fabric_id = Column(Integer, ForeignKey("fabrics.id"), nullable=True)
    unit = Column(String(20), default="meter")
    status = Column(Boolean, default=True)


class Color(Base):
    __tablename__ = "colors"

    id = Column(Integer, primary_key=True, index=True)
    color_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    hex_code = Column(String(20), nullable=True)
    status = Column(Boolean, default=True)


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    location = Column(String(200), nullable=True)
    warehouse_type = Column(String(100), nullable=True)
    status = Column(Boolean, default=True)