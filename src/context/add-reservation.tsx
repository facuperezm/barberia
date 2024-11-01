"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type NewReservationType,
  newReservationInitialValuesSchema,
  type NewReservationInitialValuesType,
} from "@/context/schemas";

const defaultReservation: NewReservationInitialValuesType = {
  barber: "",
  date: "",
  time: "",
  service: "",
  email: "",
  phone: "",
};

const LOCAL_STORAGE_KEY = "barbershop-reservation";

type AddReservationContextType = {
  newReservationData: NewReservationInitialValuesType;
  updateNewReservationDetails: (
    reservationDetails: Partial<NewReservationType>,
  ) => void;
  dataLoaded: boolean;
  resetLocalStorage: () => void;
};

export const AddReservationContext =
  createContext<AddReservationContextType | null>(null);

export const AddReservationContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [newReservationData, setNewReservationData] =
    useState<NewReservationInitialValuesType>(defaultReservation);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    readFromLocalStorage();
    setDataLoaded(true);
  }, []);

  useEffect(() => {
    if (dataLoaded) {
      saveDataToLocalStorage(newReservationData);
    }
  }, [newReservationData, dataLoaded]);

  const updateNewReservationDetails = useCallback(
    (reservationDetails: Partial<NewReservationType>) => {
      setNewReservationData({ ...newReservationData, ...reservationDetails });
    },
    [newReservationData],
  );

  const saveDataToLocalStorage = (
    currentReservationData: NewReservationInitialValuesType,
  ) => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(currentReservationData),
    );
  };

  const readFromLocalStorage = () => {
    const loadedDataString = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!loadedDataString) return setNewReservationData(defaultReservation);
    const validated = newReservationInitialValuesSchema.safeParse(
      JSON.parse(loadedDataString),
    );

    if (validated.success) {
      setNewReservationData(validated.data);
    } else {
      setNewReservationData(defaultReservation);
    }
  };

  const resetLocalStorage = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setNewReservationData(defaultReservation);
  };

  const contextValue = useMemo(
    () => ({
      newReservationData,
      dataLoaded,
      updateNewReservationDetails,
      resetLocalStorage,
    }),
    [newReservationData, dataLoaded, updateNewReservationDetails],
  );

  return (
    <AddReservationContext value={contextValue}>
      {children}
    </AddReservationContext>
  );
};

export function useAddReservationContext() {
  const context = useContext(AddReservationContext);
  if (context === null) {
    throw new Error(
      "useAddReservationContext must be used within a AddReservationContextProvider",
    );
  }
  return context;
}
