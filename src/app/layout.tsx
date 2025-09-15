'use client'

import { ThemeProviderWrapper } from '@/components/ThemeProviderWrapper'
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
          {children}
        </ThemeProviderWrapper>
      </body>
    </html>
  )
}
