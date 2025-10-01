"use client"

import { useEffect } from "react"

interface GlobalErrorHandlerProps {
  children: React.ReactNode
}

export function GlobalErrorHandler({ children }: GlobalErrorHandlerProps) {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      // Prevent the default behavior (which would log to console and potentially crash)
      event.preventDefault()
    }

    // Handle uncaught exceptions
    const handleUncaughtException = (event: ErrorEvent) => {
      console.error('Uncaught exception:', event.error)
      // Prevent the default behavior
      event.preventDefault()
    }

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleUncaughtException)

    // Cleanup function
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleUncaughtException)
    }
  }, [])

  return <>{children}</>
}
