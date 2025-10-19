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

    const pdfPath = "/assets/gezginler.pdf"; // public/assets/gezginler.pdf

    // create placeholder image element
    const izmirImg = document.createElement("img");
    izmirImg.style.width = "48px";
    izmirImg.style.height = "48px";
    izmirImg.style.objectFit = "cover";
    izmirImg.style.borderRadius = "6px";
    izmirImg.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)";
    izmirImg.style.cursor = "pointer";
    izmirImg.src =
      "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' rx='6' fill='%23007bff'/%3E%3C/svg%3E";

    let izmirMarker = null;
    let pdfBlobUrl = null;
    let popup = null;

    // render first page (for icon) + fetch blob (for iframe) in parallel
    Promise.all([
      renderPdfPageToDataUrl(pdfPath, 1, 1.0).catch(() => null),
      fetch(pdfPath)
        .then((res) => {
          if (!res.ok) throw new Error("fetch failed");
          return res.blob();
        })
        .then((b) => {
          pdfBlobUrl = URL.createObjectURL(b);
          return pdfBlobUrl;
        })
        .catch(() => null),
    ])
      .then(([dataUrl, blobUrl]) => {
        if (dataUrl) izmirImg.src = dataUrl;

        const iframe = document.createElement("iframe");
        // prefer blob URL to avoid embedding/cors issues
        iframe.src = (blobUrl || pdfPath) + "#toolbar=0&view=fitH";
        iframe.style.width = "360px";
        iframe.style.height = "480px";
        iframe.style.border = "none";

        // ensure popup can be large enough
        popup = new maplibregl.Popup({ maxWidth: "380px" }).setDOMContent(iframe);

        izmirMarker = new maplibregl.Marker({ element: izmirImg })
          .setLngLat([27.138, 38.4192])
          .setPopup(popup)
          .addTo(mapInstance);

        // extra: ensure click definitely opens the popup
        izmirMarker.getElement().addEventListener("click", (e) => {
          // avoid default propagation issues
          e.stopPropagation();
          popup.addTo(mapInstance).setLngLat([27.138, 38.4192]);
        });
      })
      .catch((err) => {
        console.error("PDF handling failed:", err);
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

    // narlıdere marker (unchanged)
    const narlidereEl = document.createElement("div");
    narlidereEl.style.width = "20px";
    narlidereEl.style.height = "20px";
    narlidereEl.style.backgroundColor = "#28a745";
    narlidereEl.style.borderRadius = "50%";
    narlidereEl.style.border = "2px solid white";
    narlidereEl.style.boxShadow = "0 0 6px rgba(0,0,0,0.3)";
    narlidereEl.style.cursor = "pointer";

    const narlidereMarker = new maplibregl.Marker({ element: narlidereEl })
      .setLngLat([27.0, 38.4])
      .setPopup(new maplibregl.Popup().setText("narlıdere"))
      .addTo(mapInstance);

    // Cleanup
    return () => {
      if (izmirMarker) izmirMarker.remove();
      if (narlidereMarker) narlidereMarker.remove();
      if (popup) popup.remove();
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [mapInstance]);

  return (
    <main className="bg-transparent">
      <Map onMapReady={setMapInstance} />
    </main>
  );
};

export default DashBoard;
