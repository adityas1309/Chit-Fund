import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { CreateCirclePage } from "./pages/CreateCirclePage";
import { BrowseCirclesPage } from "./pages/BrowseCirclesPage";
import { CircleDashboardPage } from "./pages/CircleDashboardPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { Toaster } from "./components/Toaster";
import { useEffect } from "react";
import { isConfigured } from "./lib/config";

export default function App() {
  useEffect(() => {
    if (!isConfigured()) {
      console.warn("Susu contracts are not configured.");
    }
  }, []);
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="create" element={<CreateCirclePage />} />
          <Route path="circles" element={<BrowseCirclesPage />} />
          <Route path="circles/:id" element={<CircleDashboardPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}
