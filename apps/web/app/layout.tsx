import React from 'react'
import Providers from './Providers'
import AppLayout from './AppLayout'
import './globals.css'

export const metadata = {
  title: "HIT Project Evaluation System",
  description: "Web based application that is used at Harare Institute of technology for evaluating student projects. The system aims to computerise the current manual evaluation system to a paper-less system",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full antialiased">
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  )
}