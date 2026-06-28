import React from "react";
import { Navbar } from "../navbar";
import { Footer } from "../footer";

const Layout = ({ children }) => (
  <div className="flex flex-col min-h-screen">
    <Navbar />
    <main>{children}</main>
    <Footer />
  </div>
);

export default Layout;
