import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { format } from "date-fns"

// Sample data - will be replaced with real data from Supabase later
const sampleExpenses = [
  {
    id: "1",
    itemName: "Hot Wheels Premium - Nissan Skyline",
    category: "Hot Wheels",
    amount: 25.99,
    currency: "USD",
    purchaseDate: new Date("2024-01-15"),
    description: "2024 Premium series",
  },
  {
    id: "2",
    itemName: "Matchbox Collectors - Porsche 911",
    category: "Matchbox",
    amount: 18.50,
    currency: "USD",
    purchaseDate: new Date("2024-01-10"),
    description: "Collectors edition",
  },
  {
    id: "3",
    itemName: "Greenlight Models - Ford Mustang",
    category: "Greenlight",
    amount: 45.00,
    currency: "USD",
    purchaseDate: new Date("2024-01-05"),
    description: "1:64 scale",
  },
  {
    id: "4",
    itemName: "Hot Wheels RLC - Lamborghini",
    category: "Hot Wheels",
    amount: 35.00,
    currency: "USD",
    purchaseDate: new Date("2023-12-20"),
    description: "Red Line Club exclusive",
  },
  {
    id: "5",
    itemName: "Matchbox - Tesla Model 3",
    category: "Matchbox",
    amount: 12.99,
    currency: "USD",
    purchaseDate: new Date("2023-12-15"),
    description: "Basic series",
  },
]

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            View and manage your diecast collection expenses
          </p>
        </div>
        <Link href="/expenses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
          <CardDescription>
            Complete list of your diecast purchases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">
                    {expense.itemName}
                  </TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell>
                    {expense.currency} {expense.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {format(expense.purchaseDate, "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {expense.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

