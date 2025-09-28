import { useState } from 'react';
import { User } from '../lib/models';

type Props = {
  user: User;
  onSubmit: (amount: number) => void;
  onClose: () => void;
};

export default function CashoutDialog({ user, onSubmit, onClose }: Props) {
  const balance = user.totalEarned - user.totalCashedOut;
  const [amount, setAmount] = useState(balance);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-sm space-y-4">
        <h3 className="text-lg font-semibold">Cash Out {user.name}</h3>
        <p className="text-sm text-slate-300">Balance: ${balance.toFixed(2)}</p>
        <input
          type="number"
          min={0}
          max={balance}
          value={amount}
          onChange={(e) => setAmount(Math.min(balance, Number(e.target.value)))}
          className="w-full bg-slate-900 rounded px-3 py-2"
        />
        <div className="flex gap-2 justify-end">
          <button className="px-3 py-2 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 rounded text-sm"
            onClick={() => {
              onSubmit(Math.max(0, Math.min(balance, Number(amount) || 0)));
              onClose();
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
