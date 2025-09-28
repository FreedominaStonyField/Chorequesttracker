import { useState } from 'react';
import { User } from '../lib/models';
import CashoutDialog from './CashoutDialog';

type Props = {
  users: User[];
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onCashout: (id: string, amount: number) => void;
};

export default function UsersPanel({ users, onAdd, onRename, onDelete, onCashout }: Props) {
  const [name, setName] = useState('');
  const [activeUser, setActiveUser] = useState<User | null>(null);

  const submit = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName('');
  };

  return (
    <section className="bg-slate-800/60 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Users</h2>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New user name"
            className="bg-slate-900 rounded px-3 py-2 text-sm"
          />
          <button className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 rounded text-sm" onClick={submit}>
            Add User
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-300 text-xs uppercase">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-right p-2">Earned</th>
              <th className="text-right p-2">Cashed Out</th>
              <th className="text-right p-2">Balance</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td className="p-3 text-center text-slate-400" colSpan={5}>
                  No users yet.
                </td>
              </tr>
            )}
            {users.map((user) => {
              const balance = user.totalEarned - user.totalCashedOut;
              return (
                <tr key={user.id} className="odd:bg-slate-900/30">
                  <td className="p-2">
                    <input
                      value={user.name}
                      onChange={(e) => onRename(user.id, e.target.value)}
                      className="bg-transparent border border-slate-700 rounded px-2 py-1 w-full"
                    />
                  </td>
                  <td className="p-2 text-right">${user.totalEarned.toFixed(2)}</td>
                  <td className="p-2 text-right">${user.totalCashedOut.toFixed(2)}</td>
                  <td className={`p-2 text-right ${balance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    ${balance.toFixed(2)}
                  </td>
                  <td className="p-2 flex gap-2 justify-center">
                    <button className="text-xs px-2 py-1 bg-sky-500 rounded" onClick={() => setActiveUser(user)}>
                      Cash Out
                    </button>
                    <button className="text-xs px-2 py-1 bg-rose-500 rounded" onClick={() => onDelete(user.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {activeUser && (
        <CashoutDialog
          user={activeUser}
          onClose={() => setActiveUser(null)}
          onSubmit={(amount) => onCashout(activeUser.id, amount)}
        />
      )}
    </section>
  );
}
