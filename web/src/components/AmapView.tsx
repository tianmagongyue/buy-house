"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type MapProject = {
  id: string;
  name: string;
  district: string;
  address: string;
  lng: number | null;
  lat: number | null;
  triggered_at: string | null;
  price_cny_per_sqm: number | null;
  price_source_title?: string | null;
  price_source_url?: string | null;
  price_updated_at?: string | null;
  photo_url: string | null;
  source_title?: string | null;
  source_url?: string | null;
};

export function AmapView(props: {
  amapKey: string;
  securityCode?: string;
  indexById?: Record<string, number>;
  items: MapProject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const clusterRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(0);
  const [debug, setDebug] = useState("");

  const points = useMemo(
    () =>
      props.items
        .filter((p) => {
          const lng = (p as any).lng;
          const lat = (p as any).lat;
          if (lng === null || lat === null || lng === undefined || lat === undefined) return false;
          const lngNum = Number(lng);
          const latNum = Number(lat);
          if (!Number.isFinite(lngNum) || !Number.isFinite(latNum)) return false;
          if (lngNum === 0 && latNum === 0) return false;
          return true;
        })
        .map((p) => ({ ...p, lng: Number((p as any).lng), lat: Number((p as any).lat) })),
    [props.items]
  );

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    if (props.securityCode) {
      (window as any)._AMapSecurityConfig = { securityJsCode: props.securityCode };
    }

    import("@amap/amap-jsapi-loader")
      .then((m) => m.default)
      .then((loader) =>
        loader.load({
          key: props.amapKey,
          version: "2.0",
          plugins: ["AMap.MarkerClusterer"]
        })
      )
      .then((AMap) => {
        if (cancelled) return;
        if (mapRef.current) return;
        setLoadError(null);
        mapRef.current = new AMap.Map(containerRef.current, {
          zoom: 10,
          center: [121.4737, 31.2304]
        });
        setTimeout(() => {
          try {
            mapRef.current?.resize?.();
          } catch {}
        }, 0);
        setMapReady((v) => v + 1);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(String(e?.message || e));
      });

    return () => {
      cancelled = true;
    };
  }, [props.amapKey, props.securityCode]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    if (clusterRef.current) {
      clusterRef.current.setMap(null);
      clusterRef.current = null;
    }

    for (const m of markersRef.current) {
      try {
        m.setMap(null);
      } catch {}
    }
    markersRef.current = [];

    const AMap = (window as any).AMap;
    if (!AMap) {
      if (!loadError) setLoadError("AMap 未加载成功，请检查 NEXT_PUBLIC_AMAP_KEY 与安全配置");
      return;
    }

    if (!infoWindowRef.current) {
      infoWindowRef.current = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -30) });
    }

    const markers = points.map((p) => {
      const idx = props.indexById?.[p.id];
      const content =
        typeof idx === "number"
          ? `<div style="width:24px;height:24px;border-radius:9999px;background:#111827;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.25);border:2px solid #ffffff;">${idx}</div>`
          : null;
      const marker = new AMap.Marker({
        position: [p.lng, p.lat],
        title: p.name,
        extData: { id: p.id },
        ...(content ? { content, offset: new AMap.Pixel(-12, -12) } : {})
      });
      marker.on("click", () => {
        props.onSelect(p.id);
        const price =
          typeof p.price_cny_per_sqm === "number"
            ? `${p.price_cny_per_sqm.toLocaleString("zh-CN")} 元/㎡`
            : "未知";
        const triggered = p.triggered_at ? p.triggered_at.slice(0, 10) : "未知";
        const priceSource = p.price_source_url
          ? `<div><a href="${p.price_source_url}" target="_blank" rel="noreferrer" style="color:#2563eb;text-decoration:none">价格来源</a></div>`
          : "";
        const projectSource = p.source_url
          ? `<div><a href="${p.source_url}" target="_blank" rel="noreferrer" style="color:#2563eb;text-decoration:none">楼盘来源</a></div>`
          : "";
        infoWindowRef.current?.setContent(
          `<div style="font-size:12px;line-height:1.4"><div style="font-weight:600">${p.name}</div><div>${p.district}</div><div>限售触发：${triggered}</div><div>挂牌价：${price}</div>${priceSource}${projectSource}</div>`
        );
        infoWindowRef.current?.open(map, [p.lng, p.lat]);
      });
      return marker;
    });

    markersRef.current = markers;

    const enableCluster = !props.indexById;
    const canCluster = enableCluster && typeof AMap.MarkerClusterer === "function";
    if (canCluster) {
      try {
        clusterRef.current = new AMap.MarkerClusterer(map, markers, {
          gridSize: 80
        });
      } catch {
        for (const m of markers) {
          try {
            m.setMap(map);
          } catch {}
        }
      }
    } else {
      for (const m of markers) {
        try {
          m.setMap(map);
        } catch {}
      }
    }
    if (markers.length > 0) {
      map.setFitView(markers);
    }
    setDebug(
      `points=${points.length} markers=${markers.length} cluster=${String(Boolean(canCluster))} zoom=${map.getZoom?.()}`
    );
  }, [points, props.onSelect, mapReady, loadError, props.indexById]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    const selected = points.find((p) => p.id === props.selectedId);
    if (!selected) return;
    map.setCenter([selected.lng, selected.lat]);
    map.setZoom(13);
  }, [props.selectedId, points, mapReady]);

  if (loadError) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center rounded-lg bg-gray-100 px-4 text-sm text-gray-700">
        高德地图加载失败：{loadError}
      </div>
    );
  }

  return (
    <div className="relative h-[60vh] w-full rounded-lg bg-gray-100">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-white/80 px-2 py-1 text-[10px] text-gray-700">
        {debug}
      </div>
    </div>
  );
}
