import { Routes, Route, Navigate, useParams, Outlet } from "react-router-dom";
import ChooserPage from "./pages/ChooserPage";
import HomePage from "./pages/HomePage";
import EnquiryPage from "./pages/EnquiryPage";
import ConfirmPage from "./pages/ConfirmPage";
import SurveyPage from "./pages/SurveyPage";
import AdminLoginPage from "./pages/admin/LoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminEnquiries from "./pages/admin/EnquiriesPage";
import AdminSites from "./pages/admin/SitesPage";
import AdminFields from "./pages/admin/FieldsPage";
import AdminSettings from "./pages/admin/SettingsPage";
import AdminSurvey from "./pages/admin/SurveyPage";
import type { Tenant } from "./lib/api";

function TenantShell() {
  const { tenant } = useParams();
  if (tenant !== "ca" && tenant !== "coco") return <Navigate to="/" replace />;
  return <Outlet context={{ tenant: tenant as Tenant }} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ChooserPage />} />

      <Route path="/enquire" element={<Navigate to="/ca/enquire" replace />} />
      <Route path="/confirm" element={<Navigate to="/ca/confirm" replace />} />
      <Route path="/admin" element={<Navigate to="/ca/admin" replace />} />
      <Route path="/admin/app/*" element={<Navigate to="/ca/admin/app/enquiries" replace />} />

      <Route path="/:tenant" element={<TenantShell />}>
        <Route index element={<HomePage />} />
        <Route path="enquire" element={<EnquiryPage />} />
        <Route path="survey" element={<SurveyPage />} />
        <Route path="confirm" element={<ConfirmPage />} />
        <Route path="admin" element={<AdminLoginPage />} />
        <Route path="admin/app" element={<AdminLayout />}>
          <Route index element={<Navigate to="enquiries" replace />} />
          <Route path="enquiries" element={<AdminEnquiries />} />
          <Route path="sites" element={<AdminSites />} />
          <Route path="fields" element={<AdminFields />} />
          <Route path="survey" element={<AdminSurvey />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
