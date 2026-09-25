import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-8xl">404</h1>
      <p className="text-muted-foreground">This page skipped class.</p>
      <Button asChild variant="coral">
        <Link to="/app">Back home</Link>
      </Button>
    </div>
  )
}
