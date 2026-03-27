import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import CustomersPage from '@/pages/CustomersPage'
import CustomerDetailPage from '@/pages/CustomerDetailPage'
import ContactsPage from '@/pages/ContactsPage'
import LeadsPage from '@/pages/LeadsPage'
import TicketsPage from '@/pages/TicketsPage'
import TicketDetailPage from '@/pages/TicketDetailPage'
import ProjectDetailPage from '@/pages/ProjectDetailPage'
import MyProjectsPage from '@/pages/projects/MyProjectsPage'
import PortfolioManagerPage from '@/pages/projects/PortfolioManagerPage'
import TemplatesPage from '@/pages/projects/TemplatesPage'
import TasksPage from '@/pages/TasksPage'
import ContractsPage from '@/pages/ContractsPage'
import InvoicesPage from '@/pages/InvoicesPage'
import ExpensesPage from '@/pages/ExpensesPage'
import TimeTrackingPage from '@/pages/TimeTrackingPage'
import SettingsPage from '@/pages/SettingsPage'
import MacrosPage from '@/pages/MacrosPage'
import MyTicketsPage from '@/pages/MyTicketsPage'
import TriagePage from '@/pages/TriagePage'
import AssetsPage from '@/pages/inventory/AssetsPage'
import AssetTypesPage from '@/pages/inventory/AssetTypesPage'
import ManufacturersPage from '@/pages/inventory/ManufacturersPage'
import VendorsPage from '@/pages/inventory/VendorsPage'
import LicensesPage from '@/pages/inventory/LicensesPage'
import ShipmentsPage from '@/pages/inventory/ShipmentsPage'
import ProfilePage from '@/pages/ProfilePage'
import AdminLayout from '@/pages/admin/AdminLayout'
import UserManagementPage from '@/pages/admin/UserManagementPage'
import TicketSettingsPage from '@/pages/admin/TicketSettingsPage'
import ProjectSettingsPage from '@/pages/admin/ProjectSettingsPage'
import CrmSettingsPage from '@/pages/admin/CrmSettingsPage'
import SystemSettingsPage from '@/pages/admin/SystemSettingsPage'
import ChangesPage from '@/pages/changes/ChangesPage'
import ChangeFormPage from '@/pages/changes/ChangeFormPage'
import ChangeDetailPage from '@/pages/changes/ChangeDetailPage'
import ChangeApprovalPage from '@/pages/changes/ChangeApprovalPage'
import MyApprovalsPage from '@/pages/changes/MyApprovalsPage'
import MyChangesPage from '@/pages/changes/MyChangesPage'
import TicketSearchPage from '@/pages/TicketSearchPage'
import TeamQueuePage from '@/pages/TeamQueuePage'
import ProductsPage from '@/pages/sales/ProductsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-approval/:token" element={<ChangeApprovalPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/search" element={<TicketSearchPage />} />
          <Route path="tickets/team/:id" element={<TeamQueuePage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
          <Route path="projects" element={<Navigate to="/projects/my" replace />} />
          <Route path="projects/my" element={<MyProjectsPage />} />
          <Route path="projects/portfolio" element={<PortfolioManagerPage />} />
          <Route path="projects/templates" element={<TemplatesPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="time-tracking" element={<TimeTrackingPage />} />
          <Route path="my-tickets" element={<MyTicketsPage />} />
          <Route path="triage" element={<TriagePage />} />
          <Route path="inventory/assets" element={<AssetsPage />} />
          <Route path="inventory/asset-types" element={<AssetTypesPage />} />
          <Route path="inventory/manufacturers" element={<ManufacturersPage />} />
          <Route path="inventory/vendors" element={<VendorsPage />} />
          <Route path="inventory/licenses" element={<LicensesPage />} />
          <Route path="inventory/shipments" element={<ShipmentsPage />} />
          <Route path="changes" element={<ChangesPage />} />
          <Route path="changes/new" element={<ChangeFormPage />} />
          <Route path="changes/my-approvals" element={<MyApprovalsPage />} />
          <Route path="changes/my-changes" element={<MyChangesPage />} />
          <Route path="changes/:id" element={<ChangeDetailPage />} />
          <Route path="changes/:id/edit" element={<ChangeFormPage />} />
          <Route path="macros" element={<MacrosPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/users" replace />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="tickets" element={<TicketSettingsPage />} />
            <Route path="projects" element={<ProjectSettingsPage />} />
            <Route path="crm" element={<CrmSettingsPage />} />
            <Route path="system" element={<SystemSettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
