import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import App from "@/app/App";
import { AuthProvider } from "@/contexts/AuthContext";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
      <Toaster richColors theme="dark" position="top-right" closeButton toastOptions={{ className: "border border-gray-700 bg-app-card text-gray-100" }} />
    </AuthProvider>
  </React.StrictMode>
);
