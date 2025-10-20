import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const Map = ({ onMapReady }) => {
  const mapContainer = useRef(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style:
        "https://api.maptiler.com/maps/streets-v4/style.json?key=jhCcpBmLi8AmPxpV9Clp",
      center: [27.138, 38.4192],
      zoom: 11.5,
      maxBounds: [
        [25.6, 37.6],
        [28.4, 39.5],
      ],
    });

    // custom zoom control (keeps previous)
    class SimpleZoomControl {
      onAdd(mapInstance) {
        this._map = mapInstance;
        this._container = document.createElement("div");
        this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";
        Object.assign(this._container.style, {
          display: "flex",
          flexDirection: "column",
          background: "rgba(255,255,255,0.9)",
          borderRadius: "6px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          overflow: "hidden",
          margin: "8px",
        });
        const btnStyle = {
          width: "36px",
          height: "36px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: "18px",
          lineHeight: "36px",
          textAlign: "center",
          padding: "0",
        };
        const zoomIn = document.createElement("button");
        zoomIn.innerText = "+";
        Object.assign(zoomIn.style, btnStyle);
        zoomIn.title = "Zoom in";
        zoomIn.addEventListener("click", (e) => {
          e.stopPropagation();
          this._map.zoomTo(this._map.getZoom() + 1, { duration: 300 });
        });
        const zoomOut = document.createElement("button");
        zoomOut.innerText = "−";
        Object.assign(zoomOut.style, btnStyle);
        zoomOut.title = "Zoom out";
        zoomOut.addEventListener("click", (e) => {
          e.stopPropagation();
          this._map.zoomTo(this._map.getZoom() - 1, { duration: 300 });
        });
        this._container.appendChild(zoomIn);
        this._container.appendChild(zoomOut);
        return this._container;
      }
      onRemove() {
        if (this._container && this._container.parentNode) {
          this._container.parentNode.removeChild(this._container);
        }
        this._map = undefined;
      }
    }
    map.addControl(new SimpleZoomControl(), "bottom-left");

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

  // use React state to track which marker is open: "izmir" | "narlidere" | null
  const [openMarker, setOpenMarker] = useState(null);
  const openRef = useRef(null);
  // keep a stable setter that updates ref + state
  const setOpen = (val) => {
    openRef.current = val;
    setOpenMarker(val);
  };

  // refs to DOM/Map objects so we can manage them from useEffect that watches openMarker
  const izmirCircleRef = useRef(null);
  const narlidereCircleRef = useRef(null);
  const popupIzmirRef = useRef(null);
  const popupNarlidereRef = useRef(null);
  const izmirMarkerRef = useRef(null);
  const narlidereMarkerRef = useRef(null);
  const pdfBlobUrlRef = useRef(null);

  useEffect(() => {
    if (!mapInstance) return;

    // Create custom marker element
    const el = document.createElement("div");
    el.style.width = "20px";
    el.style.height = "20px";
    el.style.backgroundColor = "#007bff";
    el.style.borderRadius = "50%";
    el.style.border = "2px solid white";
    el.style.boxShadow = "0 0 6px rgba(0,0,0,0.3)";
    el.style.cursor = "pointer";

    // Add marker
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([27.138, 38.4192])
      .setPopup(new maplibregl.Popup().setText("İzmir City Center"))
      .addTo(mapInstance);

    return () => marker.remove();
  }, [mapInstance]);

  return (
    <main className="bg-transparent">
      <Map onMapReady={setMapInstance} />
    </main>
  );
};

export default DashBoard;
