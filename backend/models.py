from sqlalchemy import Column, Integer, Float, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

class RouteCache(Base):
    __tablename__ = "route_cache"

    id = Column(Integer, primary_key=True, index=True)
    origin_lat = Column(Float, nullable=False)
    origin_lon = Column(Float, nullable=False)
    dest_lat = Column(Float, nullable=False)
    dest_lon = Column(Float, nullable=False)
    
    distance_km = Column(Float)
    duration_hours = Column(Float)
    polyline_shape = Column(String) # Menyimpan encoded polyline dari Valhalla

    # Agar tidak ada duplikat rute yang sama
    __table_args__ = (
        UniqueConstraint('origin_lat', 'origin_lon', 'dest_lat', 'dest_lon', name='uq_route'),
    )