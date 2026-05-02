import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../src/supabase';
import { ComplaintStatus, RoadType } from '../../types';
import { STATUS_COLORS, STATUS_LABELS } from '../../constants';
import { formatIndonesianDate } from '../../src/lib/dateUtils';
import StatusBadge from '../../components/StatusBadge';
import {
  AlertCircle, RefreshCw, Loader2, Layers, X,
  Calendar, User, MapPin, Navigation, ExternalLink,
  Truck, FileText, Map as MapIcon, ChevronDown
} from 'lucide-react';

// ── Basemaps ──────────────────────────────────────────────────────────────────

const BASEMAPS = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    preview: '#c8e6c9',
  },
  {
    id: 'voyager',
    name: 'Voyager',
    tiles: ['https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'],
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
    preview: '#e3f2fd',
  },
  {
    id: 'light',
    name: 'Light',
    tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
    preview: '#f5f5f5',
  },
  {
    id: 'dark',
    name: 'Dark',
    tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
    preview: '#263238',
  },
  {
    id: 'satellite',
    name: 'Satelit',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: '© <a href="https://www.esri.com/">Esri</a>',
    preview: '#1a237e',
  },
  {
    id: 'topo',
    name: 'Topografi',
    tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
    attribution: '© <a href="https://opentopomap.org/">OpenTopoMap</a> © <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    preview: '#e8f5e9',
  },
] as const;

type BasemapId = typeof BASEMAPS[number]['id'];

// ── Types ─────────────────────────────────────────────────────────────────────

type MarkerData = {
  id: string;
  ticket_number: string;
  category: string;
  status: string;
  lat: number;
  lng: number;
  location: string;
};

type ComplaintDetail = MarkerData & {
  reporter_name?: string;
  reporter_phone?: string;
  description?: string;
  date_submitted?: string;
  created_at?: string;
  image_url?: string;
  rejection_reason?: string;
  survey_date?: string;
  completion_date?: string;
  notes?: string;
};

// STATUS_COLORS & STATUS_LABELS imported from ../../constants

// ── Marker element ────────────────────────────────────────────────────────────

const createMarkerEl = (color: string, category: string, selected = false): HTMLElement => {
  const el = document.createElement('div');
  el.style.cursor = 'pointer';
  el.style.transition = 'transform 0.15s ease, filter 0.15s ease';
  el.dataset.color = color;
  applyMarkerStyle(el, color, selected);

  if (category === RoadType.JEMBATAN) {
    el.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="14" height="14" rx="2" fill="${color}" stroke="white" stroke-width="2"
              transform="rotate(45 11 11)"/>
      </svg>`;
  } else {
    el.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
        <circle cx="11" cy="11" r="8" fill="${color}" stroke="white" stroke-width="2.5"/>
      </svg>`;
  }
  return el;
};

const applyMarkerStyle = (el: HTMLElement, color: string, selected: boolean) => {
  el.style.filter = selected
    ? `drop-shadow(0 0 7px ${color}cc) drop-shadow(0 2px 4px rgba(0,0,0,0.45))`
    : 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))';
  el.style.transform = selected ? 'scale(1.4)' : 'scale(1)';
};

// ── Detail Panel ──────────────────────────────────────────────────────────────

const DetailPanel: React.FC<{
  detail: ComplaintDetail | null;
  loading: boolean;
  onClose: () => void;
}> = ({ detail, loading, onClose }) => {
  const color     = detail ? (STATUS_COLORS[detail.status] ?? '#94a3b8') : '#94a3b8';
  const mapsUrl   = detail ? `https://www.google.com/maps?q=${detail.lat},${detail.lng}` : '#';
  const streetUrl = detail ? `https://www.google.com/maps?layer=c&cbll=${detail.lat},${detail.lng}` : '#';

  const hasHandlingInfo = detail && (
    detail.rejection_reason || detail.survey_date || detail.completion_date
  );

  return (
    <div className="w-80 shrink-0 flex flex-col bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in slide-in-from-right-2 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0">
        <div className="flex-1 min-w-0 pr-2">
          {detail ? (
            <>
              <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 truncate mb-1.5">
                {detail.ticket_number}
              </p>
              <StatusBadge status={detail.status as ComplaintStatus} />
            </>
          ) : (
            <div className="space-y-1.5">
              <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Memuat detail…</p>
          </div>
        ) : detail ? (
          <div className="p-4 space-y-4">

            {/* Foto — lazy: only fetched when panel is open */}
            {detail.image_url && (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                <img
                  src={detail.image_url}
                  alt="Foto aduan"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-40 object-cover"
                  onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
              </div>
            )}

            {/* Meta fields */}
            <div className="space-y-3">
              {(detail.date_submitted || detail.created_at) && (
                <div className="flex items-start gap-2.5">
                  <Calendar size={13} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Tanggal Dikirim</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {formatIndonesianDate(detail.date_submitted || detail.created_at, true)}
                    </p>
                  </div>
                </div>
              )}

              {detail.reporter_name && (
                <div className="flex items-start gap-2.5">
                  <User size={13} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Pelapor</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{detail.reporter_name}</p>
                    {detail.reporter_phone && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{detail.reporter_phone}</p>
                    )}
                  </div>
                </div>
              )}

              {detail.location && (
                <div className="flex items-start gap-2.5">
                  <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Lokasi</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{detail.location}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Deskripsi */}
            {detail.description && (
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText size={11} className="text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Deskripsi Masalah</p>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">"{detail.description}"</p>
              </div>
            )}

            {/* Info Penanganan */}
            {hasHandlingInfo && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Truck size={11} className="text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Info Penanganan</p>
                </div>
                <div className="space-y-2">
                  {detail.rejection_reason && (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5 border border-red-100 dark:border-red-800">
                      <p className="text-[10px] text-red-500 font-bold uppercase mb-1">Alasan Tidak Dikerjakan</p>
                      <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">{detail.rejection_reason}</p>
                    </div>
                  )}
                  {detail.survey_date && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2.5 border border-purple-100 dark:border-purple-800">
                      <p className="text-[10px] text-purple-500 font-bold uppercase mb-1">Tanggal Disurvey</p>
                      <p className="text-xs text-purple-700 dark:text-purple-300">
                        {new Date(detail.survey_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {detail.completion_date && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5 border border-emerald-100 dark:border-emerald-800">
                      <p className="text-[10px] text-emerald-500 font-bold uppercase mb-1">Tanggal Selesai</p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        {new Date(detail.completion_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Keterangan Tambahan */}
            {detail.notes && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-100 dark:border-amber-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1.5">Keterangan Tambahan</p>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{detail.notes}</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      {detail && !loading && (
        <div className="shrink-0 p-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex gap-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <Navigation size={13} /> Google Maps
          </a>
          <a
            href={streetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <ExternalLink size={13} /> Street View
          </a>
        </div>
      )}
    </div>
  );
};

// ── Basemap Switcher ──────────────────────────────────────────────────────────

const BasemapSwitcher: React.FC<{
  active: BasemapId;
  onChange: (id: BasemapId) => void;
}> = ({ active, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeMap = BASEMAPS.find(b => b.id === active)!;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
          open
            ? 'bg-blue-600 text-white border-transparent'
            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'
        }`}
      >
        <MapIcon size={13} />
        {activeMap.name}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 w-56 animate-in fade-in zoom-in-95 duration-150">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 py-1.5 mb-1">Pilih Basemap</p>
          <div className="space-y-0.5">
            {BASEMAPS.map(bm => (
              <button
                key={bm.id}
                onClick={() => { onChange(bm.id); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-colors ${
                  active === bm.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                {/* Warna preview swatch */}
                <span
                  className="w-6 h-6 rounded-lg shrink-0 border border-slate-200 dark:border-slate-600"
                  style={{ backgroundColor: bm.preview }}
                />
                <span>{bm.name}</span>
                {active === bm.id && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const MapDistribution: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (t: string) => void }>();

  const mapContainer  = useRef<HTMLDivElement>(null);
  const map           = useRef<maplibregl.Map | null>(null);
  const markersRef    = useRef<maplibregl.Marker[]>([]);
  const selectedElRef = useRef<HTMLElement | null>(null);

  const [error, setError]     = useState<string | null>(null);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [activeBasemap, setActiveBasemap] = useState<BasemapId>('osm');

  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set([RoadType.JALAN, RoadType.JEMBATAN])
  );
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(
    new Set(Object.values(ComplaintStatus))
  );

  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [detail, setDetail]               = useState<ComplaintDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => { setPageTitle('Peta Sebaran Kerusakan'); }, [setPageTitle]);

  // ── Fetch minimal marker data ──────────────────────────────────────────────
  const fetchMarkers = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('complaints')
      .select('id, ticket_number, category, status, lat, lng, location');

    if (err) {
      console.error(err);
      setError('Gagal mengambil data dari server');
    } else {
      const withCoords = (data ?? []).filter(
        (c: { lat?: number | null; lng?: number | null }) =>
          c.lat != null && c.lng != null &&
          !isNaN(Number(c.lat)) && !isNaN(Number(c.lng))
      );
      setMarkers(withCoords as MarkerData[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMarkers();
    const channel = supabase
      .channel('complaints-map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, fetchMarkers)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMarkers]);

  // ── Lazy fetch detail on marker click ─────────────────────────────────────
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setLoadingDetail(true);
    setDetail(null);

    supabase
      .from('complaints')
      .select('id, ticket_number, category, status, lat, lng, location, reporter_name, reporter_phone, description, date_submitted, created_at, image_url, rejection_reason, survey_date, completion_date, notes')
      .eq('id', selectedId)
      .single()
      .then(({ data, error: err }) => {
        if (err) console.error('Detail fetch error:', err);
        else setDetail(data as ComplaintDetail);
        setLoadingDetail(false);
      });
  }, [selectedId]);

  // ── Init map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      const bm = BASEMAPS.find(b => b.id === activeBasemap)!;

      const instance = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: bm.tiles as string[],
              tileSize: 256,
              attribution: bm.attribution,
            },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        } as maplibregl.StyleSpecification,
        center: [114.5928, -3.3194],
        zoom: 13,
      });

      map.current = instance;
      instance.addControl(new maplibregl.NavigationControl(), 'top-right');
      instance.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
      instance.on('load', () => instance.resize());
      instance.on('error', (e) => {
        console.error('Map error:', e);
        setError('Gagal memuat peta');
      });
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Gagal memuat peta');
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resize map when detail panel opens/closes ──────────────────────────────
  useEffect(() => {
    if (!map.current) return;
    const t = setTimeout(() => map.current?.resize(), 220);
    return () => clearTimeout(t);
  }, [selectedId]);

  // ── Switch basemap tiles (no full style reload) ────────────────────────────
  const handleBasemapChange = useCallback((id: BasemapId) => {
    setActiveBasemap(id);
    if (!map.current) return;
    const bm = BASEMAPS.find(b => b.id === id)!;
    map.current.setStyle({
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: bm.tiles as string[],
          tileSize: 256,
          attribution: bm.attribution,
        },
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
    } as maplibregl.StyleSpecification);
  }, []);

  // ── Re-render markers when data / filters / selection change ──────────────
  useEffect(() => {
    if (!map.current || loading) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    selectedElRef.current = null;

    const filtered = markers.filter(
      c => activeCategories.has(c.category) && activeStatuses.has(c.status)
    );

    filtered.forEach(c => {
      const isSelected = c.id === selectedId;
      const color = STATUS_COLORS[c.status] ?? '#94a3b8';
      const el    = createMarkerEl(color, c.category, isSelected);

      if (isSelected) selectedElRef.current = el;

      el.addEventListener('click', () => {
        // Un-highlight previous
        if (selectedElRef.current && selectedElRef.current !== el) {
          const prev = selectedElRef.current;
          applyMarkerStyle(prev, prev.dataset.color ?? '#94a3b8', false);
        }
        // Highlight clicked
        applyMarkerStyle(el, color, true);
        selectedElRef.current = el;
        setSelectedId(c.id);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([Number(c.lng), Number(c.lat)])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [markers, loading, activeCategories, activeStatuses, selectedId]);

  // ── Toggle helpers ─────────────────────────────────────────────────────────
  const toggleCategory = (cat: string) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const toggleStatus = (st: string) => {
    setActiveStatuses(prev => {
      const next = new Set(prev);
      next.has(st) ? next.delete(st) : next.add(st);
      return next;
    });
  };

  const handleClosePanel = () => {
    if (selectedElRef.current) {
      applyMarkerStyle(selectedElRef.current, selectedElRef.current.dataset.color ?? '#94a3b8', false);
      selectedElRef.current = null;
    }
    setSelectedId(null);
    setDetail(null);
  };

  const visibleCount = markers.filter(
    c => activeCategories.has(c.category) && activeStatuses.has(c.status)
  ).length;

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-148px)]">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1">Kategori</span>
          {[RoadType.JALAN, RoadType.JEMBATAN].map(cat => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                activeCategories.has(cat)
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                  : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600'
              }`}
            >
              {cat === RoadType.JALAN
                ? <span className="w-3 h-3 rounded-full bg-current inline-block" />
                : <span className="w-3 h-3 rounded-sm bg-current inline-block rotate-45" />
              }
              {cat}
            </button>
          ))}

          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-3 mr-1">Status</span>
          {Object.values(ComplaintStatus).map(st => (
            <button
              key={st}
              onClick={() => toggleStatus(st)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                activeStatuses.has(st)
                  ? 'border-transparent text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600'
              }`}
              style={activeStatuses.has(st) ? { backgroundColor: STATUS_COLORS[st] } : {}}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: activeStatuses.has(st) ? '#fff' : STATUS_COLORS[st] }}
              />
              {STATUS_LABELS[st]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {visibleCount} / {markers.length} titik
          </span>

          {/* Basemap switcher */}
          <BasemapSwitcher active={activeBasemap} onChange={handleBasemapChange} />

          <button
            onClick={() => setShowLegend(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              showLegend
                ? 'bg-blue-600 text-white border-transparent'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'
            }`}
          >
            <Layers size={13} /> Legenda
          </button>
        </div>
      </div>

      {/* ── Map + Detail panel ── */}
      <div className="flex flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm min-h-0">

        {/* Map canvas — flex-1, shrinks when panel opens */}
        <div className="relative flex-1 min-w-0">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 z-10">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 p-6">
              <AlertCircle className="text-red-500 mb-2" size={32} />
              <p className="text-slate-700 dark:text-slate-300 font-medium mb-3">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw size={14} /> Muat Ulang
              </button>
            </div>
          )}

          {/* MapLibre canvas */}
          <div ref={mapContainer} className="w-full h-full" />

          {/* Legend overlay */}
          {showLegend && (
            <div className="absolute bottom-4 left-4 z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg p-4 min-w-[180px] max-h-[calc(100%-2rem)] overflow-y-auto">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Legenda</p>

              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Kategori</p>
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2.5">
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <circle cx="8" cy="8" r="5.5" fill="#64748b" stroke="white" strokeWidth="2"/>
                  </svg>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Jalan</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <rect x="3" y="3" width="10" height="10" rx="1.5" fill="#64748b" stroke="white" strokeWidth="2"
                          transform="rotate(45 8 8)"/>
                  </svg>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Jembatan</span>
                </div>
              </div>

              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Status</p>
              <div className="space-y-1.5">
                {Object.values(ComplaintStatus).map(st => (
                  <div key={st} className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[st] }} />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{STATUS_LABELS[st]}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                Klik marker untuk detail.<br />
                Tanpa koordinat tidak ditampilkan.
              </div>
            </div>
          )}
        </div>

        {/* Detail panel (lazy loaded, only mounted on selection) */}
        {selectedId && (
          <DetailPanel
            detail={detail}
            loading={loadingDetail}
            onClose={handleClosePanel}
          />
        )}
      </div>
    </div>
  );
};

export default MapDistribution;
