import { Transaction } from "../transaction/transaction.utils";

export type Category = {
  _id?: string;
  name: string;
  uuid: string;
  balance: number;
  budgeted: number;
  activity: number;
  targetAmount: number;
  budgetId: string;
};

export const emptyCategory: Category = {
  _id: "",
  name: "",
  uuid: "",
  balance: 0,
  budgeted: 0,
  activity: 0,
  targetAmount: 0,
  budgetId: "",
};

export type CategoryUsage = {
  name: string;
  uuid: string | undefined | null;
  amount: number;
  transactions: Array<Transaction>;
};

export const isInflowCategory = (category: Category) => {
  return category.name.startsWith("Inflow");
};

export const categorySorter = (a: Category, b: Category): number =>
  a.name.localeCompare(b.name);

export const withoutInflowCategoryFilter = (category: Category) =>
  !isInflowCategory(category);