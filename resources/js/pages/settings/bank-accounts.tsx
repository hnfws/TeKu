import { useForm, usePage } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ManagementLayout from '@/layouts/management-layout';
import SettingsLayout from '@/layouts/settings/layout';

interface BankAccount {
    id: number;
    account_holder: string;
    account_number: string;
    bank_name: string;
}

interface BankAccountsProps {
    bankAccounts: BankAccount[];
    banks: string[];
    errors: Record<string, string>;
    flash?: { success?: string };
}

export default function BankAccounts({ bankAccounts, banks }: BankAccountsProps) {
    const { props } = usePage<BankAccountsProps>();
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);
    const form = useForm({
        account_holder: '',
        account_number: '',
        bank_name: '',
        branch_name: '',
        city: '',
    });
    const deleteForm = useForm({});

    const addAccount: FormEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        form.post('/settings/bank-accounts', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setAddDialogOpen(false);
            },
        });
    };

    const deleteAccount = () => {
        if (!accountToDelete) return;

        deleteForm.delete(`/settings/bank-accounts/${accountToDelete.id}`, {
            preserveScroll: true,
            onSuccess: () => setAccountToDelete(null),
        });
    };

    return (
        <ManagementLayout title="Pengaturan">
            <SettingsLayout>
                <div className="space-y-5">
                    <div>
                        <h2 className="text-xl font-semibold text-stone-900">Rekening &amp; Pembayaran</h2>
                        <p className="mt-1 text-sm text-stone-500">Kelola rekening bank yang terdaftar pada akun Anda.</p>
                    </div>

                    {props.flash?.success && (
                        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
                            {props.flash.success}
                        </p>
                    )}
                    <InputError message={props.errors.bank_account} />

                    <div>
                        <h3 className="mb-3 text-sm font-medium text-stone-900">Rekening Terdaftar</h3>
                        <div className="overflow-hidden rounded-md border border-stone-300">
                            {bankAccounts.length > 0 ? (
                                <ul className="divide-y divide-stone-300">
                                    {bankAccounts.map((account) => (
                                        <li className="flex items-center justify-between gap-4 px-4 py-3" key={account.id}>
                                            <div className="min-w-0 text-sm font-semibold text-stone-800">
                                                <p className="truncate">{account.account_holder}</p>
                                                <p>{account.bank_name}</p>
                                                <p className="break-all">{account.account_number}</p>
                                            </div>
                                            <Button
                                                aria-label={`Hapus rekening ${account.bank_name} atas nama ${account.account_holder}`}
                                                className="shrink-0 text-stone-800 hover:bg-red-50 hover:text-red-700"
                                                onClick={() => setAccountToDelete(account)}
                                                size="icon"
                                                type="button"
                                                variant="ghost"
                                            >
                                                <Trash2 aria-hidden="true" />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="px-4 py-5 text-sm text-stone-500">Belum ada rekening bank terdaftar.</p>
                            )}
                            <Button
                                className="w-full rounded-none bg-[#688463] text-white hover:bg-[#55714f]"
                                onClick={() => setAddDialogOpen(true)}
                                type="button"
                            >
                                Tambah Rekening
                            </Button>
                        </div>
                    </div>
                </div>

                <Dialog
                    open={addDialogOpen}
                    onOpenChange={(open) => {
                        if (!form.processing) setAddDialogOpen(open);
                        if (!open) form.clearErrors();
                    }}
                >
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Tambah Rekening</DialogTitle>
                            <DialogDescription>Masukkan detail rekening bank yang ingin didaftarkan.</DialogDescription>
                        </DialogHeader>
                        <form className="space-y-4" onSubmit={addAccount}>
                            <div className="grid gap-2">
                                <Label htmlFor="account-holder">Nama Pemilik Rekening</Label>
                                <Input
                                    autoComplete="name"
                                    id="account-holder"
                                    maxLength={255}
                                    onChange={(event) => form.setData('account_holder', event.target.value)}
                                    required
                                    value={form.data.account_holder}
                                />
                                <InputError message={form.errors.account_holder} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="account-number">Nomor Rekening</Label>
                                <Input
                                    autoComplete="off"
                                    id="account-number"
                                    inputMode="numeric"
                                    maxLength={34}
                                    onChange={(event) => form.setData('account_number', event.target.value)}
                                    pattern="[0-9 -]{5,34}"
                                    required
                                    value={form.data.account_number}
                                />
                                <p className="text-xs text-stone-500">Nomor rekening disimpan dalam bentuk terenkripsi.</p>
                                <InputError message={form.errors.account_number} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="bank-name">Nama Bank</Label>
                                <select
                                    className="focus-visible:ring-ring h-10 rounded-md border border-stone-300 bg-white px-3 text-sm focus-visible:ring-2 focus-visible:outline-hidden"
                                    id="bank-name"
                                    onChange={(event) => form.setData('bank_name', event.target.value)}
                                    required
                                    value={form.data.bank_name}
                                >
                                    <option value="">Pilih bank</option>
                                    {banks.map((bank) => (
                                        <option key={bank} value={bank}>
                                            {bank}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={form.errors.bank_name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="branch-name">Nama Cabang (opsional)</Label>
                                <Input
                                    id="branch-name"
                                    maxLength={150}
                                    onChange={(event) => form.setData('branch_name', event.target.value)}
                                    value={form.data.branch_name}
                                />
                                <InputError message={form.errors.branch_name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="account-city">Kota (opsional)</Label>
                                <Input
                                    id="account-city"
                                    maxLength={100}
                                    onChange={(event) => form.setData('city', event.target.value)}
                                    value={form.data.city}
                                />
                                <InputError message={form.errors.city} />
                            </div>
                            <DialogFooter>
                                <Button className="bg-[#688463] text-white hover:bg-[#55714f]" disabled={form.processing} type="submit">
                                    {form.processing ? 'Menyimpan...' : 'Simpan Rekening'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={accountToDelete !== null}
                    onOpenChange={(open) => {
                        if (!deleteForm.processing && !open) setAccountToDelete(null);
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Hapus rekening?</DialogTitle>
                            <DialogDescription>
                                Rekening {accountToDelete?.bank_name} atas nama {accountToDelete?.account_holder} akan dihapus dari akun Anda.
                            </DialogDescription>
                        </DialogHeader>
                        <InputError message={props.errors.bank_account} />
                        <DialogFooter>
                            <Button disabled={deleteForm.processing} onClick={() => setAccountToDelete(null)} type="button" variant="outline">
                                Batal
                            </Button>
                            <Button
                                className="bg-red-600 text-white hover:bg-red-700"
                                disabled={deleteForm.processing}
                                onClick={deleteAccount}
                                type="button"
                            >
                                {deleteForm.processing ? 'Menghapus...' : 'Hapus Rekening'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SettingsLayout>
        </ManagementLayout>
    );
}
