import type { Metadata } from "next";
import { DashboardHeading } from "@/components/seller/dashboard-heading";
import { DashboardStats } from "@/components/seller/dashboard-stats";
import { RecentOrders } from "@/components/seller/recent-orders";
import { SetupChecklist } from "@/components/seller/setup-checklist";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function SellerDashboardPage() {
  return (
    <div className="grid gap-8">
      <DashboardHeading />

      {/* New shops see this first. It disappears by itself once the shop is fully set up. */}
      <SetupChecklist />

      <DashboardStats />

      <RecentOrders />
    </div>
  );
}