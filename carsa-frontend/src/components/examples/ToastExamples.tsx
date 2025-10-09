import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toastStyles, toastVariants } from "@/lib/toast-styles"

/**
 * Example component showing how to use the toast-inspired design system
 */
export function ToastExamples() {
  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold">Toast Design System Examples</h2>
      
      {/* Using Card with surface variant */}
      <Card variant={toastVariants.card.surface} className="p-6">
        <h3 className="text-xl font-semibold mb-4">Surface Card</h3>
        <p className="text-white/80 mb-4">
          This is a card using the surface variant with the toast-inspired styling.
        </p>
        
        {/* Using Button components */}
        <div className="flex gap-3">
          <Button variant={toastVariants.button.primary}>
            Primary Action
          </Button>
          <Button variant={toastVariants.button.ghost}>
            Secondary Action
          </Button>
        </div>
      </Card>

      {/* Using direct classes from toastStyles */}
      <div className={toastStyles.surface + " p-6"}>
        <h3 className="text-xl font-semibold mb-4">Direct Class Usage</h3>
        
        {/* Badge pill */}
        <div className={toastStyles.badgePill + " mb-4"}>
          <span className={toastStyles.iconCircle}>✓</span>
          Status Badge
        </div>
        
        {/* Status pill */}
        <div className={toastStyles.statusPill}>
          <span className={toastStyles.iconCircle}>⚡</span>
          <span className="text-white text-sm">Processing...</span>
          <button className={toastStyles.miniBtn}>
            Cancel
          </button>
        </div>
      </div>

      {/* Regular card for comparison */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Regular Card</h3>
        <p className="text-muted-foreground mb-4">
          This is a regular card for comparison with the default styling.
        </p>
        <div className="flex gap-3">
          <Button>Default Button</Button>
          <Button variant="outline">Outline Button</Button>
        </div>
      </Card>
    </div>
  )
}
