import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AttendancePage } from "./features/atd/presentation/pages/AttendancePage.js";
import { LoginPage } from "./features/auth/presentation/pages/LoginPage.js";
import { Layout } from "./shared/presentation/components/Layout.js";
import { PrivateRoute } from "./shared/presentation/components/PrivateRoute.js";
import { DashboardPage } from "./shared/presentation/pages/DashboardPage.js";
import { FamiliesPage } from "./features/registration/presentation/pages/FamiliesPage.js";
import { FamilyDetailPage } from "./features/registration/presentation/pages/FamilyDetailPage.js";
import { NewFamilyPage } from "./features/registration/presentation/pages/NewFamilyPage.js";
import { NewPersonPage } from "./features/registration/presentation/pages/NewPersonPage.js";
import { PersonDetailPage } from "./features/registration/presentation/pages/PersonDetailPage.js";
import { PersonsPage } from "./features/registration/presentation/pages/PersonsPage.js";
import { CategoriesPage } from "./features/inventory/presentation/pages/CategoriesPage.js";
import { CategoryDetailPage } from "./features/inventory/presentation/pages/CategoryDetailPage.js";
import { ItemsPage } from "./features/inventory/presentation/pages/ItemsPage.js";
import { NewItemPage } from "./features/inventory/presentation/pages/NewItemPage.js";
import { UnitsPage } from "./features/inventory/presentation/pages/UnitsPage.js";
import { BazarPage } from "./features/inventory/presentation/pages/BazarPage.js";
import { ReportsPage } from "./features/reports/presentation/pages/ReportsPage.js";
import { StockReportPage } from "./features/reports/presentation/pages/StockReportPage.js";
import { DeliveryReportPage } from "./features/reports/presentation/pages/DeliveryReportPage.js";
import { NotFoundPage } from "./shared/presentation/pages/NotFoundPage.js";
import { BalancePage } from "./features/inventory/presentation/pages/BalancePage.js";
import { BazarDetailPage } from "./features/inventory/presentation/pages/BazarDetailPage.js";
import { CountPage } from "./features/inventory/presentation/pages/CountPage.js";
import { ItemMovementsPage } from "./features/inventory/presentation/pages/ItemMovementsPage.js";
import { NewReceiptPage } from "./features/inventory/presentation/pages/NewReceiptPage.js";
import { ReceiptDetailPage } from "./features/inventory/presentation/pages/ReceiptDetailPage.js";
import { ReceiptsPage } from "./features/inventory/presentation/pages/ReceiptsPage.js";
import { DeliveriesPage } from "./features/deliveries/presentation/pages/DeliveriesPage.js";
import { DeliveryDetailPage } from "./features/deliveries/presentation/pages/DeliveryDetailPage.js";
import { NewDeliveryPage } from "./features/deliveries/presentation/pages/NewDeliveryPage.js";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/families" element={<FamiliesPage />} />
            <Route path="/families/new" element={<NewFamilyPage />} />
            <Route path="/families/:id" element={<FamilyDetailPage />} />
            <Route path="/persons/new" element={<NewPersonPage />} />
            <Route path="/persons" element={<PersonsPage />} />
            <Route path="/persons/:id" element={<PersonDetailPage />} />
            <Route path="/inventory/categories" element={<CategoriesPage />} />
            <Route path="/inventory/categories/:id" element={<CategoryDetailPage />} />
            <Route path="/inventory/units" element={<UnitsPage />} />
            <Route path="/inventory/items" element={<ItemsPage />} />
            <Route path="/inventory/items/new" element={<NewItemPage />} />
            <Route path="/inventory/bazar" element={<BazarPage />} />
            <Route path="/inventory/bazar-transfers/:id" element={<BazarDetailPage />} />
            <Route path="/inventory/receipts" element={<ReceiptsPage />} />
            <Route path="/inventory/receipts/new" element={<NewReceiptPage />} />
            <Route path="/inventory/receipts/:id" element={<ReceiptDetailPage />} />
            <Route path="/inventory/balance" element={<BalancePage />} />
            <Route path="/inventory/items/:id/movements" element={<ItemMovementsPage />} />
            <Route path="/inventory/counts" element={<CountPage />} />
            <Route path="/deliveries" element={<DeliveriesPage />} />
            <Route path="/deliveries/new" element={<NewDeliveryPage />} />
            <Route path="/deliveries/:id" element={<DeliveryDetailPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/stock" element={<StockReportPage />} />
            <Route path="/reports/deliveries" element={<DeliveryReportPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
