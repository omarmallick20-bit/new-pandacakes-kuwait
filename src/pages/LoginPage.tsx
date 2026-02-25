import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PasswordInput } from "@/components/ui/password-input"
import { useState, useEffect, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2, ArrowLeft } from "lucide-react"
import { PhoneNumberInput } from "@/components/PhoneNumberInput"
import { ForgotPasswordModal } from "@/components/ForgotPasswordModal"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/hooks/useTranslation"

const OPERATION_TIMEOUT_MS = 8000; // 8 second timeout

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phoneNumber: '',
    phonePassword: ''
  })
  const mountedRef = useRef(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const { signIn, signInWithOAuth, user, isAuthReady } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  // CRITICAL: Reset loading state on mount to prevent stuck states
  useEffect(() => {
    mountedRef.current = true
    setIsLoading(false) // Reset on mount
    
    return () => {
      mountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // Wait for auth ready before redirecting
    if (isAuthReady && user && !isLoading) {
      navigate('/', { replace: true })
    }
  }, [user, isLoading, navigate, isAuthReady])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    
    setIsLoading(true)
    
    // Set timeout to auto-reset loading state
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        console.warn('⚠️ [Login] Operation timeout - resetting state')
        setIsLoading(false)
        toast.error('Request timed out. Please try again.')
      }
    }, OPERATION_TIMEOUT_MS)
    
    try {
      const { error } = await signIn(formData.email, formData.password)
      if (!error) {
        const returnUrl = sessionStorage.getItem('return_after_login') || '/cart';
        sessionStorage.removeItem('return_after_login');
        navigate(returnUrl);
      }
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    
    setIsLoading(true)
    
    // Set timeout to auto-reset loading state
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        console.warn('⚠️ [Login] Operation timeout - resetting state')
        setIsLoading(false)
        toast.error('Request timed out. Please try again.')
      }
    }, OPERATION_TIMEOUT_MS)
    
    try {
      const { error } = await signIn(formData.phoneNumber, formData.phonePassword)
      if (!error) {
        const returnUrl = sessionStorage.getItem('return_after_login') || '/cart';
        sessionStorage.removeItem('return_after_login');
        navigate(returnUrl);
      }
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  const handleGoogleLogin = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      await signInWithOAuth('google')
    } catch (error) {
      console.error('Google login error:', error)
      if (mountedRef.current) setIsLoading(false)
    }
  }

  const handleAppleLogin = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      await signInWithOAuth('apple')
    } catch (error) {
      console.error('Apple login error:', error)
      if (mountedRef.current) setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-hero-gradient flex items-center justify-center p-4 relative">
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 md:top-6 md:left-6 flex items-center gap-2 text-black hover:text-gray-700 transition-colors z-10"
        aria-label="Go back to homepage"
      >
        <ArrowLeft className="h-6 w-6" />
        <span className="hidden md:inline text-sm font-medium">{t('login_continue_guest')}</span>
      </button>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {t('login_title')}
          </CardTitle>
          <CardDescription>
            {t('login_subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="phone" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="email">{t('login_email_tab')}</TabsTrigger>
              <TabsTrigger value="phone">{t('login_phone_tab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('login_email_label')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">{t('login_password_label')}</Label>
                  <PasswordInput
                    id="password"
                    placeholder={t('login_password_placeholder')}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    disabled={isLoading}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-tiffany hover:bg-tiffany/90 text-background"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('login_sign_in')}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="phone">
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">{t('login_phone_label')}</Label>
                  <PhoneNumberInput
                    value={formData.phoneNumber}
                    onChange={(value) => setFormData(prev => ({ ...prev, phoneNumber: value }))}
                    placeholder="e.g., +974 xxxx xxxx"
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phonePassword">{t('login_password_label')}</Label>
                  <PasswordInput
                    id="phonePassword"
                    placeholder={t('login_password_placeholder')}
                    value={formData.phonePassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, phonePassword: e.target.value }))}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-tiffany hover:underline"
                  >
                    {t('login_forgot_password')}
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-tiffany hover:bg-tiffany/90 text-background"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('login_sign_in')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t('login_or_continue')}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t('login_google')}
              </Button>

              <Button
                variant="outline"
                onClick={handleAppleLogin}
                disabled={isLoading}
                className="w-full"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                {t('login_apple')}
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t('login_no_account')}
              <Link
                to="/signup"
                className="ml-1 text-tiffany hover:underline font-medium"
              >
                {t('login_signup_link')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      <ForgotPasswordModal 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword} 
      />
    </main>
  )
}
