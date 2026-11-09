import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ManagementLayout from '@/layouts/management-layout';
import SettingsLayout from '@/layouts/settings/layout';

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<{
        auth: {
            user: {
                name: string;
                email: string;
                phone?: string | null;
                business_name?: string | null;
                business_type?: string | null;
                address?: string | null;
                email_verified_at: string | null;
            };
        };
    }>().props;
    type ProfileField = 'name' | 'business_name' | 'business_type' | 'address';
    const [editingFields, setEditingFields] = useState<ProfileField[]>([]);

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: auth.user.name,
        business_name: auth.user.business_name ?? '',
        business_type: auth.user.business_type ?? '',
        address: auth.user.address ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch('/settings/profile', {
            preserveScroll: true,
            onSuccess: () => setEditingFields([]),
        });
    };

    return (
        <ManagementLayout title="Pengaturan">
            <SettingsLayout>
                <div className="space-y-5">
                    <div>
                        <h2 className="text-xl font-semibold text-stone-900">Profil</h2>
                        <p className="mt-1 text-sm text-stone-500">Kelola informasi profil akun Anda.</p>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        {[
                            { key: 'name', label: 'Nama Pengguna', placeholder: 'Masukkan nama pengguna' },
                            { key: 'business_name', label: 'Nama Usaha', placeholder: 'Tambahkan nama usaha' },
                            { key: 'business_type', label: 'Jenis Usaha', placeholder: 'Tambahkan jenis usaha' },
                            { key: 'address', label: 'Alamat', placeholder: 'Tambahkan alamat usaha' },
                        ].map(({ key, label, placeholder }) => {
                            const field = key as ProfileField;
                            const isEditing = editingFields.includes(field);

                            return (
                                <div className="grid gap-2" key={field}>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor={field}>{label}</Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-stone-500 hover:text-stone-900"
                                            aria-label={`${isEditing ? 'Selesai mengedit' : 'Edit'} ${label}`}
                                            title={`Edit ${label}`}
                                            onClick={() =>
                                                setEditingFields((fields) =>
                                                    isEditing ? fields.filter((item) => item !== field) : [...fields, field],
                                                )
                                            }
                                        >
                                            <Pencil aria-hidden="true" />
                                        </Button>
                                    </div>
                                    <Input
                                        id={field}
                                        className="h-10 rounded-sm border-stone-300 disabled:bg-stone-50"
                                        value={data[field]}
                                        onChange={(e) => setData(field, e.target.value)}
                                        disabled={!isEditing}
                                        required={field === 'name'}
                                        placeholder={placeholder}
                                        autoComplete={field === 'name' ? 'name' : undefined}
                                    />
                                    <InputError message={errors[field]} />
                                </div>
                            );
                        })}

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                className="h-10 rounded-sm border-stone-300 bg-stone-50"
                                value={auth.user.email}
                                readOnly
                                autoComplete="username"
                            />
                            <p className="text-xs text-stone-500">Email hanya dapat diubah di Keamanan Akun.</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phone">No Telepon</Label>
                            <Input
                                id="phone"
                                className="h-10 rounded-sm border-stone-300 bg-stone-50"
                                value={auth.user.phone ?? ''}
                                placeholder="Belum ditambahkan"
                                readOnly
                            />
                            <p className="text-xs text-stone-500">Nomor telepon hanya dapat diubah di Keamanan Akun.</p>
                        </div>

                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <div className="text-sm text-stone-600">
                                Email belum diverifikasi.{' '}
                                <Link
                                    className="font-medium text-[#55714f] underline underline-offset-2"
                                    href={route('verification.send')}
                                    method="post"
                                    as="button"
                                >
                                    Kirim ulang tautan verifikasi
                                </Link>
                                {status === 'verification-link-sent' && (
                                    <p className="mt-1 font-medium text-[#688463]">Tautan verifikasi telah dikirim.</p>
                                )}
                            </div>
                        )}

                        {editingFields.length > 0 && (
                            <div className="flex items-center gap-4 pt-1">
                                <Button className="bg-[#688463] text-white hover:bg-[#55714f]" disabled={processing}>
                                    Simpan Perubahan
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={processing}
                                    onClick={() => {
                                        setData({
                                            name: auth.user.name,
                                            business_name: auth.user.business_name ?? '',
                                            business_type: auth.user.business_type ?? '',
                                            address: auth.user.address ?? '',
                                        });
                                        setEditingFields([]);
                                    }}
                                >
                                    Batal
                                </Button>

                                <Transition
                                    show={recentlySuccessful}
                                    enter="transition ease-in-out"
                                    enterFrom="opacity-0"
                                    leave="transition ease-in-out"
                                    leaveTo="opacity-0"
                                >
                                    <p className="text-sm text-[#688463]">Tersimpan</p>
                                </Transition>
                            </div>
                        )}
                    </form>
                </div>

                <div className="mt-12 border-t border-stone-200 pt-8">
                    <DeleteUser />
                </div>
            </SettingsLayout>
        </ManagementLayout>
    );
}
