export interface Product {
  id: string;
  name: string;
  description?: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  image?: string;
  category: 'simple' | 'pack';
  packItems?: PackItem[]; // Only if category is 'pack'
  totalSold: number;
  createdAt: number;
}

export interface PackItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  profit: number;
  date: number;
}

export interface Stats {
  revenue: number;
  profit: number;
  totalSold: number;
  stockValue: number;
}