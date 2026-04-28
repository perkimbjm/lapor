import ReactDOM from "react-dom/client"
import App from "./App"
import "./src/index.css"

// StrictMode dilepas: di dev mode menyebabkan komponen mount→unmount→mount
// yang terlihat seperti "refresh" terutama saat ganti tab + ada efek async.
// Untuk production tidak ada perbedaan perilaku.
ReactDOM.createRoot(document.getElementById("root")!).render(<App />)