import { createContext, useContext, useEffect, useState } from 'react'
import { DEMO_USERS } from '../data/mock'

const UserModeContext = createContext({
  role: 'clinic',
  user: DEMO_USERS.clinic,
  setRole: () => {},
})

const STORAGE_KEY = 'portal_ux_p0_role'

export function UserModeProvider({ children }) {
  // Public demo defaults to Admin so the landing page (Admin Dashboard) renders
  // correctly. Visitors can switch to Clinic via the secondary top-bar chip.
  const [role, setRoleState] = useState('admin')

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY)
      if (stored === 'clinic' || stored === 'admin') setRoleState(stored)
    } catch { /* ignore */ }
  }, [])

  const setRole = (next) => {
    setRoleState(next)
    try { window.sessionStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
  }

  const user = role === 'admin' ? DEMO_USERS.admin : DEMO_USERS.clinic
  return (
    <UserModeContext.Provider value={{ role, user, setRole }}>
      {children}
    </UserModeContext.Provider>
  )
}

export function useUserMode() {
  return useContext(UserModeContext)
}
