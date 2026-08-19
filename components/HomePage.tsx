"use client";

import { useState } from "react";

import Navbar from "./Navbar";
import Hero from "./Hero";
import TrustedBy from "./TrustedBy";
import HowItWorks from "./HowItWorks";
import Features from "./Features";
import MachineShowcase from "./MachineShowcase";
import Contact from "./Contact";
import Footer from "./Footer";
import DemoModal from "./DemoModal";

export default function HomePage() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  return (
    <>
      <Navbar onDemoClick={() => setIsDemoOpen(true)} />

      <Hero onDemoClick={() => setIsDemoOpen(true)} />

      <TrustedBy />

      <HowItWorks />

      <Features />

      <MachineShowcase />

      <Contact onDemoClick={() => setIsDemoOpen(true)} />

      <Footer />

      <DemoModal
        open={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
      />
    </>
  );
}