import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { AppearanceProvider } from './contexts/AppearanceContext';
import { DashboardLayout as Layout } from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Loyalty from './pages/Loyalty';
import CRM from './pages/CRM';
import Logistics from './pages/Logistics';
import Integrations from './pages/Integrations';
import BI from './pages/BI';
import Finance from './pages/Finance';
import AppearanceSettings from './pages/AppearanceSettings';
import Automations from './pages/Automations';
import Employees from './pages/Employees';
import Fiscal from './pages/Fiscal';
import Kitchen from './pages/Kitchen';
import Permissions from './pages/Permissions';
import Purchases from './pages/Purchases';
import Settings from './pages/Settings';
import MyAccount from './pages/MyAccount';
import Subscription from './pages/Subscription';
import Sales from './pages/Sales';
import Login from './pages/Login';
import Registro from './pages/Registro';
import ResetSenha from './pages/ResetSenha';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';
import { Toaster } from 'react-hot-toast';
import { ModuloLocked } from './components/ModuloLocked';

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
    <AuthProvider>
      <AppearanceProvider>
        <AppProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Registro />} />
              <Route path="/redefinir-senha" element={<ResetSenha />} />
              <Route
                path="/"
                element={
                  <Layout>
                    <Dashboard />
                  </Layout>
                }
              />
              <Route
                path="/products"
                element={
                  <Layout>
                    <Products />
                  </Layout>
                }
              />
              <Route
                path="/orders"
                element={
                  <Layout>
                    <Orders />
                  </Layout>
                }
              />
              <Route
                path="/sales"
                element={
                  <Layout>
                    <Sales />
                  </Layout>
                }
              />
              <Route
                path="/customers"
                element={
                  <Layout>
                    <Customers />
                  </Layout>
                }
              />
              <Route
                path="/suppliers"
                element={
                  <Layout>
                    <Suppliers />
                  </Layout>
                }
              />
              <Route
                path="/cashier"
                element={
                  <Layout>
                    <POS />
                  </Layout>
                }
              />
              <Route
                path="/pos"
                element={
                  <Layout>
                    <POS />
                  </Layout>
                }
              />
              <Route
                path="/inventory"
                element={
                  <Layout>
                    <Inventory />
                  </Layout>
                }
              />
              <Route
                path="/reports"
                element={
                  <Layout>
                    <Reports />
                  </Layout>
                }
              />
              <Route path="/loyalty" element={<Layout><ModuloLocked modulo="fidelidade"><Loyalty /></ModuloLocked></Layout>} />
              <Route path="/crm" element={<Layout><ModuloLocked modulo="crm"><CRM /></ModuloLocked></Layout>} />
              <Route path="/logistics" element={<Layout><ModuloLocked modulo="logistica"><Logistics /></ModuloLocked></Layout>} />
              <Route path="/integrations" element={<Layout><ModuloLocked modulo="api_acesso"><Integrations /></ModuloLocked></Layout>} />
              <Route path="/bi" element={<Layout><ModuloLocked modulo="relatorios"><BI /></ModuloLocked></Layout>} />
              <Route path="/finance" element={<Layout><ModuloLocked modulo="financeiro"><Finance /></ModuloLocked></Layout>} />
              <Route path="/employees" element={<Layout><ModuloLocked modulo="funcionarios"><Employees /></ModuloLocked></Layout>} />
              <Route path="/kitchen" element={<Layout><Kitchen /></Layout>} />
              <Route path="/purchases" element={<Layout><ModuloLocked modulo="compras"><Purchases /></ModuloLocked></Layout>} />
              <Route path="/automations" element={<Layout><ModuloLocked modulo="automacoes"><Automations /></ModuloLocked></Layout>} />
              <Route path="/fiscal" element={<Layout><ModuloLocked modulo="nfe"><Fiscal /></ModuloLocked></Layout>} />
              <Route path="/subscription" element={<Layout><Subscription /></Layout>} />
              <Route path="/my-account" element={<Layout><MyAccount /></Layout>} />
              <Route path="/permissions" element={<Layout><Permissions /></Layout>} />
              <Route path="/settings" element={<Layout><Settings /></Layout>} />
              <Route path="/settings/appearance" element={<Layout><AppearanceSettings /></Layout>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>

            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  fontSize: '14px',
                },
                success: { iconTheme: { primary: 'var(--success)', secondary: 'white' } },
              }}
            />
          </BrowserRouter>
        </AppProvider>
      </AppearanceProvider>
    </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
