import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.entry";

GlobalWorkerOptions.workerSrc = pdfWorker;

// helper: render first page of a PDF URL to a dataURL
async function renderPdfPageToDataUrl(pdfUrl, pageNumber = 1, scale = 1.0) {
  const loadingTask = getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/png");
}

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

    // --- changed: use PDF first-page as marker icon and embed full PDF in popup ---

    const pdfPath = "/assets/gezginler.pdf"; // put your PDF here (public/assets/gezginler.pdf)

    // create placeholder element while PDF renders
    const izmirImg = document.createElement("img");
    izmirImg.style.width = "48px";
    izmirImg.style.height = "48px";
    izmirImg.style.objectFit = "cover";
    izmirImg.style.borderRadius = "6px";
    izmirImg.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)";
    izmirImg.style.cursor = "pointer";
    // small default icon while loading
    izmirImg.src =
      "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' rx='6' fill='%23007bff'/%3E%3C/svg%3E";

    let izmirMarker;
    renderPdfPageToDataUrl(pdfPath, 1, 1.0)
      .then((dataUrl) => {
        izmirImg.src = dataUrl;
        // popup: embed the full PDF inside an iframe
        const iframe = document.createElement("iframe");
        iframe.src = pdfPath + "#toolbar=0&view=fitH";
        iframe.style.width = "360px";
        iframe.style.height = "480px";
        iframe.style.border = "none";

        izmirMarker = new maplibregl.Marker({ element: izmirImg })
          .setLngLat([27.138, 38.4192])
          .setPopup(new maplibregl.Popup().setDOMContent(iframe))
          .addTo(mapInstance);
      })
      .catch((err) => {
        console.error("PDF render failed:", err);
        // fallback to simple colored marker
        const fallback = document.createElement("div");
        fallback.style.width = "20px";
        fallback.style.height = "20px";
        fallback.style.backgroundColor = "#007bff";
        fallback.style.borderRadius = "50%";
        izmirMarker = new maplibregl.Marker({ element: fallback })
          .setLngLat([27.138, 38.4192])
          .setPopup(new maplibregl.Popup().setText("İzmir City Center"))
          .addTo(mapInstance);
      });

    // existing Narlıdere marker (unchanged)
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
      .setPopup(new maplibregl.Popup().setText("narlıdere"))
      .addTo(mapInstance);

    // Cleanup
    return () => {
      if (izmirMarker) izmirMarker.remove();
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
