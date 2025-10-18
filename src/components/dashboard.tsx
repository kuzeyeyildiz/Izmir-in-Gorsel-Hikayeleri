import Navbar from "../components/navbar";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const Map = ({ onMapReady }: { onMapReady: (map: maplibregl.Map) => void }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style:
        "https://api.maptiler.com/maps/openstreetmap/style.json?key=jhCcpBmLi8AmPxpV9Clp",
      center: [27.1384, 38.4192], // İzmir city center (Konak district)
      zoom: 12,
      maxBounds: [
        [26.9, 38.3], // Southwest limit
        [27.4, 38.6], // Northeast limit
      ],
    });

    // Hide POI layers after style loads
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

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full"
      style={{ width: "100%", height: "100vh" }}
    />
  );
};

const DashBoard = () => {
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);

  return (
    <main className="bg-transparent">
      <Navbar placeholder="Search place" map={mapInstance} />
      <Map onMapReady={setMapInstance} />
    </main>
  );
};

export default DashBoard;
