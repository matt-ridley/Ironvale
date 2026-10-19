// The Oakhollow bank. Gold in the bank (char.bank) is safe: fainting only costs gold you're carrying.
// Functions change the character in place and return what happened.

/* Puts `amount` gold in the bank ("all" for everything you carry). Asking for more than you have puts in what you have. */
export function deposit(char, amount) {
  const n = Math.min(amount === "all" ? char.gold : amount, char.gold);
  if (n <= 0) return { ok: false, reason: "You don't have any gold to put in." };
  char.gold -= n;
  char.bank = (char.bank || 0) + n;
  return { ok: true, amount: n };
}

/* Takes `amount` gold out ("all" for everything in the bank). */
export function withdraw(char, amount) {
  const banked = char.bank || 0;
  const n = Math.min(amount === "all" ? banked : amount, banked);
  if (n <= 0) return { ok: false, reason: "There's no gold in your account." };
  char.bank = banked - n;
  char.gold += n;
  return { ok: true, amount: n };
}
