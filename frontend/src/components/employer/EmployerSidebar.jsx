'use client';
import AppTopNav from '@/components/app/AppTopNav';
const NAV = [['Dashboard', '/employer/dashboard'], ['Jobs', '/employer/jobs'], ['Settings', '/employer/settings']];
export default function EmployerSidebar() {
  return <AppTopNav id="employer-v3-shell" items={NAV} navigationLabel="Employer primary" homeHref="/employer/dashboard" />;
}
