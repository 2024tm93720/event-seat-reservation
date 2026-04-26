import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Ticket, Mail, Lock, User, Phone } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input, Label } from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import { loginUser, registerUser, getUser } from '../lib/api'

export function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [mode, setMode]     = useState('login')   // 'login' | 'register'
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        const { data } = await loginUser(form.email, form.password)
        // fetch full user record for name
        const { data: u } = await getUser(data.user_id)
        login({ ...u, token: data.token })
      } else {
        const { data: created } = await registerUser({
          name: form.name, email: form.email,
          phone: form.phone || null, password: form.password,
        })
        const { data: loggedIn } = await loginUser(form.email, form.password)
        login({ ...created, token: loggedIn.token })
      }
      navigate('/')
    } catch (err) {
      setError(err?.response?.data?.detail || err?.response?.data?.error || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Ticket className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">SeatSavvy</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          {/* Tabs */}
          <div className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1 gap-1">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                className={`rounded-md py-1.5 text-sm font-medium transition-all ${
                  mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="name" className="pl-9" placeholder="Jane Doe"
                    value={form.name} onChange={set('name')} required />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" className="pl-9" placeholder="you@example.com"
                  value={form.email} onChange={set('email')} required />
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="phone" type="tel" className="pl-9" placeholder="+91 98765 43210"
                    value={form.phone} onChange={set('phone')} />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" className="pl-9" placeholder="••••••••"
                  value={form.password} onChange={set('password')} required minLength={4} />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Continue as guest?{' '}
          <Link to="/" className="text-primary underline-offset-2 hover:underline">Browse Events</Link>
        </p>
      </div>
    </div>
  )
}
