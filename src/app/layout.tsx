'use client'

import { ThemeProviderWrapper } from '@/components/ThemeProviderWrapper'
import { NotificationProvider } from '@/context/NotificationContext'
import CssBaseline from '@mui/material/CssBaseline'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='ja'>
      <body>
        <ThemeProviderWrapper>
          <CssBaseline />
          <NotificationProvider>{children}</NotificationProvider>
        </ThemeProviderWrapper>
      </body>
    </html>
  )
}
