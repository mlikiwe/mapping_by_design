"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const VALHALLA_PROXY_URL = "http://127.0.0.1:8000/api/valhalla/route";

const destIcon = L.divIcon({
    className: 'custom-icon',
    html: '<div style="background-color: #ef4444; width: 1.5rem; height: 1.5rem; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const origIcon = L.divIcon({
    className: 'custom-icon',
    html: '<div style="background-color: #3b82f6; width: 1.5rem; height: 1.5rem; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const portIcon = L.divIcon({
    className: 'custom-icon',
    html: '<div style="background-color: #8b5cf6; width: 1.5rem; height: 1.5rem; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); display: flex; align-items: center; justify-content: center;"><span style="font-size: 10px;">⚓</span></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const truckIcon = L.divIcon({
    className: 'truck-icon',
    html: '<div style="background-color: #10b981; width: 2rem; height: 2rem; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgb(0 0 0 / 0.3); display: flex; align-items: center; justify-content: center; font-size: 14px;">🚛</div>',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

function decodePolyline(str: string, precision = 6): [number, number][] {
    let index = 0, lat = 0, lng = 0;
    const coordinates: [number, number][] = [];
    const factor = Math.pow(10, precision);

    while (index < str.length) {
        let shift = 0, result = 0, byte;
        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lat += ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = result = 0;
        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lng += ((result & 1) ? ~(result >> 1) : (result >> 1));

        coordinates.push([lat / factor, lng / factor]);
    }
    return coordinates;
}

async function getValhallaRoute(points: { lat: number; lon: number }[]): Promise<[number, number][]> {
    const backupShape: [number, number][] = points.map(p => [p.lat, p.lon]);
    
    try {
        const payload = {
            locations: points,
            costing: "auto",
            units: "km"
        };
        
        console.log("Fetching route from Valhalla proxy...", payload);
        
        const response = await fetch(VALHALLA_PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("Valhalla response received:", data);
            
            const fullShape: [number, number][] = [];
            
            // Decode semua legs dari response
            if (data.trip && data.trip.legs) {
                for (const leg of data.trip.legs) {
                    const decoded = decodePolyline(leg.shape, 6);
                    fullShape.push(...decoded);
                }
            }
            
            console.log(`Decoded ${fullShape.length} points from Valhalla`);
            return fullShape.length > 0 ? fullShape : backupShape;
        }
        
        console.warn("Valhalla API error:", response.status, await response.text());
        return backupShape;
        
    } catch (error) {
        console.warn("Valhalla connection error, using backup shape:", error);
        return backupShape;
    }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function interpolatePath(path: [number, number][], intervalKm = 0.5): [number, number][] {
    if (path.length < 2) return path;
    
    const dense: [number, number][] = [path[0]];
    
    for (let i = 1; i < path.length; i++) {
        const start = path[i-1];
        const end = path[i];
        const dist = haversine(start[0], start[1], end[0], end[1]);
        
        if (dist > intervalKm) {
            const numPoints = Math.floor(dist / intervalKm);
            for (let j = 1; j <= numPoints; j++) {
                const fraction = j / (numPoints + 1);
                dense.push([
                    start[0] + (end[0] - start[0]) * fraction,
                    start[1] + (end[1] - start[1]) * fraction
                ]);
            }
        }
        dense.push(end);
    }
    return dense;
}

function AutoZoom({ points }: { points: [number, number][] }) {
    const map = useMap();
    useEffect(() => {
        if (points.length > 0) {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
        }
    }, [points, map]);
    return null;
}

function MovingTruck({ position }: { position: [number, number] | null }) {
    if (!position) return null;
    return <Marker position={position} icon={truckIcon} zIndexOffset={1000} />;
}

interface MapVisualizerProps {
    data: {
        DEST_ID: string;
        ORIG_ID: string;
        WAKTU_BONGKAR_ASLI: string;
        WAKTU_MUAT_ASLI: string;
        origin_coords?: [number, number];
        dest_coords?: [number, number];
        port_coords?: [number, number];
        geometry?: string;
    };
}

export default function MapVisualizer({ data }: MapVisualizerProps) {
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [truckPosTriang, setTruckPosTriang] = useState<[number, number] | null>(null);
    const [truckPosViaPort, setTruckPosViaPort] = useState<[number, number] | null>(null);
    
    const [triangulationPath, setTriangulationPath] = useState<[number, number][]>([]);
    const [viaPortPath, setViaPortPath] = useState<[number, number][]>([]);
    
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    const origin = data?.origin_coords;
    const dest = data?.dest_coords;
    const port = data?.port_coords;

    useEffect(() => {
        if (!port || !dest || !origin) return;
        
        const fetchRoutes = async () => {
            setIsLoadingRoute(true);
            
            try {
                const portPoint = { lat: port[0], lon: port[1] };
                const destPoint = { lat: dest[0], lon: dest[1] };
                const origPoint = { lat: origin[0], lon: origin[1] };
                
                const triangPoints = [portPoint, destPoint, origPoint, portPoint];
                const triangShape = await getValhallaRoute(triangPoints);
                setTriangulationPath(interpolatePath(triangShape, 0.3));
                
                const viaPortPoints = [portPoint, destPoint, portPoint, origPoint, portPoint];
                const viaPortShape = await getValhallaRoute(viaPortPoints);
                setViaPortPath(interpolatePath(viaPortShape, 0.3));
                
                console.log("✅ Routes loaded from Valhalla");                
            } catch (error) {
                console.error("Error fetching routes:", error);
                
                const fallbackTriang: [number, number][] = [port, dest, origin, port];
                const fallbackViaPort: [number, number][] = [port, dest, port, origin, port];
                
                setTriangulationPath(interpolatePath(fallbackTriang, 0.3));
                setViaPortPath(interpolatePath(fallbackViaPort, 0.3));
            } finally {
                setIsLoadingRoute(false);
            }
        };
        
        fetchRoutes();
    }, [port, dest, origin]);

    const animate = useCallback((timestamp: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        const delta = timestamp - lastTimeRef.current;
        
        const increment = (delta / 50) * speed * 0.5;
        
        setProgress(prev => {
            const newProgress = prev + increment;
            if (newProgress >= 100) {
                setIsPlaying(false);
                return 100;
            }
            return newProgress;
        });
        
        lastTimeRef.current = timestamp;
        
        if (isPlaying) {
            animationRef.current = requestAnimationFrame(animate);
        }
    }, [isPlaying, speed]);

    useEffect(() => {
        if (isPlaying) {
            lastTimeRef.current = 0;
            animationRef.current = requestAnimationFrame(animate);
        } else if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isPlaying, animate]);

    useEffect(() => {
        if (triangulationPath.length > 0) {
            const index = Math.floor((progress / 100) * (triangulationPath.length - 1));
            const clampedIndex = Math.min(index, triangulationPath.length - 1);
            setTruckPosTriang(triangulationPath[clampedIndex]);
        }
        if (viaPortPath.length > 0) {
            const index = Math.floor((progress / 100) * (viaPortPath.length - 1));
            const clampedIndex = Math.min(index, viaPortPath.length - 1);
            setTruckPosViaPort(viaPortPath[clampedIndex]);
        }
    }, [progress, triangulationPath, viaPortPath]);

    const handleTogglePlay = () => {
        if (progress >= 100) {
            setProgress(0);
        }
        setIsPlaying(!isPlaying);
    };

    const handleReset = () => {
        setIsPlaying(false);
        setProgress(0);
        setTruckPosTriang(triangulationPath[0] || null);
        setTruckPosViaPort(viaPortPath[0] || null);
    };

    if (!origin || !dest) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
                Data koordinat tidak lengkap
            </div>
        );
    }

    const allPoints: [number, number][] = [origin, dest];
    if (port) allPoints.push(port);

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex gap-4 px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs">
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                    <span className="text-slate-600">Port</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-slate-600">Bongkar</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className="text-slate-600">Muat</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span>🚛</span>
                    <span className="text-slate-600">Truk</span>
                </div>
                
                {isLoadingRoute && (
                    <div className="ml-auto text-amber-600 font-medium">Memuat rute...</div>
                )}
            </div>

            <div className="flex-1 grid grid-cols-2 gap-1 bg-slate-200 min-h-0">
                
                <div className="relative bg-white flex flex-col">
                    <div className="bg-green-600 text-white text-center py-1.5 text-sm font-bold">
                        Triangulasi
                    </div>
                    <div className="flex-1 relative">
                        <MapContainer
                            center={dest}
                            zoom={10}
                            style={{ height: '100%', width: '100%' }}
                            className="z-0"
                        >
                            <TileLayer
                                attribution='&copy; OSM'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {triangulationPath.length > 0 && (
                                <Polyline
                                    positions={triangulationPath}
                                    pathOptions={{
                                        color: '#10b981',
                                        weight: 3,
                                        opacity: 0.5
                                    }}
                                />
                            )}

                            {triangulationPath.length > 0 && progress > 0 && (
                                <Polyline
                                    positions={triangulationPath.slice(0, Math.floor((progress / 100) * triangulationPath.length) + 1)}
                                    pathOptions={{
                                        color: '#059669',
                                        weight: 5,
                                        opacity: 1
                                    }}
                                />
                            )}

                            {port && <Marker position={port} icon={portIcon}><Popup>Port</Popup></Marker>}
                            <Marker position={dest} icon={destIcon}><Popup>Bongkar: {data.DEST_ID}</Popup></Marker>
                            <Marker position={origin} icon={origIcon}><Popup>Muat: {data.ORIG_ID}</Popup></Marker>

                            <MovingTruck position={truckPosTriang} />

                            <AutoZoom points={allPoints} />
                        </MapContainer>
                    </div>
                </div>

                <div className="relative bg-white flex flex-col">
                    <div className="bg-red-600 text-white text-center py-1.5 text-sm font-bold">
                        Via Port
                    </div>
                    <div className="flex-1 relative">
                        <MapContainer
                            center={dest}
                            zoom={10}
                            style={{ height: '100%', width: '100%' }}
                            className="z-0"
                        >
                            <TileLayer
                                attribution='&copy; OSM'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {viaPortPath.length > 0 && (
                                <Polyline
                                    positions={viaPortPath}
                                    pathOptions={{
                                        color: '#ef4444',
                                        weight: 3,
                                        opacity: 0.5,
                                        dashArray: '8, 8'
                                    }}
                                />
                            )}

                            {viaPortPath.length > 0 && progress > 0 && (
                                <Polyline
                                    positions={viaPortPath.slice(0, Math.floor((progress / 100) * viaPortPath.length) + 1)}
                                    pathOptions={{
                                        color: '#dc2626',
                                        weight: 5,
                                        opacity: 1
                                    }}
                                />
                            )}

                            {port && <Marker position={port} icon={portIcon}><Popup>Port</Popup></Marker>}
                            <Marker position={dest} icon={destIcon}><Popup>Bongkar: {data.DEST_ID}</Popup></Marker>
                            <Marker position={origin} icon={origIcon}><Popup>Muat: {data.ORIG_ID}</Popup></Marker>

                            <MovingTruck position={truckPosViaPort} />

                            <AutoZoom points={allPoints} />
                        </MapContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white border-t border-slate-200 p-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleTogglePlay}
                        disabled={isLoadingRoute}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-all ${
                            isLoadingRoute ? 'bg-slate-400 cursor-not-allowed' :
                            isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'
                        }`}
                    >
                        {isPlaying ? '⏸' : '▶'}
                    </button>
                    
                    <button
                        onClick={handleReset}
                        disabled={isLoadingRoute}
                        className="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-all disabled:opacity-50"
                    >
                        🔄
                    </button>
                    
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-linear-to-r from-green-500 to-emerald-500 transition-all duration-100"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    
                    <span className="text-sm font-mono font-bold text-slate-600 w-12 text-right">
                        {Math.round(progress)}%
                    </span>
                    
                    <select
                        value={speed}
                        onChange={(e) => setSpeed(Number(e.target.value))}
                        className="px-2 py-1 text-xs bg-slate-100 border border-slate-200 rounded-lg font-medium"
                    >
                        <option value={0.5}>0.5x</option>
                        <option value={1}>1x</option>
                        <option value={2}>2x</option>
                        <option value={4}>4x</option>
                    </select>
                </div>
            </div>
        </div>
    );
}