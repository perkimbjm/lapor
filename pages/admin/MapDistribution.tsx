
import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import AdminLayout from './AdminLayout';
import { db } from '../../src/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Complaint, ComplaintStatus } from '../../types';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../src/lib/firestoreErrorHandler';

const MapDistribution: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'complaints'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
      setComplaints(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'complaints');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (map.current || !mapContainer.current || loading) return;

    // CRITICAL FIX for Sandboxed Environments:
    // Explicitly set the worker URL to an absolute CDN path.
    // This prevents MapLibre from trying to access `window.location.href` to resolve the worker path,
    // which causes "SecurityError: Blocked a frame with origin..." in cross-origin iframes.
    try {
      (maplibregl as any).workerUrl = "https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl-csp-worker.js";
    } catch (e) {
      console.warn("Failed to set workerUrl manually:", e);
    }

    try {
      // Use a local style definition with Raster Tiles (OSM)
      // This avoids fetching external style.json which can also trigger CORS/CSP issues
      const simpleStyle = {
        "version": 8,
        "sources": {
          "osm": {
            "type": "raster",
            "tiles": ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            "tileSize": 256,
            "attribution": "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
            "maxzoom": 19
          }
        },
        "layers": [
          {
            "id": "osm",
            "type": "raster",
            "source": "osm"
          }
        ]
      };

      // Initialize Map
      const mapInstance = new maplibregl.Map({
        container: mapContainer.current,
        style: simpleStyle as any,
        center: [114.5928, -3.3194],
        zoom: 13,
        attributionControl: false,
        hash: false, // Disable URL hash to prevent location access
      });

      map.current = mapInstance;

      mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Wait for map to load before adding markers
      mapInstance.on('load', () => {
        updateMarkers(complaints, mapInstance);
      });
      
      // Handle load errors
      mapInstance.on('error', (e) => {
          console.error("Map internal error:", e);
          if (e.error && e.error.message && (e.error.message.includes('webgl') || e.error.message.includes('support'))) {
             setError("WebGL tidak didukung atau terjadi kesalahan grafis.");
          }
      });

    } catch (err: any) {
      console.error("Error initializing map:", err);
      setError(err.message || "Gagal memuat peta. Browser Anda mungkin memblokir akses peta di mode preview.");
    }

    return () => {
        if(map.current) {
            map.current.remove();
            map.current = null;
        }
    }

  }, []);

  useEffect(() => {
    if (map.current && !loading) {
      updateMarkers(complaints, map.current);
    }
  }, [complaints, loading]);

  const updateMarkers = (data: Complaint[], mapInstance: maplibregl.Map) => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    data.forEach((complaint) => {
      if (!complaint.lat || !complaint.lng) return;

      let color = '#3b82f6'; // Default blue (RECEIVED/SURVEY)
      if (complaint.status === ComplaintStatus.PENDING) color = '#f97316'; // orange
      else if (complaint.status === ComplaintStatus.REJECTED) color = '#ef4444'; // red
      else if (complaint.status === ComplaintStatus.COMPLETED) color = '#22c55e'; // green

      // Create marker element
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.backgroundColor = color;
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([complaint.lng, complaint.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
            <div style="font-family: 'Inter', sans-serif; padding: 8px; color: #1e293b; min-width: 180px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                 <span style="font-weight: 700; font-size: 14px; color: #0f172a;">${complaint.ticketNumber}</span>
              </div>
              <p style="margin-bottom: 4px; font-size: 12px; color: #475569; font-weight: 500;">${complaint.category}</p>
              <p style="margin-bottom: 0; font-size: 11px; color: #64748b;">${complaint.location}</p>
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
                <span style="font-size: 11px; font-weight: 600; color: #334155;">
                  Status: ${complaint.status}
                </span>
              </div>
            </div>
          `)
        )
        .addTo(mapInstance);
      
      markersRef.current.push(marker);
    });
  };

  return (
    <AdminLayout title="Peta Sebaran Kerusakan">
      <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl border border-slate-100 dark:border-slate-700 p-4 h-[calc(100vh-180px)] flex flex-col relative">
        
        {/* Legend */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <div className="flex flex-wrap space-x-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2 shadow-sm border border-white dark:border-slate-700"></span>Tidak Diterima</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-orange-500 mr-2 shadow-sm border border-white dark:border-slate-700"></span>Belum Dikerjakan</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-2 shadow-sm border border-white dark:border-slate-700"></span>Selesai Dikerjakan</div>
            </div>
            <div className="text-slate-400 dark:text-slate-400 text-xs italic">
                *Data dari laporan warga
            </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative bg-slate-100 dark:bg-slate-900">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-[1px]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            )}
            {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Peta Tidak Dapat Dimuat</h3>
                    <p className="text-slate-500 dark:text-slate-300 max-w-xs text-sm mb-4">{error}</p>
                    <button onClick={() => window.location.reload()} className="flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <RefreshCw className="w-4 h-4 mr-2" /> Muat Ulang
                    </button>
                </div>
            ) : (
                <div ref={mapContainer} className="w-full h-full" />
            )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default MapDistribution;
