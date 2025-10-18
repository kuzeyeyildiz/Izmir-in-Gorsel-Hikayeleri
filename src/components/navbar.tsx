import { HiMagnifyingGlass } from "react-icons/hi2";
import { GiHamburgerMenu } from "react-icons/gi";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FaHome } from "react-icons/fa";
import { MdAccountCircle, MdOutlineManageAccounts } from "react-icons/md";
import { FaBell } from "react-icons/fa";
import { CiLogin } from "react-icons/ci";
import maplibregl from "maplibre-gl";
import SearchForm from "./SearchForm";
const polyline: any = require("@mapbox/polyline");

// --- Utility: debounce ---
function debounce<T extends (...args: any[]) => void>(func: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// --- Overpass Query Builder ---
function buildOverpassQuery(
  filters: { key: string; value?: string }[],
  bbox: [number, number, number, number]
) {
  const bboxString = bbox.join(",");

  const elements = filters
    .map((filter) =>
      filter.value
        ? `node["${filter.key}"="${filter.value}"](${bboxString});`
        : `node["${filter.key}"](${bboxString});`
    )
    .join("\n");

  return `
    [out:json][timeout:25];
    (
      ${elements}
    );
    out body;
  `;
}

// --- Fetch Places by Types from Overpass ---
async function fetchPlacesByTypes(
  types: string[],
  bbox: [number, number, number, number]
) {
  const bboxString = bbox.join(",");
  const filters = types
    .map((type) => `node["amenity"="${type}"](${bboxString});`)
    .join("");

  const query = `
    [out:json][timeout:25];
    (
      ${filters}
    );
    out body;
  `;

  const url = "https://overpass-api.de/api/interpreter";

  try {
    const response = await fetch(url, {
      method: "POST",
      body: query,
      headers: { "Content-Type": "text/plain" },
    });
    const data = await response.json();
    return data.elements;
  } catch (error) {
    console.error("Error fetching places:", error);
    return [];
  }
}

// --- Polyline Decode Helper (using mapbox/polyline imported) ---

// --- Navbar Component ---
const Navbar = ({
  placeholder,
  map,
}: {
  placeholder?: string;
  map?: maplibregl.Map | null;
}) => {
  // --- State ---
  const apiKey = "jhCcpBmLi8AmPxpV9Clp";

  const [query, setQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [places, setPlaces] = useState<any[]>([]);
  const [toPlaces, setToPlaces] = useState<any[]>([]);
  const [searchbarOpen, setSearchbarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [toDropdownStyle, setToDropdownStyle] = useState<React.CSSProperties>(
    {}
  );

  const [departureCoords, setDepartureCoords] = useState<
    [number, number] | null
  >(null);
  const [destinationCoords, setDestinationCoords] = useState<
    [number, number] | null
  >(null);

  // --- Refs ---
  const inputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  const markersRef = useRef<maplibregl.Marker[]>([]);
  const departureMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destinationMarkerRef = useRef<maplibregl.Marker | null>(null);

  // --- Debounced search functions ---
  const debouncedSearch = useRef(
    debounce(async (q: string) => {
      if (q.trim() === "") {
        setPlaces([]);
        return;
      }
      const results = await searchPlaces(q);
      setPlaces(results);
    }, 400)
  ).current;

  const debouncedToSearch = useRef(
    debounce(async (q: string) => {
      if (q.trim() === "") {
        setToPlaces([]);
        return;
      }
      const results = await searchPlaces(q);
      setToPlaces(results);
    }, 400)
  ).current;

  // --- Effects to run debounced searches ---
  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  useEffect(() => {
    debouncedToSearch(toQuery);
  }, [toQuery, debouncedToSearch]);

  // --- Toggle hamburger menu ---
  const toggleHamMenu = () => setMenuOpen((prev) => !prev);

  // --- Search Places with MapTiler API ---
  async function searchPlaces(query: string): Promise<any[]> {
    const bbox: [number, number, number, number] = [
      27.79307, 39.57769, 28.0051, 39.71091,
    ];
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
      query
    )}.json?key=${apiKey}&limit=5&bbox=${bbox.join(",")}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      return data.features;
    } catch (error) {
      console.error("Error searching places:", error);
      return [];
    }
  }

  // --- Search button handlers ---
  const handleSearch = async () => {
    const results = await searchPlaces(query);
    setPlaces(results);
    positionDropdown(inputRef.current, setDropdownStyle);

    clearMarkers();
    addMarkers(results, "red", "place_name");
    flyToFirst(resultCoordinates(results));
  };

  const handleToSearch = async () => {
    console.log("handleToSearch called with:", toQuery);
    const results = await searchPlaces(toQuery);
    console.log("searchPlaces results:", results);
    setToPlaces(results);
    positionDropdown(toInputRef.current, setToDropdownStyle);

    clearDestinationMarker();

    if (results.length > 0) {
      const [lng, lat] = results[0].geometry.coordinates;
      console.log("Setting destination coords:", lng, lat);
      addDestinationMarker([lng, lat]);
      flyToCoords([lng, lat]);
      setDestinationCoords([lng, lat]);
    } else {
      console.log("No results found for 'to' query");
    }
  };

  // --- Utility functions for markers ---
  function clearMarkers() {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  }
  function clearDestinationMarker() {
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }
  }

  const navbarOpen = useCallback(() => {
    setSearchbarOpen(true);
  }, []);

  function addMarkers(
    results: any[],
    color: string,
    popupField: string = "place_name"
  ) {
    if (!map) return;
    results.forEach((place) => {
      const [lng, lat] = place.geometry.coordinates;
      const el = document.createElement("div");
      el.style.width = "20px";
      el.style.height = "20px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = color;

      const popup = new maplibregl.Popup({ offset: 25 }).setText(
        place[popupField]
      );

      const marker = new maplibregl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }
  function addDestinationMarker(coords: [number, number]) {
    if (!map) return;
    destinationMarkerRef.current = new maplibregl.Marker({ color: "green" })
      .setLngLat(coords)
      .setPopup(new maplibregl.Popup().setText("Destination"))
      .addTo(map);
  }

  // --- Fly helpers ---
  function flyToCoords(coords: [number, number]) {
    map?.flyTo({ center: coords, zoom: 14, speed: 0.2, curve: 6 });
  }
  function flyToFirst(coordsArray: [number, number][]) {
    if (coordsArray.length === 0) return;
    flyToCoords(coordsArray[0]);
  }
  function resultCoordinates(results: any[]) {
    return results.map((place) => place.geometry.coordinates);
  }

  // --- Dropdown position helper ---
  function positionDropdown(
    ref: HTMLInputElement | null,
    setStyle: React.Dispatch<React.SetStateAction<React.CSSProperties>>
  ) {
    if (ref) {
      const rect = ref.getBoundingClientRect();
      setStyle({
        position: "absolute",
        top: `${rect.bottom + window.scrollY}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`,
        zIndex: 50,
      });
    } else {
      setStyle({});
    }
  }

  // --- Effect to update dropdown style on places updates ---
  useEffect(() => {
    if (inputRef.current && places.length > 0) {
      positionDropdown(inputRef.current, setDropdownStyle);
    } else {
      setDropdownStyle({});
    }
  }, [places]);

  useEffect(() => {
    if (toInputRef.current && toPlaces.length > 0) {
      positionDropdown(toInputRef.current, setToDropdownStyle);
    } else {
      setToDropdownStyle({});
    }
  }, [toPlaces]);

  // --- Fit map bounds on coords change ---
  useEffect(() => {
    if (!map) return;

    if (departureCoords && destinationCoords) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend(departureCoords);
      bounds.extend(destinationCoords);
      map.fitBounds(bounds, {
        padding: { top: 150, bottom: 100, left: 50, right: 50 },
        maxZoom: 14,
        duration: 1000,
      });
    } else if (departureCoords) {
      map.flyTo({ center: departureCoords, zoom: 12, speed: 0.2, curve: 10 });
    } else if (destinationCoords) {
      map.flyTo({ center: destinationCoords, zoom: 12, speed: 0.2, curve: 10 });
    }
  }, [departureCoords, destinationCoords, map]);

  // --- Geolocation handler ---
  const useCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lng = position.coords.longitude;
        const lat = position.coords.latitude;
        setQuery("My Current Location");

        if (departureMarkerRef.current) departureMarkerRef.current.remove();

        departureMarkerRef.current = new maplibregl.Marker({ color: "red" })
          .setLngLat([lng, lat])
          .addTo(map!);

        if (destinationMarkerRef.current) {
          const bounds = new maplibregl.LngLatBounds();
          bounds.extend([lng, lat]);
          bounds.extend(destinationMarkerRef.current.getLngLat());
          map?.fitBounds(bounds, {
            padding: 100,
            maxZoom: 14,
            duration: 1000,
          });
        } else {
          map?.flyTo({
            center: [lng, lat],
            zoom: 14,
            speed: 0.2,
            curve: 10,
          });
        }

        setDepartureCoords([lng, lat]);
        toInputRef.current?.focus();
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Couldn't get your location.");
      }
    );
  };

  // --- Fetch OTP Route ---
  async function fetchOtpRoute(
    from: [number, number],
    to: [number, number],
    dateTime?: string
  ) {
    const fromStr = `${from[1]},${from[0]}`; // lat,lng
    const toStr = `${to[1]},${to[0]}`; // lat,lng

    const dateParam = dateTime ? `&date=${dateTime.split("T")[0]}` : "";
    const timeParam = dateTime
      ? `&time=${dateTime.split("T")[1].split("Z")[0]}`
      : "";

    const url = `http://localhost:8081/otp/routers/default/plan?fromPlace=${fromStr}&toPlace=${toStr}&mode=BUS,WALK&maxWalkDistance=1000${dateParam}${timeParam}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (e) {
      console.error("OTP route fetch error:", e);
      return null;
    }
  }

  // --- Decode polyline using mapbox/polyline package ---
  // No need to implement your own decodePolyline here, use imported polyline.decode

  // --- Draw route on map ---
  function drawRoute(legs: any[]) {
    if (!map) return;

    // Remove old route layer and source
    if (map.getSource("route")) {
      map.removeLayer("route");
      map.removeSource("route");
    }

    const routeCoords = legs.flatMap((leg) => {
      if (routeCoords.length === 0) return;
      if (leg.legGeometry?.points) {
        return polyline
          .decode(leg.legGeometry.points)
          .map(([lat, lon]) => [lon, lat]);
      }
      return [];
    });

    map.addSource("route", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: routeCoords,
        },
        properties: {},
      },
    });

    map.addLayer({
      id: "route",
      type: "line",
      source: "route",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#ff0000",
        "line-width": 4,
      },
    });

    // Fit map to route bounds
    const firstCoord = routeCoords[0] as [number, number];
    const bounds = routeCoords.reduce(
      (b, coord) => b.extend(coord as [number, number]),
      new maplibregl.LngLatBounds(firstCoord, firstCoord)
    );
    map.fitBounds(bounds, { padding: 50 });

    // --- Effect to fetch and draw route on departure/destination change --
  }
  useEffect(() => {
    console.log(
      "Effect triggered with coords:",
      departureCoords,
      destinationCoords
    );
    if (!departureCoords || !destinationCoords) return;

    (async () => {
      const routeData = await fetchOtpRoute(
        departureCoords,
        destinationCoords,
        new Date().toISOString()
      );

      if (routeData?.plan?.itineraries?.length) {
        drawRoute(routeData.plan.itineraries[0].legs);
      } else {
        console.log("No route found");
      }
    })();
  }, [departureCoords, destinationCoords]);

  // --- JSX Render ---
  return (
    <>
      {searchbarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-0 z-40"
          onClick={() => setSearchbarOpen(false)}
        />
      )}

      {/* FROM Dropdown */}
      {searchbarOpen && focusedField === "from" && (
        <ul
          style={dropdownStyle}
          className="bg-white shadow rounded overflow-hidden absolute z-50"
        >
          <li>
            <button
              className="w-full px-3 py-2 text-sm border-b text-left hover:bg-gray-100 font-medium"
              onClick={useCurrentLocation}
            >
              📍 Use my current location
            </button>
          </li>

          {places.map((place, index) => (
            <li key={index}>
              <button
                className="w-full px-3 py-2 text-sm border-b text-left hover:bg-gray-100"
                onClick={() => {
                  setQuery(place.place_name);
                  toInputRef.current?.focus();
                  const [lng, lat] = place.geometry.coordinates;

                  if (departureMarkerRef.current)
                    departureMarkerRef.current.remove();

                  departureMarkerRef.current = new maplibregl.Marker({
                    color: "red",
                  })
                    .setLngLat([lng, lat])
                    .addTo(map!);

                  if (destinationMarkerRef.current) {
                    const bounds = new maplibregl.LngLatBounds();
                    bounds.extend(departureMarkerRef.current.getLngLat());
                    bounds.extend(destinationMarkerRef.current.getLngLat());
                    map?.fitBounds(bounds, {
                      padding: 100,
                      maxZoom: 14,
                      duration: 1000,
                    });
                  } else {
                    map?.flyTo({
                      center: [lng, lat],
                      zoom: 14,
                      speed: 0.2,
                      curve: 10,
                    });
                  }

                  setDepartureCoords([lng, lat]);

                  if (query.trim()) setSearchbarOpen(false);
                }}
              >
                {place.place_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* TO Dropdown */}
      {searchbarOpen && focusedField === "to" && toPlaces.length > 0 && (
        <ul
          style={toDropdownStyle}
          className="bg-white shadow rounded overflow-hidden absolute z-full"
        >
          {toPlaces.map((place, index) => (
            <button
              key={index}
              className="px-3 py-2 text-sm border-b w-full text-left hover:bg-gray-100"
              onClick={() => {
                setToQuery(place.place_name);
                const [lng, lat] = place.geometry.coordinates;

                if (destinationMarkerRef.current)
                  destinationMarkerRef.current.remove();

                destinationMarkerRef.current = new maplibregl.Marker({
                  color: "green",
                })
                  .setLngLat([lng, lat])
                  .addTo(map!);

                if (departureMarkerRef.current) {
                  const bounds = new maplibregl.LngLatBounds();
                  bounds.extend(departureMarkerRef.current.getLngLat());
                  bounds.extend(destinationMarkerRef.current.getLngLat());
                  map?.fitBounds(bounds, {
                    padding: 100,
                    maxZoom: 14,
                    duration: 1000,
                  });
                } else {
                  map?.flyTo({
                    center: [lng, lat],
                    zoom: 14,
                    speed: 0.2,
                    curve: 10,
                  });
                }

                setDestinationCoords([lng, lat]);
                setFocusedField(null);
              }}
            >
              {place.place_name}
            </button>
          ))}
        </ul>
      )}
      {/* Navbar with search input and hamburger menu */}
      <div
        className="
          md:w-1/2 w-full
          max-w-xl px-4
          sm:justify-evenly
          lg:w-1/3 absolute top-4
          flex-grow flex flex-row
          left-1/2 transform -translate-x-1/2
          z-40 items-center justify-start"
      >
        <div
          ref={inputRef}
          className="relative flex-grow w-full px-1 justify-start"
        >
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={query}
              className={
                searchbarOpen ? "navbar z-40 rounded-l-md" : "navbar z-40"
              }
              placeholder={searchbarOpen ? "From:" : "Search Place"}
              onFocus={() => setFocusedField("from")}
              onClick={navbarOpen}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                  toInputRef.current?.focus();
                  toInputRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }
              }}
            />
            {searchbarOpen && (
              <input
                ref={toInputRef}
                type="text"
                value={toQuery}
                onFocus={() => {
                  setFocusedField("to");
                }}
                onChange={(e) => setToQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleToSearch();
                }}
                placeholder="To:"
                className="navbar rounded-md z-40"
              />
            )}
          </div>

          <button className="searchbar z-50" onClick={handleSearch}>
            <HiMagnifyingGlass size={25} />
          </button>
        </div>
        {!searchbarOpen && (
          <button className="hamMenu" onClick={toggleHamMenu}>
            <GiHamburgerMenu size={25} />
          </button>
        )}
      </div>

      {/* Hamburger menu overlay */}
      {menuOpen && searchbarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <HamMenu />
        </>
      )}
    </>
  );
};

export default Navbar;

// Hamburger menu component
const HamMenu = () => (
  <div
    className="
      fixed top-0 right-0 h-screen
      flex flex-col bg-gray-100
      text-gray-400 sm:w-64 max-w-xs z-50
      pl-2 transition-transform duration-300
      translate-x-0
    "
  >
    <HamMenuIcon icon={<MdAccountCircle size={25} />} text="Profile" />
    <HamMenuIcon icon={<FaHome size={25} />} text="Home" />
    <HamMenuIcon icon={<MdOutlineManageAccounts size={25} />} text="Settings" />
    <HamMenuIcon icon={<FaBell size={25} />} text="Notifications" />
    <HamMenuIcon icon={<CiLogin size={25} />} text="Login/Sign Up" />
  </div>
);

// Icon + label for hamburger menu items
const HamMenuIcon = ({ icon, text }: { icon?: ReactNode; text?: string }) => (
  <div className="hamMenuIcon flex items-center px-2 py-3 cursor-pointer rounded">
    <div>{icon}</div>
    <span className="ml-3">{text}</span>
  </div>
);
