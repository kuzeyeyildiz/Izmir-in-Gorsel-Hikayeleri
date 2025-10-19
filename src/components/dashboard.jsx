import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf";
GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

// inject aesthetic marker CSS once
if (
  typeof document !== "undefined" &&
  !document.getElementById("custom-marker-styles")
) {
  const style = document.createElement("style");
  style.id = "custom-marker-styles";
  style.textContent = `
    .custom-marker-wrapper {
      position: relative;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
    }
    .custom-marker {
      position: relative;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2563eb 0%, rgba(37,99,235,0.85) 60%);
      box-shadow: 0 6px 14px rgba(16,24,40,0.18), inset 0 -2px 6px rgba(255,255,255,0.06);
      transition: transform 160ms ease, width 160ms ease, height 160ms ease, border-radius 160ms ease, box-shadow 160ms ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .custom-marker::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: radial-gradient(circle at center, rgba(37,99,235,0.12), rgba(37,99,235,0.02));
      opacity: 0;
      transition: opacity 160ms ease, transform 160ms ease;
      pointer-events: none;
    }
    .custom-marker:hover {
      transform: translateY(-3px) scale(1.05);
      box-shadow: 0 10px 24px rgba(16,24,40,0.22);
    }
    .custom-marker:hover::after { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    .custom-marker.open {
      width: 40px;
      height: 40px;
      border-radius: 6px;
      transform: none;
    }
    .custom-marker .marker-inner {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255,255,255,0.9);
      box-shadow: 0 1px 0 rgba(0,0,0,0.06) inset;
    }
    /* red variant helper */
    .custom-marker.red {
      background: linear-gradient(135deg, #ef4444 0%, rgba(239,68,68,0.9) 60%);
    }
  `;
  document.head.appendChild(style);
}

// pdfjs (Vite-friendly)

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

    const pdfPath = "/assets/gezginler.pdf"; // public/assets/gezginler.pdf

    // replace the old createMarker with this aesthetic version
    const createMarker = (color = "#007bff") => {
      const wrapper = document.createElement("div");
      wrapper.className = "custom-marker-wrapper";

      const circle = document.createElement("div");
      circle.className = "custom-marker";
      // apply red class for red color input to keep consistent gradient
      if (
        color === "#ff3b30" ||
        color.toLowerCase().includes("ff3b30") ||
        color.toLowerCase().includes("red")
      ) {
        circle.classList.add("red");
      } else {
        // allow custom color by setting inline gradient fallback
        circle.style.background = `linear-gradient(135deg, ${color} 0%, rgba(0,0,0,0.08) 60%)`;
      }

      // small white inner dot for contrast
      const inner = document.createElement("div");
      inner.className = "marker-inner";
      circle.appendChild(inner);

      // keep initial sizing inline so existing open/revert logic still works
      circle.style.width = "14px";
      circle.style.height = "14px";
      circle.style.borderRadius = "50%";

      wrapper.appendChild(circle);

      return { wrapper, circle };
    };

    const izmir = createMarker("#007bff");
    const narlidere = createMarker("#ff3b30");

    // store circle DOM refs so other effects can toggle classes
    izmirCircleRef.current = izmir.circle;
    narlidereCircleRef.current = narlidere.circle;

    let izmirMarker = null;
    let narlidereMarker = null;
    let popupIzmir = null;
    let popupNarlidere = null;
    let pdfBlobUrl = null;

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
        pdfBlobUrlRef.current = pdfBlobUrl;

        popupIzmir = new maplibregl.Popup({
          maxWidth: "380px",
          autoPan: false,
        }).setDOMContent(createPopupContentWithPreview(pdfBlobUrl, 0));
        popupNarlidere = new maplibregl.Popup({
          maxWidth: "380px",
          autoPan: false,
        }).setDOMContent(createPopupContentWithPreview(pdfBlobUrl, 0));

        // store popup refs for external effect
        popupIzmirRef.current = popupIzmir;
        popupNarlidereRef.current = popupNarlidere;

        izmirMarker = new maplibregl.Marker({
          element: izmir.wrapper,
          anchor: "center",
        })
          .setLngLat([27.138, 38.4192])
          .setPopup(popupIzmir)
          .addTo(mapInstance);

        narlidereMarker = new maplibregl.Marker({
          element: narlidere.wrapper,
          anchor: "center",
        })
          .setLngLat([27.0, 38.4])
          .setPopup(popupNarlidere)
          .addTo(mapInstance);

        izmirMarkerRef.current = izmirMarker;
        narlidereMarkerRef.current = narlidereMarker;

        const revert = (circleEl) => {
          if (!circleEl) return;
          circleEl.classList.remove("open");
        };

        // click handlers now only toggle open state (React state)
        izmir.wrapper.addEventListener("click", (e) => {
          e.stopPropagation();
          if (openRef.current === "izmir") {
            setOpen(null);
            return;
          }
          setOpen("izmir");
        });

        narlidere.wrapper.addEventListener("click", (e) => {
          e.stopPropagation();
          if (openRef.current === "narlidere") {
            setOpen(null);
            return;
          }
          setOpen("narlidere");
        });
      })
      .catch((err) => {
        console.error("Failed to load PDF for marker popups:", err);

        const fallbackPopupIzmir = new maplibregl.Popup({
          autoPan: false,
        }).setText("İzmir City Center");
        const fallbackPopupNarlidere = new maplibregl.Popup({
          autoPan: false,
        }).setText("Narlıdere");

        izmirMarker = new maplibregl.Marker({ element: izmir.wrapper })
          .setLngLat([27.138, 38.4192])
          .setPopup(fallbackPopupIzmir)
          .addTo(mapInstance);

        narlidereMarker = new maplibregl.Marker({ element: narlidere.wrapper })
          .setLngLat([27.0, 38.4])
          .setPopup(fallbackPopupNarlidere)
          .addTo(mapInstance);

        izmirMarkerRef.current = izmirMarker;
        narlidereMarkerRef.current = narlidereMarker;

        izmir.wrapper.addEventListener("click", (e) => {
          e.stopPropagation();
          if (openRef.current === "izmir") {
            setOpen(null);
            return;
          }
          setOpen("izmir");
        });

        narlidere.wrapper.addEventListener("click", (e) => {
          e.stopPropagation();
          if (openRef.current === "narlidere") {
            setOpen(null);
            return;
          }
          setOpen("narlidere");
        });
      });

    // cleanup for this effect
    return () => {
      if (izmirMarkerRef.current) izmirMarkerRef.current.remove();
      if (narlidereMarkerRef.current) narlidereMarkerRef.current.remove();
      if (popupIzmirRef.current) popupIzmirRef.current.remove();
      if (popupNarlidereRef.current) popupNarlidereRef.current.remove();
      if (pdfBlobUrlRef.current) URL.revokeObjectURL(pdfBlobUrlRef.current);
    };
  }, [mapInstance]); // run when mapInstance available

  // effect: respond to openMarker state changes (open / close appropriate popup and toggle marker class)
  useEffect(() => {
    if (!mapInstance) return;

    const izCircle = izmirCircleRef.current;
    const narCircle = narlidereCircleRef.current;
    const pIz = popupIzmirRef.current;
    const pNar = popupNarlidereRef.current;

    // helper to close both
    const closeBoth = () => {
      pIz?.remove();
      pNar?.remove();
      if (izCircle) izCircle.classList.remove("open");
      if (narCircle) narCircle.classList.remove("open");
    };

    if (openMarker === "izmir") {
      // close other
      pNar?.remove();
      if (narCircle) narCircle.classList.remove("open");

      // open izmir
      if (pIz) {
        pIz.setLngLat([27.138, 38.4192]).addTo(mapInstance);
        // ensure popup close button will update state
        const popEl = pIz.getElement();
        if (popEl) {
          const closeBtn = popEl.querySelector(
            ".maplibregl-popup-close-button"
          );
          if (closeBtn)
            closeBtn.addEventListener("click", () => setOpen(null), {
              once: true,
            });
        }
      }
      if (izCircle) izCircle.classList.add("open");

      // close on next map click
      mapInstance.once("click", () => setOpen(null));
      return;
    }

    if (openMarker === "narlidere") {
      // close other
      pIz?.remove();
      if (izCircle) izCircle.classList.remove("open");

      // open narlidere
      if (pNar) {
        pNar.setLngLat([27.0, 38.4]).addTo(mapInstance);
        const popEl = pNar.getElement();
        if (popEl) {
          const closeBtn = popEl.querySelector(
            ".maplibregl-popup-close-button"
          );
          if (closeBtn)
            closeBtn.addEventListener("click", () => setOpen(null), {
              once: true,
            });
        }
      }
      if (narCircle) narCircle.classList.add("open");

      mapInstance.once("click", () => setOpen(null));
      return;
    }

    // openMarker === null => close everything
    closeBoth();
  }, [openMarker, mapInstance]);

  return (
    <main className="bg-transparent">
      <Map onMapReady={setMapInstance} />
    </main>
  );
};

export default DashBoard;
