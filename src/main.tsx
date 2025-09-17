import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import { AuthProvider } from "./contexts/AuthContext";
import { BrowserRouter } from "react-router-dom";
import { MedProvider } from "./contexts/MedsContext";
import { OrderProvider } from "./contexts/OrdersContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <MedProvider>
          <OrderProvider>
            <App />
          </OrderProvider>
        </MedProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
