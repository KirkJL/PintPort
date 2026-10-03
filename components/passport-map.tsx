"use client";
import { useEffect, useRef, useState } from "react";
import type { Venue } from "@/lib/data";
import type { Map as MapType } from "maplibre-gl";
import { MapPin, RefreshCw } from "lucide-react";
export type MapVenue = Venue & { experiences: number; beers?: number };
export default function PassportMap({
  venues,
  onSelect,
  compact = false,
}: {
  venues: MapVenue[];
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null),
    map = useRef<MapType | null>(null),
    select = useRef(onSelect);
  select.current = onSelect;
  const [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0),
    [ready, setReady] = useState(false);
  const data = JSON.stringify(venues);
  useEffect(() => {
    let disposed = false;
    setReady(false);
    setFailed(false);
    (async () => {
      try {
        const ml = await import("maplibre-gl");
        if (disposed || !root.current) return;
        const m = new ml.Map({
          container: root.current,
          style: "https://tiles.openfreemap.org/styles/positron",
          center: [12, 40],
          zoom: compact ? 2.1 : 2,
          minZoom: 1,
          maxZoom: 18,
          attributionControl: { compact: true },
        });
        map.current = m;
        m.addControl(
          new ml.NavigationControl({ showCompass: false }),
          "top-right",
        );
        m.on("load", () => {
          if (disposed) return;
          m.addSource("venues", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
            cluster: true,
            clusterMaxZoom: 13,
            clusterRadius: 55,
            clusterProperties: { total: ["+", ["get", "experiences"]] },
          });
          m.addLayer({
            id: "clusters",
            type: "circle",
            source: "venues",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": "#234c40",
              "circle-radius": [
                "step",
                ["get", "point_count"],
                21,
                10,
                27,
                50,
                33,
              ],
              "circle-stroke-width": 3,
              "circle-stroke-color": "#ffffff",
            },
          });
          m.addLayer({
            id: "cluster-count",
            type: "symbol",
            source: "venues",
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["to-string", ["get", "total"]],
              "text-size": 14,
            },
            paint: { "text-color": "#ffffff" },
          });
          m.addLayer({
            id: "places",
            type: "circle",
            source: "venues",
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": "#ca8139",
              "circle-radius": 9,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 3,
            },
          });
          m.on("click", "clusters", async (e) => {
            const f = e.features?.[0];
            if (!f) return;
            const source = m.getSource("venues") as any;
            const zoom = await source.getClusterExpansionZoom(
              f.properties!.cluster_id,
            );
            m.easeTo({ center: (f.geometry as any).coordinates, zoom });
          });
          m.on("click", "places", (e) => {
            const id = e.features?.[0]?.properties?.id;
            if (id) select.current(id);
          });
          for (const layer of ["clusters", "places"]) {
            m.on(
              "mouseenter",
              layer,
              () => (m.getCanvas().style.cursor = "pointer"),
            );
            m.on("mouseleave", layer, () => (m.getCanvas().style.cursor = ""));
          }
          setReady(true);
        });
        m.on("error", () => {
          if (!disposed) setFailed(true);
        });
      } catch {
        if (!disposed) setFailed(true);
      }
    })();
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
  }, [retry, compact]);
  useEffect(() => {
    if (!ready || !map.current) return;
    const m = map.current;
    const source = m.getSource("venues") as any;
    source?.setData({
      type: "FeatureCollection",
      features: venues.map((v) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [v.lng, v.lat] },
        properties: { id: v.id, name: v.name, experiences: v.experiences },
      })),
    });
    if (venues.length) {
      const lngs = venues.map((v) => v.lng),
        lats = venues.map((v) => v.lat);
      m.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: compact ? 55 : 80, maxZoom: 13, duration: 800 },
      );
    }
  }, [data, ready, compact]);
  return (
    <div className={"map-frame " + (compact ? "compact" : "")}>
      <div
        ref={root}
        className="map-canvas"
        aria-label="Interactive map of deliberately logged venues"
      />
      {failed ? (
        <div className="map-message">
          <MapPin />
          <strong>The map couldn’t load</strong>
          <p>Your places and memories are still available below.</p>
          <button
            className="btn outline"
            onClick={() => setRetry((x) => x + 1)}
          >
            <RefreshCw size={16} />
            Retry map
          </button>
        </div>
      ) : !ready ? (
        <div className="map-loading">Opening your world…</div>
      ) : null}
      {ready && !failed && (
        <span className="map-legend">
          <i /> {venues.length} places · tap a pin to explore
        </span>
      )}
    </div>
  );
}
