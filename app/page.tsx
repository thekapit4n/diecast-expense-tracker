import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Package, TrendingUp, Calendar } from "lucide-react"

export default function DashboardPage() {
  // Sample data - will be replaced with real data from Supabase later
  const stats = [
    {
      title: "Total Spent",
      value: "$2,450.00",
      description: "All time expenses",
      icon: DollarSign,
      trend: "+12.5%",
    },
    {
      title: "Total Items",
      value: "24",
      description: "Diecast models purchased",
      icon: Package,
      trend: "+3 this month",
    },
    {
      title: "Average Price",
      value: "$102.08",
      description: "Per item",
      icon: TrendingUp,
      trend: "+5.2%",
    },
    {
      title: "This Month",
      value: "$450.00",
      description: "Current month spending",
      icon: Calendar,
      trend: "2 items",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your diecast collection expenses
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchases</CardTitle>
            <CardDescription>
              Your latest diecast acquisitions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Hot Wheels Premium</p>
                  <p className="text-xs text-muted-foreground">2 days ago</p>
                </div>
                <p className="text-sm font-semibold">$25.99</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Matchbox Collectors</p>
                  <p className="text-xs text-muted-foreground">1 week ago</p>
                </div>
                <p className="text-sm font-semibold">$18.50</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Greenlight Models</p>
                  <p className="text-xs text-muted-foreground">2 weeks ago</p>
                </div>
                <p className="text-sm font-semibold">$45.00</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
            <CardDescription>
              Spending by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Hot Wheels</p>
                  <div className="w-32 bg-secondary rounded-full h-2 mt-1">
                    <div className="bg-primary h-2 rounded-full" style={{ width: "65%" }}></div>
                  </div>
                </div>
                <p className="text-sm font-semibold">$1,592.50</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Matchbox</p>
                  <div className="w-32 bg-secondary rounded-full h-2 mt-1">
                    <div className="bg-primary h-2 rounded-full" style={{ width: "25%" }}></div>
                  </div>
                </div>
                <p className="text-sm font-semibold">$612.50</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Greenlight</p>
                  <div className="w-32 bg-secondary rounded-full h-2 mt-1">
                    <div className="bg-primary h-2 rounded-full" style={{ width: "10%" }}></div>
                  </div>
                </div>
                <p className="text-sm font-semibold">$245.00</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
