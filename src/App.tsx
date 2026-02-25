import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { DataProvider } from "@/contexts/DataContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { GlobalModals } from "@/components/GlobalModals";

// Customer Components
import { Header } from "@/components/Header";
import { AppReadyGuard } from "@/components/AppReadyGuard";
import OrderPage from "./pages/OrderPage";
import FAQsPage from "./pages/FAQsPage";
import CategoryPage from "./pages/CategoryPage";
import CakeDetailPage from "./pages/CakeDetailPage";
import CartPage from "./pages/CartPage";
import WishlistPage from "./pages/WishlistPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import ProfilePage from "./pages/ProfilePage";  
import ReviewsPage from "./pages/ReviewsPage";
import ContactPage from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AddressSetupPage from "./pages/AddressSetupPage";
import PhoneSetupPage from "./pages/PhoneSetupPage";
import { AuthCallback } from "@/components/AuthCallback";
import { PhoneGuard } from "@/components/PhoneGuard";
import { TriggerImageMigration } from "@/components/TriggerImageMigration";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import CheckoutPage from "./pages/CheckoutPage";

import NotFound from "./pages/NotFound";
import TermsPage from "./pages/TermsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import RefundPolicyPage from "./pages/RefundPolicyPage";
import { Footer } from "@/components/Footer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="panda-cakes-theme">
      <LanguageProvider>
      <AuthProvider>
        <DataProvider>
        <AppProvider>
        <TriggerImageMigration />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <GlobalModals />
          <BrowserRouter>
            <ErrorBoundary>
              <AppReadyGuard>
                <Routes>
                {/* Auth Routes - No Guards */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                
                {/* Public Policy Pages - No Guards */}
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/refund-policy" element={<RefundPolicyPage />} />
                
                {/* Phone Setup - Must be outside PhoneGuard */}
                <Route path="/phone-setup" element={<PhoneSetupPage />} />
                
                {/* All Other Routes - Protected by PhoneGuard */}
                <Route element={<PhoneGuard />}>
                  <Route path="/address-setup" element={<AddressSetupPage />} />
                  
                  {/* Main App Routes - With Header, Layout and Footer */}
                  <Route path="/" element={
                    <div className="min-h-screen bg-background flex flex-col">
                      <Header />
                      <div className="flex-1"><OrderPage /></div>
                      <Footer />
                    </div>
                  } />
                  <Route path="/faqs" element={
                    <div className="min-h-screen bg-background flex flex-col">
                      <Header />
                      <div className="flex-1"><FAQsPage /></div>
                      <Footer />
                    </div>
                  } />
                  <Route path="/category/:categoryId" element={
                    <div className="min-h-screen bg-background flex flex-col">
                      <Header />
                      <div className="flex-1"><CategoryPage /></div>
                      <Footer />
                    </div>
                  } />
                  <Route path="/cake/:cakeId" element={
                    <div className="min-h-screen bg-background flex flex-col">
                      <Header />
                      <div className="flex-1"><CakeDetailPage /></div>
                      <Footer />
                    </div>
                  } />
                  <Route path="/cart" element={
                    <div className="min-h-screen bg-background flex flex-col">
                      <Header />
                      <div className="flex-1"><CartPage /></div>
                      <Footer />
                    </div>
                  } />
                  <Route path="/checkout" element={
                    <div className="min-h-screen bg-background flex flex-col">
                      <Header />
                      <div className="flex-1"><CheckoutPage /></div>
                      <Footer />
                    </div>
                  } />
                  <Route path="/wishlist" element={
                    <div className="min-h-screen bg-background flex flex-col">
                      <Header />
                      <div className="flex-1"><WishlistPage /></div>
                      <Footer />
                    </div>
                  } />
                  <Route path="/profile" element={
                    <div className="min-h-screen bg-background flex flex-col">
                      <Header />
                      <div className="flex-1"><ProfilePage /></div>
                      <Footer />
                    </div>
                  } />
                  <Route path="/reviews" element={
                    <div className="min-h-screen bg-background flex flex-col">
                      <Header />
                      <div className="flex-1"><ReviewsPage /></div>
                      <Footer />
                    </div>
                  } />
                  <Route path="/contact" element={
                    <div className="min-h-screen bg-background flex flex-col">
                      <Header />
                      <div className="flex-1"><ContactPage /></div>
                      <Footer />
                    </div>
                  } />
                  <Route path="/payment-success" element={
                    <div className="min-h-screen bg-background flex flex-col">
                      <Header />
                      <div className="flex-1"><PaymentSuccessPage /></div>
                      <Footer />
                    </div>
                  } />
                  <Route path="*" element={
                    <div className="min-h-screen bg-background flex flex-col">
                      <Header />
                      <div className="flex-1"><NotFound /></div>
                      <Footer />
                    </div>
                  } />
                </Route>
                </Routes>
              </AppReadyGuard>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
      </DataProvider>
    </AuthProvider>
    </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;