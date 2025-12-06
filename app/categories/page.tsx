import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

// Sample categories - will be replaced with real data from Supabase later
const categories = [
  {
    id: "1",
    name: "Hot Wheels",
    itemCount: 12,
    totalSpent: 1592.50,
    color: "#E63946",
  },
  {
    id: "2",
    name: "Matchbox",
    itemCount: 8,
    totalSpent: 612.50,
    color: "#457B9D",
  },
  {
    id: "3",
    name: "Greenlight",
    itemCount: 3,
    totalSpent: 245.00,
    color: "#2A9D8F",
  },
  {
    id: "4",
    name: "Auto World",
    itemCount: 1,
    totalSpent: 0.00,
    color: "#F77F00",
  },
]

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Manage your diecast collection categories
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{category.name}</CardTitle>
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
              </div>
              <CardDescription>
                {category.itemCount} {category.itemCount === 1 ? "item" : "items"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Spent</span>
                  <span className="text-lg font-semibold">
                    ${category.totalSpent.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average</span>
                  <span className="text-sm">
                    ${category.itemCount > 0 
                      ? (category.totalSpent / category.itemCount).toFixed(2)
                      : "0.00"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Statistics</CardTitle>
          <CardDescription>
            Overview of your collection by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map((category) => {
              const totalItems = categories.reduce((sum, cat) => sum + cat.itemCount, 0)
              const percentage = totalItems > 0 
                ? (category.itemCount / totalItems) * 100 
                : 0

              return (
                <div key={category.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-muted-foreground">
                      {category.itemCount} items ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

