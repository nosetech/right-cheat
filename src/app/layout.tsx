'use client'

import { ThemeProviderWrapper } from '@/components/ThemeProviderWrapper'
import { TITLEBAR_HEIGHT } from '@/constants/layout'
import { NotificationProvider } from '@/context/NotificationContext'
import CssBaseline from '@mui/material/CssBaseline'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='ja'>
      <head>
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link
          rel='preconnect'
          href='https://fonts.gstatic.com'
          crossOrigin='anonymous'
        />
        <link
          href='https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&display=swap'
          rel='stylesheet'
        />
      </head>
      <body style={{ paddingTop: `${TITLEBAR_HEIGHT}px` }}>
        <ThemeProviderWrapper>
          <CssBaseline />
          <NotificationProvider>{children}</NotificationProvider>
        </ThemeProviderWrapper>
      </body>
    </html>
  )
}
