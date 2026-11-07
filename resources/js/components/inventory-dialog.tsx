import { useForm } from '@inertiajs/react';
type Product = { id: number; name: string; stock_quantity: number; unit: string };

interface InventoryDialogProps {
    product: Product | null;
    mode: 'stock' | 'delete' | null;
    onClose: () => void;
}

export default function InventoryDialog({ product, mode, onClose }: InventoryDialogProps) {
    const stockForm = useForm({ quantity: product?.stock_quantity ?? 0 });
    const deleteForm = useForm({});

    if (!product || !mode) return null;

    const close = () => {
        if (stockForm.processing || deleteForm.processing) return;
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4" onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
        }}>
            <section aria-labelledby="inventory-dialog-title" aria-modal="true" className="relative w-full max-w-[476px] rounded-[22px] border border-amber-900/5 bg-[#F8F2E8] p-7 shadow-sm transition-all hover:shadow-md md:p-9" role="dialog">
                <button aria-label="Tutup dialog" className="absolute right-3 top-3 rounded-md p-1 text-stone-500 hover:bg-black/5" onClick={close} type="button"><i className="fa-solid fa-xmark" /></button>

                {mode === 'stock' ? (
                    <form className="flex min-h-[261px] flex-col justify-between" onSubmit={(event) => {
                        event.preventDefault();
                        stockForm.transform((data) => ({ quantity: data.quantity - product.stock_quantity }));
                        stockForm.post(`/inventory/${product.id}/stock`, { onSuccess: onClose });
                    }}>
                        <div>
                            <h2 className="mb-6 text-xl font-black leading-none tracking-tight text-black" id="inventory-dialog-title">Atur Stok</h2>
                            <p className="mb-2 text-sm text-neutral-600">{product.name} · Stok saat ini: {product.stock_quantity} {product.unit}</p>
                            <div className="relative mb-6">
                                <label className="sr-only" htmlFor="stock-delta">Jumlah Stok</label>
                                <input autoFocus className="h-[58px] w-full rounded-2xl border-0 bg-white px-5 pr-14 text-xl font-medium text-black shadow-none focus:outline-none focus:ring-2 focus:ring-[#6C8365]" id="stock-delta" min="0" onChange={(event) => stockForm.setData('quantity', Math.max(0, Number(event.target.value)))} type="number" value={stockForm.data.quantity} />
                                <div className="absolute inset-y-0 right-4 flex flex-col items-center justify-center gap-1">
                                    <button aria-label="Tambah Stok" className="px-1 py-0.5 text-xs font-black leading-none text-black transition-transform hover:text-[#6C8365] active:scale-95" onClick={() => stockForm.setData('quantity', stockForm.data.quantity + 1)} type="button">^</button>
                                    <button aria-label="Kurangi Stok" className="px-1 py-0.5 text-xs font-black leading-none text-black transition-transform hover:text-[#6C8365] active:scale-95" onClick={() => stockForm.setData('quantity', Math.max(0, stockForm.data.quantity - 1))} type="button">v</button>
                                </div>
                            </div>
                        </div>
                        {stockForm.errors.quantity && <p className="text-sm text-red-600">{stockForm.errors.quantity}</p>}
                        <button className="h-[52px] w-full rounded-2xl bg-[#6C8365] text-lg font-bold text-white shadow-none transition-colors hover:bg-[#5D7356] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#6C8365] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={stockForm.processing || stockForm.data.quantity === product.stock_quantity} type="submit">{stockForm.processing ? 'Menyimpan...' : 'Simpan'}</button>
                    </form>
                ) : (
                    <div className="flex min-h-[275px] flex-col justify-between">
                        <div>
                            <h2 className="mb-3 text-xl font-black leading-none tracking-tight text-black" id="inventory-dialog-title">Peringatan</h2>
                            <p className="mb-3 text-sm text-neutral-600">{product.name}</p>
                            <p className="px-3 text-[17px] leading-snug tracking-tight text-black md:px-5">Setelah terhapus, barang tidak akan dapat di pulihkan. Anda harus memasukkan kembali barang.</p>
                            <p className="my-3 text-center text-[19px] font-extrabold tracking-tight text-black">Yakin hapus barang ini ?</p>
                        </div>
                        {Object.values(deleteForm.errors).filter((error): error is string => typeof error === 'string').map((error) => <p key={error} className="mt-2 text-sm text-red-600">{error}</p>)}
                        <div className="grid grid-cols-2 gap-4 pt-1 md:gap-8">
                            <button className="h-[50px] w-full rounded-2xl bg-[#6C8365] text-lg font-bold text-white transition-colors hover:bg-[#5D7356] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#6C8365] focus:ring-offset-2 disabled:opacity-50" disabled={deleteForm.processing} onClick={() => deleteForm.delete(`/inventory/${product.id}`, { onSuccess: onClose })} type="button">{deleteForm.processing ? 'Menghapus...' : 'Ya'}</button>
                            <button className="h-[50px] w-full rounded-2xl bg-[#D65353] text-lg font-bold text-white transition-colors hover:bg-[#C04343] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#D65353] focus:ring-offset-2" disabled={deleteForm.processing} onClick={close} type="button">Tidak</button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
