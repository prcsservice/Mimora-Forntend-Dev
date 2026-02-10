import { useEffect, lazy, Suspense, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import Lenis from 'lenis'

// Providers
import { AuthProvider } from './contexts/AuthContext'

// Components
import PageLoader from './components/common/PageLoader'
import PageTransition from './components/common/PageTransition'
import { RevealLoader } from './components/common/RevealLoader'
import { Toaster } from './components/common/Toaster'

// Pages
const LandingPage = lazy(() => import('./pages/LandingPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const HomePage = lazy(() => import('./pages/HomePage'))

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// Separate component so useLocation() is inside <Router>
function AnimatedRoutes() {
  const location = useLocation();

  // Group auth sub-routes under a single key so navigating between
  // /auth, /auth/customer/login, /auth/customer/signup, etc.
  // does NOT trigger a full page exit/enter transition.
  const getRouteKey = (pathname: string) => {
    if (pathname.startsWith('/auth')) return '/auth';
    return pathname;
  };

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />} key={getRouteKey(location.pathname)}>
        <Routes location={location}>
          <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />

          {/* Auth Routes - handled by AuthPage which reads the URL */}
          <Route path="/auth" element={<PageTransition><AuthPage /></PageTransition>} />
          <Route path="/auth/customer" element={<Navigate to="/auth/customer/login" replace />} />
          <Route path="/auth/customer/login" element={<PageTransition><AuthPage /></PageTransition>} />
          <Route path="/auth/customer/signup" element={<PageTransition><AuthPage /></PageTransition>} />
          <Route path="/auth/artist" element={<Navigate to="/auth/artist/login" replace />} />
          <Route path="/auth/artist/login" element={<PageTransition><AuthPage /></PageTransition>} />
          <Route path="/auth/artist/signup" element={<PageTransition><AuthPage /></PageTransition>} />

          <Route path="/home" element={<PageTransition><HomePage /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    // Timer for the splash screen display duration
    const splashTimer = setTimeout(() => {
      setIsLoading(false);
    }, 3500); // Show splash for 3.5 seconds before reveal

    return () => {
      lenis.destroy()
      clearTimeout(splashTimer);
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          {/* Main App Content - always rendered underneath */}
          <div className="min-h-screen bg-white">
            <AnimatedRoutes />
          </div>

          {/* Reveal Loader Overlay - shrinks away to reveal content */}
          <RevealLoader isLoading={isLoading} />

          {/* Toast Notifications */}
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
