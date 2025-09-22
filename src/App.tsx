import useAuth from "./hooks/useAuth";
import MedsPage from "./pages/MedsPage";
import OrdersPage from "./pages/OrdersPage";
import SubmitPage from "./pages/SubmitPage";
import LoginForm from "./components/auth/LoginForm";
import { PageLayout } from "./components/common/Navbar";
import { Route, Routes } from "react-router-dom";
import ScanCapture from "./components/scanning/ScanCapture";
import CommandBarcodeSheet from "./pages/CommandBarcodeSheet";
import MedBarcodeSheetCompact from "./pages/MedBarcodeSheet";

export default function App() {
  const { user, loading } = useAuth();
  const isAdmin = user ? user.email === "admin@bllk.inv" : false;

  // if page is loading display a message
  if (loading) {
    return (
      <PageLayout>
        <div>Loading authentication status...</div>
      </PageLayout>
    );
  }

  if (user === null) {
    return <LoginForm />;
  }

  return (
    <>
      <ScanCapture />
      <Routes>
        <Route path="/cmd-barcodes" element={<CommandBarcodeSheet />} />
        <Route path="/med-barcodes" element={<MedBarcodeSheetCompact />} />
        <Route
          path="/"
          element={
            <PageLayout>
              <MedsPage />
            </PageLayout>
          }
        />
        <Route
          path="/meds"
          element={
            <PageLayout>
              <MedsPage />
            </PageLayout>
          }
        />
        <Route
          path="/orders"
          element={
            <PageLayout>
              <OrdersPage />
            </PageLayout>
          }
        />
        <Route
          path="/submit"
          element={
            <PageLayout>
              <SubmitPage />
            </PageLayout>
          }
        />
        {isAdmin && (
          <Route path="/settings" element={<PageLayout>{false}</PageLayout>} />
        )}
      </Routes>
    </>
  );
}
