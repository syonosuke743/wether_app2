import './style.css';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

const script = document.createElement('script');
script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&libraries=marker`;
script.async = true;
script.defer = true;
document.head.appendChild(script);

export async function initMap() {
  console.log('initMap called');

  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

  const map = new google.maps.Map(document.getElementById("map")!, {
    center: { lat: 35.6895, lng: 139.6917 },
    zoom: 7,
    mapId: "3ec330ce2c81c825cf118a5e",
  });

  let currentMarker: google.maps.marker.AdvancedMarkerElement | null = null;
  let infoWindow: google.maps.InfoWindow | null = null;

  map.addListener("click", async (e: any) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    if (currentMarker) currentMarker.map = null;

    currentMarker = new AdvancedMarkerElement({
      position: { lat, lng },
      map,
    });

    try {
      const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lng}&aqi=no`
      const res = await fetch(url);
      const data = await res.json();
      const weather = {
        description: data.current.condition.text,
        temp: data.current.temp_c,
      };

      if (infoWindow) infoWindow.close();

      infoWindow = new google.maps.InfoWindow({
        content: `
          <div>
            <strong>天気情報</strong><br>
            緯度: ${lat.toFixed(2)}, 経度: ${lng.toFixed(2)}<br>
            天気: ${weather.description}<br>
            気温: ${weather.temp}℃<br>
          </div>
        `,
        position: { lat, lng },
      });

      infoWindow.open(map);
    } catch (err) {
      console.error("天気情報の取得エラー:", err);
    }
  });
}

function waitForGoogleMaps(): Promise<void> {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (window.google && google.maps) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}

waitForGoogleMaps().then(() => {
  initMap();
});
