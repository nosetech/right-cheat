'use client'

import { Alert, Snackbar } from '@mui/material'
import { createContext, useCallback, useContext, useState } from 'react'

type Severity = 'error' | 'warning'

interface NotificationContextValue {
  showError: (message: string) => void
  showWarning: (message: string) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

interface NotificationState {
  open: boolean
  message: string
  severity: Severity
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    severity: 'error',
  })

  const showError = useCallback((message: string) => {
    setNotification({ open: true, message, severity: 'error' })
  }, [])

  const showWarning = useCallback((message: string) => {
    setNotification({ open: true, message, severity: 'warning' })
  }, [])

  const handleClose = useCallback(() => {
    setNotification((prev) => ({ ...prev, open: false }))
  }, [])

  return (
    <NotificationContext.Provider value={{ showError, showWarning }}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={notification.severity}
          variant='filled'
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  )
}

/**
 * 通知コンテキストを取得するフック。
 * NotificationProvider の外で使用した場合は null を返す（エラーにならない）。
 */
export function useNotificationContext(): NotificationContextValue | null {
  return useContext(NotificationContext)
}
