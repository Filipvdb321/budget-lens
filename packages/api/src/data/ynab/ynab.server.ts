import { T, update } from "ramda";
import * as ynab from "ynab";
import {
  findBudgets,
  getBudgetWithoutUserCheck,
  saveNewBudget,
  updateBudget,
} from "../budget/budget.server";
import { UserType, clearYnabConnection } from "../user/user.server";
import * as ynabApi from "./ynab-api"; // Import the missing ynapApi module
import {
  deleteCategory,
  findCategories,
  getCategory,
  saveNewCategory,
  updateCategory,
} from "../category/category.server";
import { Budget, Category } from "common-ts";
import YnabBudget from "./ynab.schema";
import { updateTransactionsSpendingPattern } from "../forecasting/es-forcasting.server";
import { extractYearsFromTransactions } from "./transaction.util";
import { NewOrUpdatedTransaction } from "../transaction/transaction.server";
import * as transactionServer from "../transaction/transaction.server";

type ServerKnowledge = {
  transactions: number;
  categories: number;
};

export const emptyServerKnowledge: ServerKnowledge = {
  transactions: 0,
  categories: 0,
};

type YnabBudgetType = {
  serverKnowledge: ServerKnowledge;
};

const insertOrUpdateMissingTransaction = async (
  ynabTransaction: ynab.TransactionDetail,
  categories: Category[],
  budgetId: string
) => {
  const categoryId = categories.find(
    (category) => category.uuid === ynabTransaction.category_id
  )?._id;
  const newData: NewOrUpdatedTransaction = {
    accountName: ynabTransaction.account_name,
    amount: ynabTransaction.amount,
    date: ynabTransaction.date,
    categoryId,
    payeeName: ynabTransaction.payee_name,
    memo: ynabTransaction.memo,
  };
  await transactionServer.insertOrUpdateMissingTransaction(
    ynabTransaction.id,
    ynabTransaction.deleted,
    budgetId,
    newData
  );
};

const transactionToInsertOrUpdatePromise =
  (budgetId: string, categories: Category[]) =>
  (transaction: ynab.TransactionDetail) =>
    insertOrUpdateMissingTransaction(transaction, categories, budgetId);

const insertOrUpdateMissingTransactions = async (
  budgetId: string,
  transactions: ynab.TransactionDetail[]
) => {
  try {
    console.log(
      `insert or update ${transactions.length} number of transactions`
    );
    const categories = await findCategories(budgetId);
    const promiseMapper = transactionToInsertOrUpdatePromise(
      budgetId,
      categories
    );
    await Promise.all(transactions.map(promiseMapper));
    if (transactions.length > 0) {
      const years = extractYearsFromTransactions(transactions);
      await Promise.all(
        years.map((year) => updateTransactionsSpendingPattern(budgetId, year))
      );
    }
  } catch (exception) {
    console.error(
      `Error while inserting or updating transactions: ${exception}`
    );
    throw new Error("Error while inserting or updating transactions");
  }
};

const updateUserServerKnowledge = async ({
  user,
  budget,
  type,
  knowledge,
}: {
  user: UserType;
  budget: Budget;
  type: "transactions" | "categories";
  knowledge: number;
}) => {
  console.log("updateUserServerKnowledge:", budget.name, type, knowledge);
  const ynabBudget = await YnabBudget.findOne({
    budgetId: budget._id,
    userId: user._id,
  });
  if (!ynabBudget) {
    const newYnabBudget = new YnabBudget({
      userId: user._id,
      budgetId: budget._id,
      serverKnowledge: {
        [type]: knowledge,
      },
    });
    await newYnabBudget.save();
    return;
  }
  const newServerKnowledge = {
    ...ynabBudget.serverKnowledge,
    [type]: knowledge,
  };
  await YnabBudget.updateOne(
    { _id: ynabBudget._id },
    { serverKnowledge: newServerKnowledge }
  ).exec();
};

const findYnabBudget = async (
  user: UserType,
  budget: Budget
): Promise<YnabBudgetType> => {
  const budgetData = await YnabBudget.findOne({
    budgetId: budget._id,
    userId: user._id,
  });
  return !budgetData
    ? { serverKnowledge: emptyServerKnowledge }
    : {
        serverKnowledge: {
          transactions: budgetData.serverKnowledge.transactions || 0,
          categories: budgetData.serverKnowledge.categories || 0,
        },
      };
};

const syncTransactions = async (user: UserType, budget: Budget) => {
  const ynabBudget = await findYnabBudget(user, budget);
  const ynabTransactions = await ynabApi.getTransactions(
    budget.uuid,
    ynabBudget.serverKnowledge.transactions,
    user
  );
  await insertOrUpdateMissingTransactions(
    budget._id || "",
    ynabTransactions.transactions
  );
  await updateUserServerKnowledge({
    user,
    budget,
    type: "transactions",
    knowledge: ynabTransactions.server_knowledge,
  });
};

const syncYnabBudget = async (
  user: UserType,
  ynabBudget: ynab.BudgetDetail
) => {
  console.log(
    `syncing budget with id: ${ynabBudget.id} and name: ${ynabBudget.name}`
  );
  const localBudget = await getBudgetWithoutUserCheck(ynabBudget.id);
  if (!localBudget) {
    await saveNewBudget(
      {
        uuid: ynabBudget.id,
        name: ynabBudget.name,
      },
      user
    );
  } else {
    await updateBudget(ynabBudget.id, ynabBudget.name, user);
  }
};

const syncBudgets = async (user: UserType) => {
  const ynabBudgets = await ynabApi.getBudgets(user);
  const promises = ynabBudgets.map((ynabBudget) =>
    syncYnabBudget(user, ynabBudget)
  );
  await Promise.all(promises);
};

const syncYnabCategory = async (
  ynabCategory: ynab.Category,
  budget: Budget
) => {
  if (ynabCategory.deleted) {
    await deleteCategory(ynabCategory.id);
    return;
  }
  const localCategory = await getCategory(ynabCategory.id);
  if (!localCategory) {
    await saveNewCategory(mapCategory(ynabCategory, budget));
  } else {
    await updateCategory(mapCategory(ynabCategory, budget, localCategory._id));
  }
};
const syncYnabCategories = async (user: UserType, budget: Budget) => {
  const ynabBudget = await findYnabBudget(user, budget);
  const ynabCategoriesData = await ynabApi.getCategories(
    budget.uuid,
    ynabBudget.serverKnowledge.categories,
    user
  );
  const promises = ynabCategoriesData.categories.map((ynabCategory) =>
    syncYnabCategory(ynabCategory, budget)
  );
  await Promise.all(promises);
  // for now set knowledge to 0 to have the latest categories all the time (keeps
  // we noticed otherwise that properties as activity, balance are not updated correctly)
  await updateUserServerKnowledge({
    user,
    budget,
    type: "categories",
    knowledge: 0,
  });
};

const syncCategories = async (user: UserType) => {
  const budgets = await findBudgets(user);
  console.log(`syncing categories for ${budgets.length} budgets`);
  const promises = budgets.map((budget) => syncYnabCategories(user, budget));
  await Promise.all(promises);
};

const mapCategory = (
  ynabCategory: ynab.Category,
  budget: Budget,
  _id?: string
) => ({
  uuid: ynabCategory.id,
  name: ynabCategory.name,
  budgetId: budget._id || "",
  balance: ynabCategory.balance,
  targetAmount: ynabCategory.goal_target || 0,
  budgeted: ynabCategory.budgeted,
  activity: ynabCategory.activity,
  historicalAverage: 0,
  typicalSpendingPattern: 0,
  _id,
});

const toTransactionsSyncPromise = (user: UserType) => (budget: Budget) =>
  syncTransactions(user, budget);

const syncAllTransactions = async (user: UserType) => {
  console.log("syncing all transactions for user:" + user.authId);
  const localBudgets = await findBudgets(user);
  const promises = localBudgets.map(toTransactionsSyncPromise(user));
  await Promise.all(promises);
};

export const syncYnabUser = async (user: UserType) => {
  console.log(`syncing Ynab data for user with id: ${user.authId}`);
  try {
    await ynabApi.refreshUserToken(user);
  } catch (e) {
    await clearYnabConnection(user);
  }
  await syncBudgets(user);
  await syncCategories(user);
  await syncAllTransactions(user);
};
