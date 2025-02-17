export interface CartLocation {
  name: string;
  linkMap: string;
}

export interface CartData {
  assignment: string;
  location: CartLocation;
  date: string;
  schedule: string;
  color: string;
}

export interface CartDataArray {
  cart: CartData[];
}

