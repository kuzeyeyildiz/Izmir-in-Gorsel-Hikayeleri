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
      center: [27.138, 38.4192], // İzmir city center
      zoom: 11.5,
      maxBounds: [
        [26.9, 38.3], // Southwest limit
        [27.4, 38.6], // Northeast limit
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
