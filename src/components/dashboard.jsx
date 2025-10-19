import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// no pdfjs-dist here — we fetch the PDF as a blob and embed in an iframe popup

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

    const pdfPath = "/assets/gezginler.pdf"; // public/assets/gezginler.pdf

    // create two identical marker elements (city center + narlidere)
    const createSmallBlue = () => {
      const el = document.createElement("div");
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.backgroundColor = "#007bff";
      el.style.borderRadius = "50%";
      el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";
      el.style.transition = "all 150ms ease";
      return el;
    };

    const izmirEl = createSmallBlue();
    const narlidereEl = createSmallBlue();

    // make Narlıdere marker red
    narlidereEl.style.backgroundColor = "#ff3b30"; // red
    // optional: adjust border for contrast
    narlidereEl.style.border = "2px solid white";

    let izmirMarker = null;
    let narlidereMarker = null;
    let popupIzmir = null;
    let popupNarlidere = null;
    let pdfBlobUrl = null;
    let isOpenIzmir = false;
    let isOpenNarlidere = false;

    // helper to revert style
    const revertIzmirStyle = () => {
      izmirEl.style.width = "14px";
      izmirEl.style.height = "14px";
      izmirEl.style.borderRadius = "50%";
    };
    const revertNarlidereStyle = () => {
      narlidereEl.style.width = "14px";
      narlidereEl.style.height = "14px";
      narlidereEl.style.borderRadius = "50%";
    };

    // fetch PDF once and create two popups using the same blob URL
    fetch(pdfPath)
      .then((res) => {
        if (!res.ok) throw new Error("PDF fetch failed: " + res.status);
        return res.blob();
      })
      .then((blob) => {
        pdfBlobUrl = URL.createObjectURL(blob);

        // Izmir popup + marker
        const iframeIzmir = document.createElement("iframe");
        iframeIzmir.src = pdfBlobUrl + "#toolbar=0&view=fitH";
        iframeIzmir.style.width = "360px";
        iframeIzmir.style.height = "480px";
        iframeIzmir.style.border = "none";

        popupIzmir = new maplibregl.Popup({ maxWidth: "380px", autoPan: false }).setDOMContent(
          iframeIzmir
        );

        izmirMarker = new maplibregl.Marker({ element: izmirEl, anchor: "center" })
          .setLngLat([27.138, 38.4192])
          .setPopup(popupIzmir)
          .addTo(mapInstance);

        // Aynı şey işte
        const iframeNarlidere = document.createElement("iframe");
        iframeNarlidere.src = pdfBlobUrl + "#toolbar=0&view=fitH";
        iframeNarlidere.style.width = "360px";
        iframeNarlidere.style.height = "480px";
        iframeNarlidere.style.border = "none";

        popupNarlidere = new maplibregl.Popup({ maxWidth: "380px", autoPan: false }).setDOMContent(
          iframeNarlidere
        );

        narlidereMarker = new maplibregl.Marker({ element: narlidereEl, anchor: "center" })
          .setLngLat([27.0, 38.4])
          .setPopup(popupNarlidere)
          .addTo(mapInstance);

        // open/close helpers (ensure clicking one closes the other)
        const openIzmir = () => {
          // close other
          if (isOpenNarlidere && popupNarlidere) {
            popupNarlidere.remove();
            revertNarlidereStyle();
            isOpenNarlidere = false;
          }

          izmirEl.style.width = "40px";
          izmirEl.style.height = "40px";
          izmirEl.style.borderRadius = "6px";
          popupIzmir.setLngLat([27.138, 38.4192]).addTo(mapInstance);
          isOpenIzmir = true;

          const onMapClickRevert = () => {
            revertIzmirStyle();
            isOpenIzmir = false;
            mapInstance.off("click", onMapClickRevert);
            if (popupIzmir) popupIzmir.remove();
          };
          mapInstance.once("click", onMapClickRevert);

          const popEl = popupIzmir.getElement();
          if (popEl) {
            const closeBtn = popEl.querySelector(".maplibregl-popup-close-button");
            if (closeBtn) {
              closeBtn.addEventListener(
                "click",
                () => {
                  revertIzmirStyle();
                  isOpenIzmir = false;
                },
                { once: true }
              );
            }
          }
        };

        const openNarlidere = () => {
          // yok eben
          if (isOpenIzmir && popupIzmir) {
            popupIzmir.remove();
            revertIzmirStyle();
            isOpenIzmir = false;
          }

          narlidereEl.style.width = "40px";
          narlidereEl.style.height = "40px";
          narlidereEl.style.borderRadius = "6px";
          popupNarlidere.setLngLat([27.0, 38.4]).addTo(mapInstance);
          isOpenNarlidere = true;

          const onMapClickRevert = () => {
            revertNarlidereStyle();
            isOpenNarlidere = false;
            mapInstance.off("click", onMapClickRevert);
            if (popupNarlidere) popupNarlidere.remove();
          };
          mapInstance.once("click", onMapClickRevert);

          const popEl = popupNarlidere.getElement();
          if (popEl) {
            const closeBtn = popEl.querySelector(".maplibregl-popup-close-button");
            if (closeBtn) {
              closeBtn.addEventListener(
                "click",
                () => {
                  revertNarlidereStyle();
                  isOpenNarlidere = false;
                },
                { once: true }
              );
            }
          }
        };

        // açılıp kapatma şeysi
        izmirEl.addEventListener("click", (e) => {
          e.stopPropagation();
          if (isOpenIzmir) {
            if (popupIzmir) popupIzmir.remove();
            revertIzmirStyle();
            isOpenIzmir = false;
            return;
          }
          openIzmir();
        });

        narlidereEl.addEventListener("click", (e) => {
          e.stopPropagation();
          if (isOpenNarlidere) {
            if (popupNarlidere) popupNarlidere.remove();
            revertNarlidereStyle();
            isOpenNarlidere = false;
            return;
          }
          openNarlidere();
        });
      })
      .catch((err) => {
        console.error("Failed to load PDF for marker popups:", err);

        // CİRCLE BLUE
        const fallbackPopupIzmir = new maplibregl.Popup({ autoPan: false }).setText(
          "İzmir City Center"
        );
        const fallbackPopupNarlidere = new maplibregl.Popup({ autoPan: false }).setText(
          "Narlıdere"
        );

        izmirMarker = new maplibregl.Marker({ element: izmirEl })
          .setLngLat([27.138, 38.4192])
          .setPopup(fallbackPopupIzmir)
          .addTo(mapInstance);

        narlidereMarker = new maplibregl.Marker({ element: narlidereEl })
          .setLngLat([27.0, 38.4])
          .setPopup(fallbackPopupNarlidere)
          .addTo(mapInstance);

        // Simpler massev
        let fbOpenIzmir = false;
        izmirEl.addEventListener("click", (e) => {
          e.stopPropagation();
          if (fbOpenIzmir) {
            fallbackPopupIzmir.remove();
            fbOpenIzmir = false;
          } else {
            fallbackPopupIzmir.setLngLat([27.138, 38.4192]).addTo(mapInstance);
            fbOpenIzmir = true;
          }
        });

        let fbOpenNar = false;
        narlidereEl.addEventListener("click", (e) => {
          e.stopPropagation();
          if (fbOpenNar) {
            fallbackPopupNarlidere.remove();
            fbOpenNar = false;
          } else {
            fallbackPopupNarlidere.setLngLat([27.0, 38.4]).addTo(mapInstance);
            fbOpenNar = true;
          }
        });
      });

    return () => {
      if (izmirMarker) izmirMarker.remove();
      if (narlidereMarker) narlidereMarker.remove();
      if (popupIzmir) popupIzmir.remove();
      if (popupNarlidere) popupNarlidere.remove();
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
