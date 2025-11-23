import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { Product, Sale } from '../types';

// Collection References
const productsRef = collection(db, 'products');
const salesRef = collection(db, 'sales');

// --- Products ---

export const getProducts = async (): Promise<Product[]> => {
  try {
    const q = query(productsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  } catch (error) {
    console.error("Error getting products:", error);
    return [];
  }
};

export const addProductToDb = async (product: Omit<Product, 'id'>): Promise<Product | null> => {
  try {
    const docRef = await addDoc(productsRef, {
      ...product,
      createdAt: Date.now() // Using client timestamp for simpler sorting in UI, or use serverTimestamp()
    });
    return { id: docRef.id, ...product } as Product;
  } catch (error) {
    console.error("Error adding product:", error);
    throw error;
  }
};

export const updateProductInDb = async (id: string, updates: Partial<Product>) => {
  try {
    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, updates);
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
};

export const deleteProductFromDb = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

export const updateProductStock = async (id: string, newStock: number, totalSold: number) => {
    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, {
        stock: newStock,
        totalSold: totalSold
    });
};

// --- Sales ---

export const getSales = async (): Promise<Sale[]> => {
  try {
    const q = query(salesRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
  } catch (error) {
    console.error("Error getting sales:", error);
    return [];
  }
};

export const addSaleToDb = async (sale: Omit<Sale, 'id'>, currentStock: number) => {
  try {
    // 1. Add the sale record
    const saleRef = await addDoc(salesRef, {
        ...sale,
        date: Date.now()
    });

    // 2. Update the product stock (Decrement)
    const productRef = doc(db, 'products', sale.productId);
    await updateDoc(productRef, {
        stock: currentStock - sale.quantity,
        totalSold: increment(sale.quantity)
    });

    return { id: saleRef.id, ...sale };
  } catch (error) {
    console.error("Error processing sale:", error);
    throw error;
  }
};