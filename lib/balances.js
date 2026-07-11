// Shared balance engine for TeknonBook.
// Loans start at 0, go negative with expenses, accrue daily compound interest
// (annual% / 365) from their first transaction date up to today, and move
// toward 0 with repayments/transfers in.
// Operating accounts start at 0, cannot go below 0.

// Turn a date string / Date into a UTC midnight day number (days since epoch).
function dayNumber(dateInput) {
  const d = new Date(dateInput);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000);
}

function todayDayNumber() {
  const d = new Date();
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000);
}

// Compute the net effect of all transactions on a single account, per day,
// WITHOUT interest. Returns a Map of dayNumber -> net change on that day.
function dailyDeltas(accountId, transactions) {
  const deltas = new Map();
  for (const t of transactions) {
    const day = dayNumber(t.occurred_on);
    const amt = Number(t.amount);
    let change = 0;

    if (t.type === 'expense') {
      // Expense leaves the source account
      if (t.account_id === accountId) change -= amt;
    } else if (t.type === 'income') {
      // Income enters the destination account
      if (t.account_id === accountId) change += amt;
    } else if (t.type === 'customer_payment') {
      // Customer pays: money enters the receiving operating account
      if (t.account_id === accountId) change += amt;
    } else if (t.type === 'transfer' || t.type === 'repayment') {
      // Money leaves the "from" account, enters the "to" account
      if (t.account_id === accountId) change -= amt;
      if (t.to_account_id === accountId) change += amt;
    }
    // Note: credit_sale moves no cash — it only affects the customer's balance, not any account.

    if (change !== 0) {
      deltas.set(day, (deltas.get(day) || 0) + change);
    }
  }
  return deltas;
}

// Balance for an OPERATING account: no interest, simple running sum.
function operatingBalance(account, transactions) {
  const deltas = dailyDeltas(account.id, transactions);
  let balance = 0;
  for (const change of deltas.values()) balance += change;
  return balance;
}

// Balance for a LOAN account: walk day-by-day from the first transaction
// to today, applying transactions then compounding one day's interest on the
// end-of-day balance. Interest makes a negative (owed) balance more negative.
function loanBalance(account, transactions) {
  const deltas = dailyDeltas(account.id, transactions);
  if (deltas.size === 0) return 0;

  const firstDay = Math.min(...deltas.keys());
  const lastDay = todayDayNumber();
  const dailyRate = Number(account.interest_rate) / 100 / 365;

  let balance = 0;
  for (let day = firstDay; day <= lastDay; day++) {
    // Apply any transactions occurring on this day
    if (deltas.has(day)) balance += deltas.get(day);
    // Compound one day's interest on the end-of-day balance.
    // balance is negative (owed), so interest (rate * balance) is negative too,
    // increasing what is owed.
    balance += balance * dailyRate;
  }
  return balance;
}

// Public: balance for one account.
export function balanceForAccount(account, transactions) {
  if (account.type === 'loan') return loanBalance(account, transactions);
  return operatingBalance(account, transactions);
}

// Public: balances for many accounts -> Map of accountId -> balance.
export function balancesForAccounts(accounts, transactions) {
  const result = new Map();
  for (const acc of accounts) {
    result.set(acc.id, balanceForAccount(acc, transactions));
  }
  return result;
}

// Public: given a PROPOSED new transaction, would it push any operating
// account below zero? Returns { ok: true } or { ok: false, message }.
export function checkOverdraft(proposed, accounts, transactions, excludeId = null) {
  // Only money leaving an operating account can overdraw it.
  const affectedOperatingIds = [];
  const fromAcc = accounts.find((a) => a.id === proposed.account_id);
  if (fromAcc && fromAcc.type === 'operating') affectedOperatingIds.push(fromAcc.id);

  if (affectedOperatingIds.length === 0) return { ok: true };

  // When editing, drop the old version of this transaction before simulating.
  const base = excludeId ? transactions.filter((t) => t.id !== excludeId) : transactions;
  // Simulate: base transactions + the proposed one.
  const simulated = [...base, proposed];
  for (const accId of affectedOperatingIds) {
    const acc = accounts.find((a) => a.id === accId);
    const newBal = operatingBalance(acc, simulated);
    if (newBal < 0) {
      return {
        ok: false,
        message: `This would take "${acc.name}" below zero (to ${newBal.toFixed(2)}). Fund the account first.`,
      };
    }
  }
  return { ok: true };
}
// What a customer currently owes: sum of credit sales minus their payments.
// Positive = they owe you that amount. Zero = settled.
export function customerBalance(customerId, transactions) {
  let owed = 0;
  for (const t of transactions) {
    if (t.customer_id !== customerId) continue;
    if (t.type === 'credit_sale') owed += Number(t.amount);
    if (t.type === 'customer_payment') owed -= Number(t.amount);
  }
  return owed;
}

// Balances for many customers -> Map of customerId -> amount owed.
export function customerBalances(customers, transactions) {
  const result = new Map();
  for (const c of customers) {
    result.set(c.id, customerBalance(c.id, transactions));
  }
  return result;
}

// Total receivables across all customers (total money owed to you).
export function totalReceivables(customers, transactions) {
  let total = 0;
  for (const c of customers) total += customerBalance(c.id, transactions);
  return total;
}