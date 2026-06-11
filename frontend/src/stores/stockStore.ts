'use client'

import { create } from 'zustand'

interface StockState {
  selectedSymbol: string | null
  setSelectedSymbol: (_: string | null) => void
}

export const useStockStore = create<StockState>((set) => ({
  selectedSymbol: null,
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
}))
