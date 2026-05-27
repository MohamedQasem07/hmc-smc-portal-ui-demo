import { Link } from 'react-router-dom'
import { Compass, ArrowLeft } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card padding="lg" className="max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-subtle text-ink-500 flex items-center justify-center mb-3">
          <Compass className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-ink-900">Page not found</h2>
        <p className="text-sm text-ink-500 mt-1">This route is not part of the prototype yet.</p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button as={Link} to="/clinic/dashboard" leftIcon={<ArrowLeft className="w-4 h-4" />} variant="secondary">
            Clinic Dashboard
          </Button>
          <Button as={Link} to="/admin/dashboard" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Admin Dashboard
          </Button>
        </div>
      </Card>
    </div>
  )
}
