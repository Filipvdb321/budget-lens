import { YnabConnection } from "common-ts";
import { apiFetch, apiPut, apiGet } from "../client";
import { UserView } from "common-ts";
import { cache } from "react";
import { get } from "http";

export const connectUserWithYnab = async (data: YnabConnection) => {
  console.log(`connecting user with ynab in client: ${JSON.stringify(data)}`);
  await apiPut("users/connect-ynab", data);
};

export const createOrUpdateUser = async ({
  authId,
  name,
  accessToken,
}: {
  authId: string;
  name: string;
  accessToken?: string;
}) => {
  console.log(
    "createOrUpdateUser with id:" + authId + " and name:" + name + ", token?"
  );
  return await apiPut("users", { authId, name }, accessToken);
};

const getLoggedInUserInternal = async (): Promise<UserView> => {
  return await apiGet("users/logged-in");
};

const getLoggedInUser = cache(getLoggedInUserInternal);

export const getLoggedInUserPreferredBudgetId = async (): Promise<string> => {
  const user = await getLoggedInUser();
  return user.settings.preferredBudgetUuid;
};

export const isYnabTokenExpired = async (): Promise<boolean> => {
  const user = await getLoggedInUser();
  return !user.ynab.isConnected || user.ynab.isTokenExpired;
};

export const savePreferredBudget = async (budgetUuid: string) => {
  console.log(`saving preferred budget ${budgetUuid}`);
  return await apiPut("users/preferred-budget", { budgetUuid });
};
