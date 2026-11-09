import { useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ManagementLayout from '@/layouts/management-layout';
import SettingsLayout from '@/layouts/settings/layout';

export default function Password() {
    const { auth } = usePage<{ auth: { user: { email: string; phone?: string | null } } }>().props;
    const [passwordFormOpen, setPasswordFormOpen] = useState(false);
    const [emailFormOpen, setEmailFormOpen] = useState(false);
    const [phoneFormOpen, setPhoneFormOpen] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const emailForm = useForm({ email: auth.user.email, current_password: '' });
    const phoneForm = useForm({ phone: auth.user.phone ?? '', current_password: '' });
    const { data, setData, errors, put, reset, processing } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put('/settings/password', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setPasswordFormOpen(false);
            },
            onError: (formErrors) => {
                if (formErrors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (formErrors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    const updateContact = (e: React.FormEvent, type: 'email' | 'phone') => {
        e.preventDefault();
        const form = type === 'email' ? emailForm : phoneForm;

        form.patch('/settings/contact', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                if (type === 'email') {
                    setEmailFormOpen(false);
                } else {
                    setPhoneFormOpen(false);
                }
            },
        });
    };

    return (
        <ManagementLayout title="Pengaturan">
            <SettingsLayout>
                <div className="space-y-5">
                    <div>
                        <h2 className="text-xl font-semibold text-stone-900">Keamanan Akun</h2>
                        <p className="mt-1 text-sm text-stone-500">Pastikan informasi akun dan kata sandi Anda selalu aman.</p>
                    </div>

                    <section className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="account-email">Email</Label>
                            <Input id="account-email" className="h-10 rounded-sm border-stone-300 bg-stone-50" value={auth.user.email} readOnly />
                            <Button
                                type="button"
                                variant="outline"
                                className="w-fit border-stone-300 bg-white text-stone-900 hover:bg-stone-50 hover:text-stone-900"
                                onClick={() => {
                                    emailForm.setData({ email: auth.user.email, current_password: '' });
                                    setEmailFormOpen((open) => !open);
                                }}
                            >
                                {emailFormOpen ? 'Batal' : 'Ubah Email'}
                            </Button>
                        </div>
                        {emailFormOpen && (
                            <form className="space-y-4 border-t border-stone-200 pt-4" onSubmit={(e) => updateContact(e, 'email')}>
                                <div className="grid gap-2">
                                    <Label htmlFor="new-email">Email Baru</Label>
                                    <Input
                                        id="new-email"
                                        type="email"
                                        className="h-10 rounded-sm border-stone-300"
                                        value={emailForm.data.email}
                                        onChange={(e) => emailForm.setData('email', e.target.value)}
                                        autoComplete="email"
                                        required
                                    />
                                    <InputError message={emailForm.errors.email} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email-current-password">Password Saat Ini</Label>
                                    <Input
                                        id="email-current-password"
                                        type="password"
                                        value={emailForm.data.current_password}
                                        onChange={(e) => emailForm.setData('current_password', e.target.value)}
                                        autoComplete="current-password"
                                        required
                                    />
                                    <InputError message={emailForm.errors.current_password} />
                                </div>
                                <Button className="bg-[#688463] text-white hover:bg-[#55714f]" disabled={emailForm.processing}>
                                    Simpan Email
                                </Button>
                            </form>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="account-phone">No Telepon</Label>
                            <Input
                                id="account-phone"
                                className="h-10 rounded-sm border-stone-300 bg-stone-50"
                                value={auth.user.phone ?? ''}
                                placeholder="Belum ditambahkan"
                                readOnly
                            />
                            <Button
                                type="button"
                                variant="outline"
                                className="w-fit border-stone-300 bg-white text-stone-900 hover:bg-stone-50 hover:text-stone-900"
                                onClick={() => {
                                    phoneForm.setData({ phone: auth.user.phone ?? '', current_password: '' });
                                    setPhoneFormOpen((open) => !open);
                                }}
                            >
                                {phoneFormOpen ? 'Batal' : auth.user.phone ? 'Ubah No Telepon' : 'Tambah No Telepon'}
                            </Button>
                        </div>
                        {phoneFormOpen && (
                            <form className="space-y-4 border-t border-stone-200 pt-4" onSubmit={(e) => updateContact(e, 'phone')}>
                                <div className="grid gap-2">
                                    <Label htmlFor="new-phone">No Telepon Baru</Label>
                                    <Input
                                        id="new-phone"
                                        type="tel"
                                        className="h-10 rounded-sm border-stone-300"
                                        value={phoneForm.data.phone}
                                        onChange={(e) => phoneForm.setData('phone', e.target.value)}
                                        autoComplete="tel"
                                        required
                                    />
                                    <InputError message={phoneForm.errors.phone} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone-current-password">Password Saat Ini</Label>
                                    <Input
                                        id="phone-current-password"
                                        type="password"
                                        value={phoneForm.data.current_password}
                                        onChange={(e) => phoneForm.setData('current_password', e.target.value)}
                                        autoComplete="current-password"
                                        required
                                    />
                                    <InputError message={phoneForm.errors.current_password} />
                                </div>
                                <Button className="bg-[#688463] text-white hover:bg-[#55714f]" disabled={phoneForm.processing}>
                                    Simpan No Telepon
                                </Button>
                            </form>
                        )}
                    </section>

                    <Button className="bg-[#688463] text-white hover:bg-[#55714f]" onClick={() => setPasswordFormOpen((open) => !open)} type="button">
                        {passwordFormOpen ? 'Batal' : 'Ganti Password'}
                    </Button>

                    {passwordFormOpen && (
                        <form className="space-y-4 border-t border-stone-200 pt-5" onSubmit={updatePassword}>
                            <div className="grid gap-2">
                                <Label htmlFor="current_password">Password Saat Ini</Label>
                                <Input
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    value={data.current_password}
                                    onChange={(e) => setData('current_password', e.target.value)}
                                    type="password"
                                    autoComplete="current-password"
                                />
                                <InputError message={errors.current_password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password Baru</Label>
                                <Input
                                    id="password"
                                    ref={passwordInput}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    type="password"
                                    autoComplete="new-password"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">Konfirmasi Password Baru</Label>
                                <Input
                                    id="password_confirmation"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    type="password"
                                    autoComplete="new-password"
                                />
                                <InputError message={errors.password_confirmation} />
                            </div>

                            <Button className="bg-[#688463] text-white hover:bg-[#55714f]" disabled={processing}>
                                Simpan Password
                            </Button>
                        </form>
                    )}
                </div>
            </SettingsLayout>
        </ManagementLayout>
    );
}
