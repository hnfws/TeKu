import { Link, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import ManagementLayout from '@/layouts/management-layout';

type Product = {
    id: number;
    name: string;
    sku: string;
    category: string;
    description: string | null;
    unit: string;
    stock_quantity: number;
    min_stock: number;
    cost_price: number | string;
    selling_price: number | string;
    production_date: string | null;
    expiration_date: string | null;
    image_path: string | null;
    image_url: string | null;
};

interface InventoryFormProps {
    product?: Product;
}

type InventoryFormData = {
    name: string;
    sku: string;
    category: string;
    description: string;
    unit: string;
    stock_quantity: number | '';
    min_stock: number | '';
    cost_price: number | '';
    selling_price: number | '';
    production_date: string;
    expiration_date: string;
    image: File | null;
};

const fieldClass =
    'mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none transition focus:border-[#688463] focus:ring-2 focus:ring-[#688463]/20';

export default function InventoryForm({ product }: InventoryFormProps) {
    const editing = Boolean(product);
    const { data, setData, post, transform, processing, errors } = useForm<InventoryFormData>({
        name: product?.name ?? '',
        sku: product?.sku ?? '',
        category: product?.category ?? '',
        description: product?.description ?? '',
        unit: product?.unit ?? 'pcs',
        stock_quantity: product?.stock_quantity ?? 0,
        min_stock: product?.min_stock ?? 0,
        cost_price: product ? Number(product.cost_price) : 0,
        selling_price: product ? Number(product.selling_price) : 0,
        production_date: product?.production_date ?? '',
        expiration_date: product?.expiration_date ?? '',
        image: null as File | null,
    });
    const [preview, setPreview] = useState<string | null>(product?.image_url ?? null);
    const flash = usePage<{ flash?: { success?: string } }>().props.flash;

    useEffect(() => {
        if (!data.image) return;
        const url = URL.createObjectURL(data.image);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [data.image]);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (product) {
            transform((formData) => ({ ...formData, _method: 'put' }));
            post(`/inventory/${product.id}`, { forceFormData: true });
        } else {
            post('/inventory', { forceFormData: true });
        }
    };

    return (
        <ManagementLayout title={editing ? 'Edit Barang' : 'Tambah Barang'}>
            <div className="mx-auto max-w-6xl space-y-6">
                <header>
                    <Link className="text-sm font-semibold text-[#52704d] hover:underline" href="/inventory">
                        <i className="fa-solid fa-arrow-left mr-2" />
                        Persediaan
                    </Link>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900">{editing ? 'Edit Barang' : 'Tambah Barang'}</h1>
                    <p className="mt-1 text-sm text-stone-500">Lengkapi informasi produk dan stok barang.</p>
                </header>
                {flash?.success && (
                    <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                        {flash.success}
                    </div>
                )}
                <form className="grid items-start gap-6 lg:grid-cols-12" onSubmit={submit}>
                    <section className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm lg:col-span-4">
                        <h2 className="font-bold text-stone-900">Foto Barang</h2>
                        <p className="mt-1 text-xs text-stone-500">JPG, PNG, atau WEBP. Maksimal 5 MB.</p>
                        <label className="mt-4 flex min-h-64 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-stone-200 bg-[#faf9f6] text-center transition hover:border-[#688463]">
                            {preview ? (
                                <img alt="Pratinjau barang" className="h-64 w-full object-contain" src={preview} />
                            ) : (
                                <>
                                    <i className="fa-solid fa-cloud-arrow-up text-3xl text-[#688463]" />
                                    <span className="mt-3 text-sm font-semibold text-stone-700">Unggah foto barang</span>
                                    <span className="mt-1 text-xs text-stone-400">Klik untuk memilih gambar</span>
                                </>
                            )}
                            <input
                                accept="image/*"
                                className="sr-only"
                                onChange={(event) => setData('image', event.target.files?.[0] ?? null)}
                                type="file"
                            />
                        </label>
                        {errors.image && <p className="mt-2 text-sm text-red-600">{errors.image}</p>}
                    </section>

                    <section className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm lg:col-span-8">
                        <h2 className="mb-5 font-bold text-stone-900">Informasi Barang</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="text-sm font-medium text-stone-700 sm:col-span-2">
                                Nama Barang *
                                <input className={fieldClass} onChange={(event) => setData('name', event.target.value)} required value={data.name} />
                                {errors.name && <span className="mt-1 block text-xs text-red-600">{errors.name}</span>}
                            </label>
                            <label className="text-sm font-medium text-stone-700">
                                SKU *
                                <input className={fieldClass} onChange={(event) => setData('sku', event.target.value)} required value={data.sku} />
                                {errors.sku && <span className="mt-1 block text-xs text-red-600">{errors.sku}</span>}
                            </label>
                            <label className="text-sm font-medium text-stone-700">
                                Kategori *
                                <input
                                    className={fieldClass}
                                    onChange={(event) => setData('category', event.target.value)}
                                    placeholder="Contoh: Minuman"
                                    required
                                    value={data.category}
                                />
                                {errors.category && <span className="mt-1 block text-xs text-red-600">{errors.category}</span>}
                            </label>
                            <label className="text-sm font-medium text-stone-700">
                                Harga Modal *
                                <input
                                    className={fieldClass}
                                    min="0"
                                    onChange={(event) => setData('cost_price', event.target.value === '' ? '' : Number(event.target.value))}
                                    required
                                    type="number"
                                    value={data.cost_price}
                                />
                                {errors.cost_price && <span className="mt-1 block text-xs text-red-600">{errors.cost_price}</span>}
                            </label>
                            <label className="text-sm font-medium text-stone-700">
                                Harga Jual *
                                <input
                                    className={fieldClass}
                                    min="0"
                                    onChange={(event) => setData('selling_price', event.target.value === '' ? '' : Number(event.target.value))}
                                    required
                                    type="number"
                                    value={data.selling_price}
                                />
                                {errors.selling_price && <span className="mt-1 block text-xs text-red-600">{errors.selling_price}</span>}
                            </label>
                            <label className="text-sm font-medium text-stone-700">
                                Jumlah Stok *
                                <input
                                    className={fieldClass}
                                    min="0"
                                    onChange={(event) => setData('stock_quantity', event.target.value === '' ? '' : Number(event.target.value))}
                                    required
                                    type="number"
                                    value={data.stock_quantity}
                                />
                                {errors.stock_quantity && <span className="mt-1 block text-xs text-red-600">{errors.stock_quantity}</span>}
                            </label>
                            <label className="text-sm font-medium text-stone-700">
                                Stok Minimum *
                                <input
                                    className={fieldClass}
                                    min="0"
                                    onChange={(event) => setData('min_stock', event.target.value === '' ? '' : Number(event.target.value))}
                                    required
                                    type="number"
                                    value={data.min_stock}
                                />
                                {errors.min_stock && <span className="mt-1 block text-xs text-red-600">{errors.min_stock}</span>}
                            </label>
                            <label className="text-sm font-medium text-stone-700">
                                Satuan *
                                <input className={fieldClass} onChange={(event) => setData('unit', event.target.value)} required value={data.unit} />
                                {errors.unit && <span className="mt-1 block text-xs text-red-600">{errors.unit}</span>}
                            </label>
                            <label className="text-sm font-medium text-stone-700">
                                Tanggal Produksi
                                <input
                                    className={fieldClass}
                                    onChange={(event) => setData('production_date', event.target.value)}
                                    type="date"
                                    value={data.production_date ?? ''}
                                />
                                {errors.production_date && <span className="mt-1 block text-xs text-red-600">{errors.production_date}</span>}
                            </label>
                            <label className="text-sm font-medium text-stone-700">
                                Tanggal Kedaluwarsa
                                <input
                                    className={fieldClass}
                                    onChange={(event) => setData('expiration_date', event.target.value)}
                                    type="date"
                                    value={data.expiration_date ?? ''}
                                />
                                {errors.expiration_date && <span className="mt-1 block text-xs text-red-600">{errors.expiration_date}</span>}
                            </label>
                            <label className="text-sm font-medium text-stone-700 sm:col-span-2">
                                Deskripsi
                                <textarea
                                    className={fieldClass}
                                    onChange={(event) => setData('description', event.target.value)}
                                    rows={4}
                                    value={data.description}
                                />
                                {errors.description && <span className="mt-1 block text-xs text-red-600">{errors.description}</span>}
                            </label>
                        </div>
                        <div className="mt-6 flex flex-col-reverse justify-end gap-3 border-t border-stone-100 pt-5 sm:flex-row">
                            <Link
                                className="rounded-lg border border-stone-300 px-5 py-2.5 text-center text-sm font-semibold text-stone-700 hover:bg-stone-50"
                                href="/inventory"
                            >
                                Batal
                            </Link>
                            <button
                                className="rounded-lg bg-[#3e5638] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#33472e] disabled:opacity-50"
                                disabled={processing}
                                type="submit"
                            >
                                {processing ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Simpan Barang'}
                            </button>
                        </div>
                    </section>
                </form>
            </div>
        </ManagementLayout>
    );
}
