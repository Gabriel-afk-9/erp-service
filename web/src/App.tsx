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
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
