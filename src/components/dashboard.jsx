import { useEffect, useRef, useState } from "react";
// changed: import as namespace so Map is defined
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// add a runtime-safe reference to the MapLibre default export
const Maplibre = maplibregl.default ?? maplibregl;

const Map = ({ onMapReady }) => {
  const mapContainer = useRef(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new Maplibre.Map({
      container: mapContainer.current,
      style:
        "https://api.maptiler.com/maps/streets-v4/style.json?key=jhCcpBmLi8AmPxpV9Clp",
      center: [27.138, 38.4192], // İzmir city center
      zoom: 11.5,
      maxBounds: [
        [25.6, 37.6], // Southwest limit
        [28.4, 39.5], // Northeast limit
      ],
    });

    map.on("style.load", () => {
      const style = map.getStyle();
      const layers = style?.layers;

      if (!layers) return;
      layers.forEach((layer) => {
        if (layer.id.toLowerCase().includes("poi") || layer.type === "symbol") {
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
      });
    });

    onMapReady(map);

    return () => map.remove();
  }, [onMapReady]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full"
      style={{ width: "100%", height: "100vh" }}
    />
  );
};

const DashBoard = () => {
  const [mapInstance, setMapInstance] = useState(null);
  const [markerItems, setMarkerItems] = useState([]); // UI list for bottom-left
  const markersRef = useRef(new Map()); // store maplibre Marker objects

  useEffect(() => {
    if (!mapInstance) return;

    // Create custom center marker
    const el = document.createElement("div");
    el.style.width = "20px";
    el.style.height = "20px";
    el.style.backgroundColor = "#007bff";
    el.style.borderRadius = "50%";
    el.style.border = "2px solid white";
    el.style.boxShadow = "0 0 6px rgba(0,0,0,0.3)";
    el.style.cursor = "pointer";

    const centerMarker = new Maplibre.Marker({ element: el })
      .setLngLat([27.138, 38.4192])
      .setPopup(new Maplibre.Popup().setText("İzmir City Center"))
      .addTo(mapInstance);

    // click handler: add marker and push UI item to bottom-left
    const handleMapClick = (e) => {
      const id = Date.now().toString();
      const markerEl = document.createElement("div");
      markerEl.style.width = "16px";
      markerEl.style.height = "16px";
      markerEl.style.backgroundColor = "#ff5722";
      markerEl.style.borderRadius = "50%";
      markerEl.style.border = "2px solid white";
      markerEl.style.boxShadow = "0 0 4px rgba(0,0,0,0.3)";

      const m = new Maplibre.Marker({ element: markerEl })
        .setLngLat([e.lngLat.lng, e.lngLat.lat])
        .setPopup(
          new Maplibre.Popup({ offset: 10 }).setText(
            `Marker @ ${e.lngLat.lng.toFixed(5)}, ${e.lngLat.lat.toFixed(5)}`
          )
        )
        .addTo(mapInstance);

      markersRef.current.set(id, m);
      setMarkerItems((prev) => [
        ...prev,
        { id, lngLat: [e.lngLat.lng, e.lngLat.lat] },
      ]);
    };

    mapInstance.on("click", handleMapClick);

    return () => {
      centerMarker.remove();
      mapInstance.off("click", handleMapClick);
      // remove any additional markers we created
      markersRef.current.forEach((mk) => mk.remove());
      markersRef.current.clear();
      setMarkerItems([]);
    };
  }, [mapInstance]);

  // click on the small item in the bottom-left: fly to and open popup
  const handleItemClick = (item) => {
    const marker = markersRef.current.get(item.id);
    if (marker && mapInstance) {
      mapInstance.flyTo({ center: item.lngLat, zoom: 14 });
      marker.togglePopup();
    }
  };

  return (
    <main className="bg-transparent">
      <Map onMapReady={setMapInstance} />

      {/* Bottom-left marker list */}
      <div
        style={{
          position: "fixed",
          left: 12,
          bottom: 12,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {markerItems.map((it) => (
          <button
            key={it.id}
            onClick={() => handleItemClick(it)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(0,0,0,0.08)",
              padding: "6px 8px",
              borderRadius: 8,
              cursor: "pointer",
              minWidth: 140,
            }}
            title={`Go to ${it.lngLat[1].toFixed(5)}, ${it.lngLat[0].toFixed(5)}`}
          >
            <span
              style={{
                width: 12,
                height: 12,
                background: "#ff5722",
                borderRadius: "50%",
                border: "2px solid white",
                boxShadow: "0 0 4px rgba(0,0,0,0.2)",
              }}
            />
            <span style={{ fontSize: 12 }}>
              {it.lngLat[1].toFixed(4)}, {it.lngLat[0].toFixed(4)}
            </span>
          </button>
        ))}
      </div>
    </main>
  );
};

export default DashBoard;
