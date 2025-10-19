import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// pdfjs (Vite-friendly)
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf";
GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

// helper: render first page -> dataURL (accepts Blob, blob: URL or normal URL)
async function renderPdfPageToDataUrl(src, pageNumber = 1, scale = 1.0) {
  // Normalize source: if blob: URL fetch ArrayBuffer, if Blob use arrayBuffer, else pass URL string
  let loadingTask;
  if (src instanceof Blob) {
    const arr = await src.arrayBuffer();
    loadingTask = getDocument({ data: arr });
  } else if (typeof src === "string" && src.startsWith("blob:")) {
    const res = await fetch(src);
    if (!res.ok) throw new Error("Failed to fetch blob URL for preview");
    const arr = await res.arrayBuffer();
    loadingTask = getDocument({ data: arr });
  } else if (typeof src === "string") {
    loadingTask = getDocument(src);
  } else {
    // fallback: try passing through (could be {data:...} already)
    loadingTask = getDocument(src);
  }

  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
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

  useEffect(() => {
    if (!mapInstance) return;

    const pdfPath = "/assets/gezginler.pdf"; // public/assets/gezginler.pdf

    // small marker creator
    const createMarker = (color = "#007bff") => {
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.width = "40px";
      wrapper.style.height = "40px";
      wrapper.style.display = "flex";
      wrapper.style.alignItems = "center";
      wrapper.style.justifyContent = "center";
      wrapper.style.pointerEvents = "auto";

      const circle = document.createElement("div");
      circle.style.width = "14px";
      circle.style.height = "14px";
      circle.style.backgroundColor = color;
      circle.style.borderRadius = "50%";
      circle.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)";
      circle.style.transition = "all 150ms ease";
      circle.style.pointerEvents = "none";

      wrapper.appendChild(circle);
      return { wrapper, circle };
    };

    const izmir = createMarker("#007bff");
    const narlidere = createMarker("#ff3b30");

    let izmirMarker = null;
    let narlidereMarker = null;
    let popupIzmir = null;
    let popupNarlidere = null;
    let pdfBlobUrl = null;
    let isOpenIzmir = false;
    let isOpenNarlidere = false;

    // create popup content: will render thumbnail image inside popup and include like button
    const createPopupContentWithPreview = (blobUrl, initialLikes = 0) => {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "360px";
      container.style.height = "480px";
      container.style.boxSizing = "border-box";
      container.style.background = "#fff";

      const img = document.createElement("img");
      img.alt = "PDF preview";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";
      img.style.display = "block";
      // loading placeholder
      img.src =
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(
          `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='480'><rect width='100%' height='100%' fill='#f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-size='16'>Loading preview…</text></svg>`
        );

      // like button inside popup at bottom-right
      const likeBtn = document.createElement("button");
      likeBtn.style.position = "absolute";
      likeBtn.style.right = "8px";
      likeBtn.style.bottom = "8px";
      likeBtn.style.width = "36px";
      likeBtn.style.height = "36px";
      likeBtn.style.borderRadius = "18px";
      likeBtn.style.border = "none";
      likeBtn.style.background = "white";
      likeBtn.style.boxShadow = "0 1px 4px rgba(0,0,0,0.2)";
      likeBtn.style.cursor = "pointer";
      likeBtn.style.display = "flex";
      likeBtn.style.alignItems = "center";
      likeBtn.style.justifyContent = "center";
      likeBtn.style.fontSize = "16px";
      likeBtn.title = "Like";

      const heart = document.createElement("span");
      heart.innerText = "♡";
      heart.style.color = "#ff3b30";
      heart.style.pointerEvents = "none";

      const badge = document.createElement("span");
      badge.innerText = String(initialLikes);
      badge.style.position = "absolute";
      badge.style.top = "-6px";
      badge.style.right = "-6px";
      badge.style.minWidth = "18px";
      badge.style.height = "18px";
      badge.style.padding = "0 4px";
      badge.style.borderRadius = "9px";
      badge.style.background = "#ff3b30";
      badge.style.color = "white";
      badge.style.fontSize = "12px";
      badge.style.display = initialLikes > 0 ? "flex" : "none";
      badge.style.alignItems = "center";
      badge.style.justifyContent = "center";

      likeBtn.appendChild(heart);
      likeBtn.appendChild(badge);
      container.appendChild(img);
      container.appendChild(likeBtn);

      // like state
      let liked = false;
      let likes = initialLikes;
      likeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        liked = !liked;
        if (liked) {
          likes += 1;
          heart.innerText = "♥";
        } else {
          likes = Math.max(0, likes - 1);
          heart.innerText = "♡";
        }
        badge.innerText = String(likes);
        badge.style.display = likes > 0 ? "flex" : "none";
      });

      // render preview async
      renderPdfPageToDataUrl(blobUrl, 1, 1.2)
        .then((dataUrl) => {
          img.src = dataUrl;
        })
        .catch((err) => {
          console.error("Preview render failed:", err);
          // keep placeholder or show fallback text image
          img.src =
            "data:image/svg+xml;charset=UTF-8," +
            encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='480'><rect width='100%' height='100%' fill='#fee2e2'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#b91c1c' font-size='14'>Preview failed</text></svg>`
            );
        });

      return container;
    };

    // fetch blob once and create popups with preview
    fetch(pdfPath)
      .then((res) => {
        if (!res.ok) throw new Error("PDF fetch failed: " + res.status);
        return res.blob();
      })
      .then((blob) => {
        pdfBlobUrl = URL.createObjectURL(blob);

        popupIzmir = new maplibregl.Popup({ maxWidth: "380px", autoPan: false }).setDOMContent(
          createPopupContentWithPreview(pdfBlobUrl, 0)
        );
        popupNarlidere = new maplibregl.Popup({ maxWidth: "380px", autoPan: false }).setDOMContent(
          createPopupContentWithPreview(pdfBlobUrl, 0)
        );

        izmirMarker = new maplibregl.Marker({ element: izmir.wrapper, anchor: "center" })
          .setLngLat([27.138, 38.4192])
          .setPopup(popupIzmir)
          .addTo(mapInstance);

        narlidereMarker = new maplibregl.Marker({ element: narlidere.wrapper, anchor: "center" })
          .setLngLat([27.0, 38.4])
          .setPopup(popupNarlidere)
          .addTo(mapInstance);

        const revert = (circle) => {
          circle.style.width = "14px";
          circle.style.height = "14px";
          circle.style.borderRadius = "50%";
        };

        const openPopup = (opts) => {
          const { circle, popup, coords, otherPopup, otherCircleRefSetter } = opts;
          if (otherPopup) {
            otherPopup.remove();
            if (otherCircleRefSetter) otherCircleRefSetter();
          }
          circle.style.width = "40px";
          circle.style.height = "40px";
          circle.style.borderRadius = "6px";
          popup.setLngLat(coords).addTo(mapInstance);

          const onMapClickRevert = () => {
            revert(circle);
            mapInstance.off("click", onMapClickRevert);
            popup.remove();
          };
          mapInstance.once("click", onMapClickRevert);

          const popEl = popup.getElement();
          if (popEl) {
            const closeBtn = popEl.querySelector(".maplibregl-popup-close-button");
            if (closeBtn) {
              closeBtn.addEventListener(
                () => {
                  revert(circle);
                },
                { once: true }
              );
            }
          }
        };

        izmir.wrapper.addEventListener("click", (e) => {
          e.stopPropagation();
          if (isOpenIzmir) {
            if (popupIzmir) popupIzmir.remove();
            revert(izmir.circle);
            isOpenIzmir = false;
            return;
          }
          if (isOpenNarlidere && popupNarlidere) {
            popupNarlidere.remove();
            revert(narlidere.circle);
            isOpenNarlidere = false;
          }
          openPopup({
            circle: izmir.circle,
            popup: popupIzmir,
            coords: [27.138, 38.4192],
            otherPopup: popupNarlidere,
            otherCircleRefSetter: () => revert(narlidere.circle),
          });
          isOpenIzmir = true;
        });

        narlidere.wrapper.addEventListener("click", (e) => {
          e.stopPropagation();
          if (isOpenNarlidere) {
            if (popupNarlidere) popupNarlidere.remove();
            revert(narlidere.circle);
            isOpenNarlidere = false;
            return;
          }
          if (isOpenIzmir && popupIzmir) {
            popupIzmir.remove();
            revert(izmir.circle);
            isOpenIzmir = false;
          }
          openPopup({
            circle: narlidere.circle,
            popup: popupNarlidere,
            coords: [27.0, 38.4],
            otherPopup: popupIzmir,
            otherCircleRefSetter: () => revert(izmir.circle),
          });
          isOpenNarlidere = true;
        });
      })
      .catch((err) => {
        console.error("Failed to load PDF for marker popups:", err);

        const fallbackPopupIzmir = new maplibregl.Popup({ autoPan: false }).setText(
          "İzmir City Center"
        );
        const fallbackPopupNarlidere = new maplibregl.Popup({ autoPan: false }).setText(
          "Narlıdere"
        );

        izmirMarker = new maplibregl.Marker({ element: izmir.wrapper })
          .setLngLat([27.138, 38.4192])
          .setPopup(fallbackPopupIzmir)
          .addTo(mapInstance);

        narlidereMarker = new maplibregl.Marker({ element: narlidere.wrapper })
          .setLngLat([27.0, 38.4])
          .setPopup(fallbackPopupNarlidere)
          .addTo(mapInstance);

        izmir.wrapper.addEventListener("click", (e) => {
          e.stopPropagation();
          izmir.circle.style.width = "40px";
          izmir.circle.style.height = "40px";
          izmir.circle.style.borderRadius = "6px";
          fallbackPopupIzmir.setLngLat([27.138, 38.4192]).addTo(mapInstance);
          mapInstance.once("click", () => {
            izmir.circle.style.width = "14px";
            izmir.circle.style.height = "14px";
            izmir.circle.style.borderRadius = "50%";
            fallbackPopupIzmir.remove();
          });
        });

        narlidere.wrapper.addEventListener("click", (e) => {
          e.stopPropagation();
          narlidere.circle.style.width = "40px";
          narlidere.circle.style.height = "40px";
          narlidere.circle.style.borderRadius = "6px";
          fallbackPopupNarlidere.setLngLat([27.0, 38.4]).addTo(mapInstance);
          mapInstance.once("click", () => {
            narlidere.circle.style.width = "14px";
            narlidere.circle.style.height = "14px";
            narlidere.circle.style.borderRadius = "50%";
            fallbackPopupNarlidere.remove();
          });
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
