import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, PackageSearch, Edit, Trash2, Image as ImageIcon } from "lucide-react";
import Image from "next/image"; // Using next/image for optimized images
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  price: string;
  imageUrl?: string; // Optional image URL
}

const mockProducts: Product[] = [
  { id: "PROD001", name: "Artisanal Coffee Blend", sku: "COF-BLD-001", category: "Beverages", stock: 50, price: "$15.00", imageUrl: "https://placehold.co/80x80.png" },
  { id: "PROD002", name: "Organic Green Tea", sku: "TEA-GRN-003", category: "Beverages", stock: 120, price: "$10.50", imageUrl: "https://placehold.co/80x80.png" },
  { id: "PROD003", name: "Gourmet Chocolate Bar", sku: "CHC-BAR-007", category: "Snacks", stock: 75, price: "$5.00", imageUrl: "https://placehold.co/80x80.png" },
  { id: "PROD004", name: "Freshly Baked Croissants (Box of 6)", sku: "BAK-CRS-012", category: "Bakery", stock: 20, price: "$12.00", imageUrl: "https://placehold.co/80x80.png" },
  { id: "PROD005", name: "Spicy Mango Chutney", sku: "CND-CHT-005", category: "Condiments", stock: 0, price: "$7.75", imageUrl: "https://placehold.co/80x80.png" },
];

export default function InventoryPage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventory</h1>
          <p className="text-muted-foreground">Manage your product listings and stock levels.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Product Listings</CardTitle>
          <CardDescription>View and manage all available products.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="w-16 h-16 relative rounded-md overflow-hidden border bg-muted">
                    {product.imageUrl ? (
                        <Image 
                            src={product.imageUrl} 
                            alt={product.name} 
                            layout="fill" 
                            objectFit="cover"
                            data-ai-hint="product food"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="w-6 h-6" />
                        </div>
                    )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell className="text-right">{product.price}</TableCell>
                  <TableCell className="text-center">
                     {/* Inline stock update for quick changes - more complex logic in a modal/form */}
                    <Input type="number" defaultValue={product.stock} className="w-20 text-center mx-auto h-8" />
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.stock > 10 ? "default" : product.stock > 0 ? "outline" : "destructive"}>
                      {product.stock > 10 ? "In Stock" : product.stock > 0 ? "Low Stock" : "Out of Stock"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Edit Product</DropdownMenuItem>
                        <DropdownMenuItem><PackageSearch className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Add Pagination component here if needed */}
    </div>
  );
}
