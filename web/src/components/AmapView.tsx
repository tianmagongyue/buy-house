"use client";

import { useEffect, useMemo, useRef } from "react";

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
  items: MapProject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const clusterRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  const points = useMemo(
    () =>
      props.items
        .filter((p) => typeof p.lng === "number" && typeof p.lat === "number")
        .map((p) => ({ ...p, lng: p.lng as number, lat: p.lat as number })),
    [props.items]
  );

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

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
        mapRef.current = new AMap.Map(containerRef.current, {
          zoom: 10,
          center: [121.4737, 31.2304]
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [props.amapKey]);

  useEffect(() => {
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
    if (!AMap) return;

    if (!infoWindowRef.current) {
      infoWindowRef.current = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -30) });
    }

    const markers = points.map((p) => {
      const marker = new AMap.Marker({
        position: [p.lng, p.lat],
        title: p.name,
        extData: { id: p.id }
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

    clusterRef.current = new AMap.MarkerClusterer(map, markers, {
      gridSize: 80
    });
  }, [points, props.onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const selected = points.find((p) => p.id === props.selectedId);
    if (!selected) return;
    map.setCenter([selected.lng, selected.lat]);
    map.setZoom(13);
  }, [props.selectedId, points]);

  return <div ref={containerRef} className="h-[60vh] w-full rounded-lg bg-gray-100" />;
}
