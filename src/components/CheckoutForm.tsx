"use client";

import { useActionState, useState } from "react";
import { completeCheckout } from "@/app/actions/orders";
import {
  luhn,
  formatCardNumber,
  formatExpiry,
  isExpiryValid,
} from "@/lib/card-validation";

const inputClasses =
  "w-full rounded-lg border border-forest/20 bg-white/60 px-3 py-2 text-forest focus:border-teal focus:outline-none";
const errorClasses = "border-red-400 focus:border-red-400";

export default function CheckoutForm({ total }: { total: number }) {
  const [state, formAction, pending] = useActionState(completeCheckout, undefined);

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const [touched, setTouched] = useState({
    cardNumber: false,
    expiry: false,
    cvv: false,
  });

  const cardValid = luhn(cardNumber);
  const expiryValid = isExpiryValid(expiry);
  const cvvValid = /^\d{3,4}$/.test(cvv);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    setTouched({ cardNumber: true, expiry: true, cvv: true });
    if (!cardValid) {
      e.preventDefault();
      setClientError("Please enter a valid card number.");
      return;
    }
    if (!expiryValid) {
      e.preventDefault();
      setClientError("Please enter a valid expiry date.");
      return;
    }
    if (!cvvValid) {
      e.preventDefault();
      setClientError("Please enter a valid CVV.");
      return;
    }
    setClientError(null);
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-xl border border-forest/10 bg-white/60 p-5">
        <h2 className="font-serif text-lg font-semibold text-forest">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Full name</label>
            <input name="name" required className={inputClasses} placeholder="Jane Smith" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Phone</label>
            <input
              name="phone"
              required
              type="tel"
              pattern="[\d\s\+\-\(\)]{7,15}"
              className={inputClasses}
              placeholder="+1 555 000 0000"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Address</label>
          <input name="address" required className={inputClasses} placeholder="123 Main St, City, Country" />
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-forest/10 bg-white/60 p-5">
        <h2 className="font-serif text-lg font-semibold text-forest">Payment</h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Card number</label>
          <input
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            onBlur={() => setTouched((t) => ({ ...t, cardNumber: true }))}
            inputMode="numeric"
            placeholder="4242 4242 4242 4242"
            className={`${inputClasses} ${touched.cardNumber && !cardValid ? errorClasses : ""}`}
          />
          {touched.cardNumber && !cardValid && (
            <p className="text-xs text-red-500">Invalid card number</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Expiry</label>
            <input
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              onBlur={() => setTouched((t) => ({ ...t, expiry: true }))}
              placeholder="MM/YY"
              inputMode="numeric"
              className={`${inputClasses} ${touched.expiry && !expiryValid ? errorClasses : ""}`}
            />
            {touched.expiry && !expiryValid && (
              <p className="text-xs text-red-500">Invalid expiry</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">CVV</label>
            <input
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onBlur={() => setTouched((t) => ({ ...t, cvv: true }))}
              placeholder="123"
              inputMode="numeric"
              className={`${inputClasses} ${touched.cvv && !cvvValid ? errorClasses : ""}`}
            />
            {touched.cvv && !cvvValid && (
              <p className="text-xs text-red-500">Invalid CVV</p>
            )}
          </div>
        </div>
      </section>

      {(clientError || state?.error) && (
        <p className="text-sm text-red-600">{clientError ?? state?.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-forest px-5 py-3 font-medium text-cream hover:bg-forest/90 disabled:opacity-50"
      >
        {pending ? "Processing..." : `Pay $${total.toFixed(2)}`}
      </button>
    </form>
  );
}
