import { create } from "zustand";

export type CartItem = {
  id_produk: number;
  nama_produk: string;
  harga: number;
  diskon: number;
  qty: number;
  total: number;
  gambar?: string | null;
  kategori?: string;
};

type CartStore = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty" | "total">) => void;
  increaseQty: (id_produk: number) => void;
  decreaseQty: (id_produk: number) => void;
  removeItem: (id_produk: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalQty: () => number;
  totalAmount: () => number;
};

const calculateTotal = (harga: number, diskon: number, qty: number) => {
  const hargaSetelahDiskon = harga - Math.floor((harga * diskon) / 100);
  return hargaSetelahDiskon * qty;
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((x) => x.id_produk === item.id_produk);

      if (existing) {
        return {
          items: state.items.map((x) =>
            x.id_produk === item.id_produk
              ? {
                  ...x,
                  qty: x.qty + 1,
                  total: calculateTotal(x.harga, x.diskon, x.qty + 1),
                }
              : x
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            ...item,
            qty: 1,
            total: calculateTotal(item.harga, item.diskon, 1),
          },
        ],
      };
    }),

  increaseQty: (id_produk) =>
    set((state) => ({
      items: state.items.map((x) =>
        x.id_produk === id_produk
          ? {
              ...x,
              qty: x.qty + 1,
              total: calculateTotal(x.harga, x.diskon, x.qty + 1),
            }
          : x
      ),
    })),

  decreaseQty: (id_produk) =>
    set((state) => ({
      items: state.items
        .map((x) =>
          x.id_produk === id_produk
            ? {
                ...x,
                qty: x.qty - 1,
                total: calculateTotal(x.harga, x.diskon, x.qty - 1),
              }
            : x
        )
        .filter((x) => x.qty > 0),
    })),

  removeItem: (id_produk) =>
    set((state) => ({
      items: state.items.filter((x) => x.id_produk !== id_produk),
    })),

  clearCart: () => set({ items: [] }),

  totalItems: () => get().items.length,

  totalQty: () =>
    get().items.reduce((sum, item) => sum + Number(item.qty || 0), 0),

  totalAmount: () =>
    get().items.reduce((sum, item) => sum + Number(item.total || 0), 0),
}));