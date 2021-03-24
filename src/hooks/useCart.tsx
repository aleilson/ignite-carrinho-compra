import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInTheCart = cart.find(product => product.id === productId);

      if(productInTheCart){
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

        if(productInTheCart.amount < stock.amount){
          productInTheCart.amount++;

          setCart([...cart]);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart]))
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      } else {
        const { data: product } = await api.get<Product>(`/products/${productId}`);
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

        if(stock.amount < 1){
          toast.error('Quantidade solicitada fora de estoque');
          return
        } else {
          product.amount = 1;
          setCart([...cart, product]);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, product]))
        }
      }
    } catch (error) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInTheCart = cart.find(product => product.id === productId);

      if(productInTheCart){
        const cartListAll = cart.filter(product => product.id !== productId);
        setCart(cartListAll);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartListAll));
      } else {
        throw new Error('Erro na remoção do produto');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1) throw new Error('Erro na alteração de quantidade do produto');

      const productInTheCart = cart.find(product => product.id === productId);

      if(!productInTheCart) throw new Error('Erro na alteração de quantidade do produto');
      
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if(amount > stock.amount) throw new Error('Quantidade solicitada fora de estoque');

      productInTheCart.amount = amount;
      const cartListAll = cart.map(product => product.id === productId ? productInTheCart : product);
      setCart(cartListAll);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartListAll));
      
    } catch(error) {
      toast.error(error.message)
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}