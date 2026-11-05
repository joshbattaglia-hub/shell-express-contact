import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import EnquiryPage from "./pages/EnquiryPage";
import ConfirmPage from "./pages/ConfirmPage";
import AdminLoginPage from "./pages/admin/LoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminEnquiries from "./pages/admin/EnquiriesPage";
import AdminSites from "./pages/admin/SitesPage";
import AdminFields from "./pages/admin/FieldsPage";
import AdminSettings from "./pages/admin/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/enquire" element={<EnquiryPage />} />
      <Route path="/confirm" element={<ConfirmPage />} />
      <Route path="/admin" element={<AdminLoginPage />} />
      <Route path="/admin/app" element={<AdminLayout />}>
        <Route index element={<Navigate to="enquiries" replace />} />
        <Route path="enquiries" element={<AdminEnquiries />} />
        <Route path="sites" element={<AdminSites />} />
        <Route path="fields" element={<AdminFields />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
