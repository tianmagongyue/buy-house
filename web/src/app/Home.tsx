"use client";

import { useEffect, useMemo, useState } from "react";
import { AmapView, type MapProject } from "@/components/AmapView";

type MetaResponse = {
  totalProjects: number;
  projectsUpdatedAt: string | null;
  pricesUpdatedAt: string | null;
  districts: { district: string; cnt: number }[];
};

type ProjectsResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: MapProject[];
};

function formatPrice(p: number | null) {
  if (typeof p !== "number") return "未知";
  return `${p.toLocaleString("zh-CN")} 元/㎡`;
}

function formatDate(d: string | null) {
  if (!d) return "未知";
  return d.slice(0, 10);
}

export function Home() {
  const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY || "";

  const [view, setView] = useState<"map" | "list">("map");
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [items, setItems] = useState<MapProject[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [year] = useState(2021);
  const [district, setDistrict] = useState<string>("");
  const [q, setQ] = useState("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [includeUnknownPrice, setIncludeUnknownPrice] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => setMeta(d))
      .catch(() => {});
  }, []);

  const queryString = useMemo(() => {
    const u = new URLSearchParams();
    u.set("year", String(year));
    if (district) u.set("district", district);
    if (q.trim()) u.set("q", q.trim());
    if (minPrice.trim()) u.set("minPrice", minPrice.trim());
    if (maxPrice.trim()) u.set("maxPrice", maxPrice.trim());
    u.set("includeUnknownPrice", String(includeUnknownPrice));
    u.set("page", String(page));
    u.set("pageSize", String(pageSize));
    return u.toString();
  }, [year, district, q, minPrice, maxPrice, includeUnknownPrice, page]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/projects?${queryString}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return (await r.json()) as ProjectsResponse;
      })
      .then((d) => {
        setTotal(d.total);
        setItems((prev) => (page === 1 ? d.items : [...prev, ...d.items]));
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setError(String(e?.message || e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [queryString, page]);

  useEffect(() => {
    setPage(1);
  }, [district, q, minPrice, maxPrice, includeUnknownPrice]);

  const canLoadMore = items.length < total && !loading;

  const [adminToken, setAdminToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.sessionStorage.getItem("adminToken") || "";
  });

  const runRefreshPrices = async () => {
    const token = adminToken || window.prompt("输入 REFRESH_TOKEN（仅用于本次会话）") || "";
    if (!token) return;
    window.sessionStorage.setItem("adminToken", token);
    setAdminToken(token);
    await fetch("/api/jobs/refresh-prices", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` }
    });
    await fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => setMeta(d))
      .catch(() => {});
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="text-xl font-semibold">上海 2021 触发限售楼盘</div>
          <div className="text-sm text-gray-600">
            楼盘清单更新：{meta?.projectsUpdatedAt ? formatDate(meta.projectsUpdatedAt) : "—"}；挂牌价更新：
            {meta?.pricesUpdatedAt ? formatDate(meta.pricesUpdatedAt) : "—"}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className={`rounded-md px-3 py-2 text-sm ${
              view === "map" ? "bg-black text-white" : "bg-gray-100"
            }`}
            onClick={() => setView("map")}
          >
            地图视图
          </button>
          <button
            className={`rounded-md px-3 py-2 text-sm ${
              view === "list" ? "bg-black text-white" : "bg-gray-100"
            }`}
            onClick={() => setView("list")}
          >
            列表视图
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-6">
        <input
          className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
          placeholder="搜索楼盘名称/地址"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-md border px-3 py-2 text-sm sm:col-span-1"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
        >
          <option value="">全部区域</option>
          {meta?.districts?.map((d) => (
            <option key={d.district} value={d.district}>
              {d.district}（{d.cnt}）
            </option>
          ))}
        </select>
        <input
          className="rounded-md border px-3 py-2 text-sm sm:col-span-1"
          placeholder="最低价(元/㎡)"
          inputMode="numeric"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <input
          className="rounded-md border px-3 py-2 text-sm sm:col-span-1"
          placeholder="最高价(元/㎡)"
          inputMode="numeric"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
        <div className="flex items-center justify-between gap-3 sm:col-span-1">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includeUnknownPrice}
              onChange={(e) => setIncludeUnknownPrice(e.target.checked)}
            />
            含未知价
          </label>
          <button
            className="rounded-md bg-gray-100 px-3 py-2 text-sm"
            onClick={runRefreshPrices}
          >
            刷新价格
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {view === "map" ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {amapKey ? (
              <AmapView
                amapKey={amapKey}
                items={items}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ) : (
              <div className="flex h-[60vh] items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-600">
                缺少 NEXT_PUBLIC_AMAP_KEY
              </div>
            )}
            <div className="mt-2 text-xs text-gray-600">
              已加载 {items.length} / {total} 条
              {loading ? "（加载中）" : ""}
            </div>
            {canLoadMore ? (
              <button
                className="mt-2 rounded-md bg-gray-100 px-3 py-2 text-sm"
                onClick={() => setPage((p) => p + 1)}
              >
                加载更多
              </button>
            ) : null}
          </div>
          <div className="rounded-lg border p-4">
            {selected ? (
              <div className="space-y-3">
                <div>
                  <div className="text-lg font-semibold">{selected.name}</div>
                  <div className="mt-1 text-sm text-gray-600">
                    {selected.district} · {selected.address}
                  </div>
                </div>
                <div className="text-sm">
                  <div>限售触发：{formatDate(selected.triggered_at)}</div>
                  <div>挂牌价：{formatPrice(selected.price_cny_per_sqm)}</div>
                  {selected.price_updated_at ? (
                    <div>价格更新时间：{formatDate(selected.price_updated_at)}</div>
                  ) : null}
                  {selected.price_source_url ? (
                    <a
                      className="inline-block text-blue-600 hover:underline"
                      href={selected.price_source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      价格来源：{selected.price_source_title || selected.price_source_url}
                    </a>
                  ) : null}
                  {selected.source_url ? (
                    <a
                      className="block text-blue-600 hover:underline"
                      href={selected.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      楼盘来源：{selected.source_title || selected.source_url}
                    </a>
                  ) : null}
                </div>
                {selected.photo_url ? (
                  <img
                    alt={selected.name}
                    src={selected.photo_url}
                    className="h-40 w-full rounded-md object-cover"
                  />
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-gray-600">点击地图点位或列表条目查看详情</div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="text-xs text-gray-600">
            已加载 {items.length} / {total} 条
            {loading ? "（加载中）" : ""}
          </div>
          <div className="divide-y rounded-lg border">
            {items.map((p) => (
              <button
                key={p.id}
                className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-gray-50"
                onClick={() => {
                  setSelectedId(p.id);
                  setView("map");
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-gray-700">{formatPrice(p.price_cny_per_sqm)}</div>
                </div>
                <div className="text-sm text-gray-600">
                  {p.district} · {formatDate(p.triggered_at)} · {p.address}
                </div>
              </button>
            ))}
            {items.length === 0 && !loading ? (
              <div className="px-4 py-6 text-center text-sm text-gray-600">暂无数据</div>
            ) : null}
          </div>
          {canLoadMore ? (
            <button
              className="rounded-md bg-gray-100 px-3 py-2 text-sm"
              onClick={() => setPage((p) => p + 1)}
            >
              加载更多
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
