import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Configure your general application preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default-currency">Default Currency</Label>
              <Select defaultValue="USD">
                <SelectTrigger id="default-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="MYR">MYR (RM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-format">Date Format</Label>
              <Select defaultValue="mm-dd-yyyy">
                <SelectTrigger id="date-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Manage your expense data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Export Data</Label>
              <p className="text-sm text-muted-foreground">
                Download your expense data as CSV or JSON
              </p>
              <div className="flex gap-2">
                <Button variant="outline">Export as CSV</Button>
                <Button variant="outline">Export as JSON</Button>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label>Import Data</Label>
              <p className="text-sm text-muted-foreground">
                Import expenses from a CSV file
              </p>
              <Button variant="outline">Choose File</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>
              Information about this application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Version</Label>
              <p className="text-sm text-muted-foreground">1.0.0</p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <p className="text-sm text-muted-foreground">
                Diecast Expense Tracker - Admin portal for tracking your diecast collection expenses
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

