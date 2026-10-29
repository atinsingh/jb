'use client';
import AppTopNav from '@/components/app/AppTopNav';
import EmployerV3SurfaceStyles from '@/components/employer/EmployerV3SurfaceStyles';
const NAV = [['Dashboard', '/employer/dashboard'], ['Jobs', '/employer/jobs'], ['Bookings', '/employer/bookings'], ['Messages', '/employer/messages'], ['Settings', '/employer/settings']];
export default function EmployerSidebar() {
  return (
    <>
      <EmployerV3SurfaceStyles />
      <AppTopNav id="employer-v3-shell" data-v3-page="true" items={NAV} navigationLabel="Employer primary" homeHref="/employer/dashboard" />
    </>
  );
}
