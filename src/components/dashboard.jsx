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
        [25.6, 37.6], // Southwest limit
        [28.4, 39.5], // Northeast limit
      ],
    });

    map.on("style.load", () => {
      const style = map.getStyle();
      const layers = style?.layers;
      if (!layers) return;

      // Hide POI and symbol layers for a cleaner map
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

    // Marker for İzmir City Center
    const izmirMarkerEl = document.createElement("div");
    izmirMarkerEl.style.width = "20px";
    izmirMarkerEl.style.height = "20px";
    izmirMarkerEl.style.backgroundColor = "#007bff";
    izmirMarkerEl.style.borderRadius = "50%";
    izmirMarkerEl.style.border = "2px solid white";
    izmirMarkerEl.style.boxShadow = "0 0 6px rgba(0,0,0,0.3)";
    izmirMarkerEl.style.cursor = "pointer";

    const izmirMarker = new maplibregl.Marker({ element: izmirMarkerEl })
      .setLngLat([27.138, 38.4192])
      .setPopup(new maplibregl.Popup().setText("İzmir City Center"))
      .addTo(mapInstance);

    // Marker for Narlıdere
    const narlidereEl = document.createElement("div");
    narlidereEl.style.width = "20px";
    narlidereEl.style.height = "20px";
    narlidereEl.style.backgroundColor = "#28a745"; // green color for distinction
    narlidereEl.style.borderRadius = "50%";
    narlidereEl.style.border = "2px solid white";
    narlidereEl.style.boxShadow = "0 0 6px rgba(0,0,0,0.3)";
    narlidereEl.style.cursor = "pointer";

    const narlidereMarker = new maplibregl.Marker({ element: narlidereEl })
      .setLngLat([27.0, 38.4]) // approximate coordinates for Narlıdere
      .setPopup(new maplibregl.Popup().setText("Narlıdere"))
      .addTo(mapInstance);

    // Cleanup
    return () => {
      izmirMarker.remove();
      narlidereMarker.remove();
    };
  }, [mapInstance]);

  return (
    <main className="bg-transparent">
      <Map onMapReady={setMapInstance} />
    </main>
  );
};

export default DashBoard;
