import './style.css';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

//HTMLが環境変数を理解しないからts側でスクリプトタグを作る
const script = document.createElement('script');
script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker`;
script.async = true;//スクリプトをHTML解析と並列に読み込み、読み込み次第すぐ実行
script.defer = true;//スクリプトをHTML解析と並列に読み込み、HTML構文解析後に実行
document.head.appendChild(script);

export async function initMap() {
  console.log('initMap called');
//必要な機能を後から読み込む。ライブラリを動的にGoogleのCDNから読み込む
//MarkerLibrary の中から AdvancedMarkerElement を取り出す
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

  const map = new google.maps.Map(document.getElementById("map")!, {
    center: { lat: 35.6895, lng: 139.6917 },//tokyo
    zoom: 7,
    mapId: "3ec330ce2c81c825cf118a5e",
  });

  let currentMarker: google.maps.marker.AdvancedMarkerElement | null = null;
  let infoWindow: google.maps.InfoWindow | null = null;

  //e は Google Maps API が渡してくれるクリックイベントオブジェクト。
  //このオブジェクトの中には latLng というプロパティがあり、それがクリックされた場所の緯度・経度情報を持つ
  map.addListener("click", async (e: google.maps.MapMouseEvent) => {
    const lat = e.latLng?.lat();//緯度  推論される型: number | undefined ?.を使うと「nullやundefinedのときに処理をスキップ」して undefined を返す
    const lng = e.latLng?.lng();//経度 //メソッドとはオブジェクトの中の「関数」プロパティ

    if (currentMarker) currentMarker.map = null;

      // undefinedだったら何もしないで終了
      //JavaScriptでは存在しないプロパティにアクセスすると TypeError が出る。アプリがその時点でクラッシュ
      //TypeScriptは、オプショナルチェーンを使うと、その戻り値に undefined の型が含まれると推論する。
      //Google Maps の仕様では、"click" イベント時は e.latLng はほぼ確実に存在するが、型的には「あるかもないかも」で定義される
    if (lat === undefined || lng === undefined) return;

    currentMarker = new AdvancedMarkerElement({
      position: { lat, lng },
      map,//地図インスタンスを渡すと地図上で描画される。
    });

    try {
      const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lng}&aqi=no`
      const res = await fetch(url);
      const data = await res.json();
      const weather = {
        description: data.current.condition.text as string,
        temp: data.current.temp_c as number,
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
        position: { lat, lng },//infoWindowの吹き出しをどこから表示するかの設定
      });

      infoWindow.open(map);
    } catch (err) {
      console.error("天気情報の取得エラー:", err);
    }
  });
}

//このコードは「Google Mapsライブラリがwindowに読み込まれるのを待つ」ための仕組みで、明示的に「待つ」手段としてPromiseを使っている
//GoogleMAPは外部スクリプトなので読み込みが非同期ですぐに使えないことがある。
function waitForGoogleMaps(): Promise<void> {
  return new Promise((resolve) => {

    //100msごとに「google.mapsが使えるようになったか？」をチェックし、使えるようになったら resolve() を呼んで、待ってる処理
    const interval = setInterval(() => {
      if (window.google && google.maps) {
        clearInterval(interval);
        resolve();// ←「今読み込まれたよ！」と通知する
      }
    }, 100)
  })
}

// window（実行環境、グローバルオブジェクト）
// ├── document（DOMツリーのルート）
// │   ├── <html>
// │   │   ├── <head>
// │   │   └── <body>
// │   │       ├── <div>
// │   │       └── <script>
// ├── console
// ├── localStorage
// ├── navigator
// ├── setTimeout, fetch, alert
// └── google.maps（← Google Mapsを読み込むと追加される）googleはオブジェクトでmapsはプロパティ

waitForGoogleMaps().then(() => {
  initMap();
});

// なぜasync/awaitで書かないのか

// Promise も async/await も、どちらでも非同期処理は書ける。
// 「Promiseで“待てる処理”を作る人（提供者）」と「async/awaitで“待つ処理”を書く人（利用者）」の役割が違う、という点。
// 「Promiseを作る」と「awaitする」は違うレイヤーの役割。
// async function main() {
//   console.log("1秒待ちます");
//   await wait(1000); ← 提供された Promiseがresolve()という関数 を「待って」いる
//   console.log("完了！");
// }
// 提供された Promise（＝待てるオブジェクト）を受け取って
// 「ここで一時停止して、完了を待ってから再開する」
// つまり、Promise を作っていない。ただ使っているだけ。

// なぜgoogleMAPではpromiseで中身を作って明示的に待てる状態にする必要があるの？
// ユーザーからみれば結局データが来るまで待たないといけないのだから、明示的だろうとなかろうといっしょでは？

// APIを呼び出す「fetch」と「CDNスクリプト」の違いはライブラリが待てる形を提供しているかいないか
//厳密にはGoogle Maps APIの設計が変わりつつあり、「必要なライブラリだけ後から読み込む」というモジュール化設計を推進している

// const res = await fetch("/api/weather"); // ← 中身が来るまで暗黙的に待つ
// fetch は最初から Promise を返す関数（利用者は await すればOK）
// ライブラリ側が待てる形を提供している

// 一方で Google Maps のCDNスクリプトはどうか？
// スクリプトが読み込まれるのは「非同期」なのに
// window.google.maps がいつ定義されるかは保証されていない
// Google Maps は「使えるようになったよ」という標準イベントを発火しない
// つまり、待てる仕組みが最初から存在しない
// だから、待てないものは自分で「待てる形（Promise）」にするしかない