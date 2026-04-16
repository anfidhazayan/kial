import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// Auth Pages
import Login from "./pages/Login";

// CSO Pages
import CSODashboard from "./pages/cso/CSODashboard";
import EntitiesPage from "./pages/cso/EntitiesPage";
import EntityDetailsPage from "./pages/cso/EntityDetailsPage";
import ApprovalsPage from "./pages/cso/ApprovalsPage";
import StaffManagementPage from "./pages/cso/StaffManagementPage";
import StaffDetailsPage from "./pages/cso/StaffDetailsPage";
import AddStaffPage from "./pages/cso/AddStaffPage";
import ImportDataPage from "./pages/cso/ImportDataPage";
import AuditLogPage from "./pages/cso/AuditLogPage";
import SystemOverviewPage from "./pages/cso/SystemOverviewPage";
import CertificateTypesPage from "./pages/cso/CertificateTypesPage";

// Entity Head Pages
import EntityDashboard from "./pages/entity/EntityDashboard";
import EntityStaffPage from "./pages/entity/EntityStaffPage";
import EntityStaffDetailsPage from "./pages/entity/EntityStaffDetailsPage";
import EntityCertificates from "./pages/entity/EntityCertificates";

// Staff Pages
import StaffProfile from "./pages/staff/StaffProfile";
import StaffCertificates from "./pages/staff/StaffCertificates";

// Shared
import { entityAPI, staffAPI, adminAPI } from "./services/api";

import { useState, useEffect } from "react";

// Dashboard Router
const DashboardRouter = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "CSO") {
    return <Navigate to="/cso/dashboard" replace />;
  } else if (user.role === "ENTITY_HEAD") {
    return <Navigate to={`/entity/${user.entityId}/dashboard`} replace />;
  } else if (user.role === "STAFF") {
    return <Navigate to="/staff/profile" replace />;
  }

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardRouter />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* CSO Routes */}
          <Route
            path="/cso/dashboard"
            element={
              <ProtectedRoute allowedRoles={["CSO"]}>
                <Layout>
                  <CSODashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/entities"
            element={
              <ProtectedRoute allowedRoles={["CSO"]}>
                <Layout>
                  <EntitiesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/entities/:id"
            element={
              <ProtectedRoute allowedRoles={["CSO"]}>
                <Layout>
                  <EntityDetailsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/approvals"
            element={
              <ProtectedRoute allowedRoles={["CSO"]}>
                <Layout>
                  <ApprovalsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={["CSO"]}>
                <Layout>
                  <StaffManagementPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/new"
            element={
              <ProtectedRoute allowedRoles={["CSO"]}>
                <Layout>
                  <AddStaffPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/:id"
            element={
              <ProtectedRoute allowedRoles={["CSO"]}>
                <Layout>
                  <StaffDetailsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/entity-staff/:id"
            element={
              <ProtectedRoute allowedRoles={["CSO", "ENTITY_HEAD"]}>
                <Layout>
                  <EntityStaffDetailsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/import"
            element={
              <ProtectedRoute allowedRoles={["CSO"]}>
                <Layout>
                  <ImportDataPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <ProtectedRoute allowedRoles={["CSO"]}>
                <Layout>
                  <AuditLogPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/system-overview"
            element={
              <ProtectedRoute allowedRoles={["CSO"]}>
                <Layout>
                  <SystemOverviewPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/certificate-types"
            element={
              <ProtectedRoute allowedRoles={["CSO"]}>
                <Layout>
                  <CertificateTypesPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Entity Head Routes */}
          <Route
            path="/entity/:entityId/dashboard"
            element={
              <ProtectedRoute allowedRoles={["ENTITY_HEAD"]}>
                <Layout>
                  <EntityDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/entity/:entityId/staff"
            element={
              <ProtectedRoute allowedRoles={["ENTITY_HEAD"]}>
                <Layout>
                  <EntityStaffPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/entity/:entityId/certificates"
            element={
              <ProtectedRoute allowedRoles={["ENTITY_HEAD"]}>
                <Layout>
                  <EntityCertificates />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Staff Routes */}
          <Route
            path="/staff/profile"
            element={
              <ProtectedRoute allowedRoles={["STAFF"]}>
                <Layout>
                  <StaffProfile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={["STAFF"]}>
                <Layout>
                  <StaffProfile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/certificates"
            element={
              <ProtectedRoute allowedRoles={["STAFF"]}>
                <Layout>
                  <StaffCertificates />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
