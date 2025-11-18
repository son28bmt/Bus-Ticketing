import { create } from 'zustand';
import type { Trip } from '../types/trip';

type TripState = {
  trips: Trip[];
  setTrips: (trips: Trip[]) => void;
};

export const useTripStore = create<TripState>((set) => ({
  trips: [],
  setTrips: (trips) => set({ trips }),
}));

export default useTripStore;
