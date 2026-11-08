import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

type Product = {
    id: number;
    name: string;
    sku: string;
    category: string;
    stock_quantity: number;
    unit: string;
    selling_price: number | string;
    image_path: string | null;
};
type CheckoutPayload = {
    items: { product_id: number; quantity: number }[];
    customer_name: string;
    payment_method: 'cash' | 'qris' | 'debit';
    promo_code: string | null;
    notes: string;
};

interface PosProps {
    products: Product[];
    customerName: string;
    promotionsAvailable: boolean;
}

const money = (value: number) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
}).format(value);

function xsrfToken(): string {
    const cookie = document.cookie.split('; ').find((value) => value.startsWith('XSRF-TOKEN='));
    return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : '';
}

export default function Pos({ products, customerName, promotionsAvailable }: PosProps) {
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [paymentMethod, setPaymentMethod] = useState<CheckoutPayload['payment_method']>('cash');
    const [customer, setCustomer] = useState('');
    const [notes, setNotes] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
    const [promoMessage, setPromoMessage] = useState('');
    const [promoBusy, setPromoBusy] = useState(false);
    const [checkoutBusy, setCheckoutBusy] = useState(false);
    const [clock, setClock] = useState(new Date());
    const page = usePage<{ errors: Record<string, string>; flash?: { error?: string } }>();
    const cart = useMemo(() => products
        .filter((product) => (quantities[product.id] ?? 0) > 0)
        .map((product) => ({ product, quantity: quantities[product.id] })), [products, quantities]);
    const subtotal = cart.reduce((total, item) => total + Number(item.product.selling_price) * item.quantity, 0);
    const discount = appliedPromo?.discount ?? 0;
    const total = Math.max(0, subtotal - discount);

    useEffect(() => {
        const timer = window.setInterval(() => setClock(new Date()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const setQuantity = (product: Product, quantity: number) => {
        setAppliedPromo(null);
        setPromoMessage('');
        setQuantities((current) => {
            const next = { ...current };
            const nextQuantity = Math.max(0, Math.min(product.stock_quantity, quantity));
            if (nextQuantity === 0) delete next[product.id];
            else next[product.id] = nextQuantity;
            return next;
        });
    };

    const applyPromo = async () => {
        setPromoBusy(true);
        setPromoMessage('');
        setAppliedPromo(null);

        try {
            const token = xsrfToken();
            if (!token) throw new Error('Token keamanan tidak ditemukan. Muat ulang halaman lalu coba kembali.');
            const response = await fetch('/sales/promotion', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': token,
                },
                body: JSON.stringify({
                    code: promoCode,
                    items: cart.map(({ product, quantity }) => ({ product_id: product.id, quantity })),
                }),
            });
            const result = await response.json() as { code?: string; discount?: number; errors?: { code?: string[]; items?: string[] }; message?: string };
            if (!response.ok) throw new Error(result.errors?.code?.[0] ?? result.errors?.items?.[0] ?? result.message ?? 'Kode promo tidak dapat digunakan.');
            setAppliedPromo({ code: result.code ?? promoCode, discount: Number(result.discount ?? 0) });
            setPromoMessage('Potongan berhasil dipakai!');
        } catch (error) {
            setPromoMessage(error instanceof Error ? error.message : 'Kode promo tidak dapat digunakan.');
        } finally {
            setPromoBusy(false);
        }
    };

    const submitSale = () => {
        if (cart.length === 0 || checkoutBusy) return;
        const payload: CheckoutPayload = {
            items: cart.map(({ product, quantity }) => ({ product_id: product.id, quantity })),
            customer_name: customer.trim(),
            payment_method: paymentMethod,
            promo_code: appliedPromo?.code ?? null,
            notes: notes.trim(),
        };
        router.post('/sales', payload, {
            onStart: () => setCheckoutBusy(true),
            onFinish: () => setCheckoutBusy(false),
        });
    };

    return (
        <div className="flex min-h-screen flex-col overflow-hidden bg-[#f8f2e9] font-sans text-[#1a1a1a] antialiased md:h-screen md:flex-row">
            <aside className="flex w-full shrink-0 flex-col justify-between border-b border-[#e2d8c7] bg-[#f2ebe0] md:w-[240px] md:border-b-0 md:border-r">
                <div>
                    <div className="flex items-center justify-center border-b border-[#e2d8c7] p-5">
                        <div className="flex h-16 w-full items-center justify-center rounded bg-[#cfd4d9] text-xl font-bold tracking-wider text-neutral-800 shadow-inner">Logo</div>
                    </div>
                    <nav aria-label="Menu penjualan" className="flex border-b border-[#e2d8c7] md:block">
                        <Link className="flex flex-1 items-center gap-3 border-b-2 border-[#658364] bg-[#e9e1d3] px-5 py-4 text-base font-bold text-neutral-900 md:text-xl" href="/sales/pos">
                            <i className="fa-solid fa-utensils w-7 text-center text-[#5e7e5d]" />Menu
                        </Link>
                        <Link className="flex flex-1 items-center gap-3 px-5 py-4 text-sm font-bold text-neutral-900 transition hover:bg-[#e9e1d3] md:text-xl" href="/sales/report">
                            <i className="fa-regular fa-file-lines w-7 text-center text-[#5e7e5d]" />Laporan
                        </Link>
                    </nav>
                    <section className="space-y-2 border-b border-[#e2d8c7] p-4">
                        <label className="block text-sm font-bold text-neutral-900" htmlFor="promo-code">Masukkan Kode Promo</label>
                        <input
                            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-center text-sm font-bold text-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#658364]/30"
                            disabled={!promotionsAvailable || promoBusy}
                            id="promo-code"
                            onChange={(event) => {
                                setPromoCode(event.target.value);
                                setAppliedPromo(null);
                                setPromoMessage('');
                            }}
                            placeholder="Kode promo"
                            value={promoCode}
                        />
                        {promoMessage && <p className={`text-center text-[11px] font-semibold ${appliedPromo ? 'text-[#5a7b59]' : 'text-red-700'}`} role="status">{promoMessage}</p>}
                        {!promotionsAvailable && <p className="text-center text-[11px] text-neutral-500">Belum ada promo aktif.</p>}
                        <button className="mx-auto mt-1 block w-3/4 rounded-lg bg-[#658364] px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-[#557054] disabled:opacity-50" disabled={!promotionsAvailable || promoBusy || cart.length === 0 || !promoCode.trim()} onClick={applyPromo} type="button">
                            {promoBusy ? 'Memeriksa...' : 'Konfirmasi'}
                        </button>
                    </section>
                    <section className="flex flex-col border-b border-[#e2d8c7] px-4 py-3">
                        <label className="text-xs font-bold text-neutral-800" htmlFor="customer-name">Nama Pelanggan</label>
                        <input className="mt-1 rounded border-0 bg-transparent px-0 py-1 text-xs font-medium text-neutral-900 focus:ring-1 focus:ring-[#658364]" id="customer-name" onChange={(event) => setCustomer(event.target.value)} placeholder={customerName} value={customer} />
                    </section>
                </div>
                <Link className="flex items-center gap-3 border-t border-[#e2d8c7] bg-[#f2ebe0] p-4 text-sm font-bold text-neutral-900 transition hover:bg-[#e9e1d3]" href="/sales">
                    <i className="fa-solid fa-arrow-right-from-bracket w-7 text-center text-[#5e7e5d]" />
                    <span className="leading-tight">Menu Penjualan</span>
                </Link>
            </aside>

            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#f8f2e9] px-4 py-6 sm:px-7 lg:px-10" data-purpose="product-catalog">
                <div className="mx-auto w-full max-w-4xl">
                    <header className="mb-6 border-b border-[#e2d8c7] pb-3">
                        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">Pilihan Menu</h1>
                        <p className="mt-1 text-xs font-semibold capitalize text-neutral-800">{clock.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                    </header>
                    {page.props.flash?.error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{page.props.flash.error}</p>}
                    {page.props.errors.items && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{page.props.errors.items}</p>}

                    {products.length ? (
                        <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-4 sm:gap-8">
                            {products.map((product) => {
                                const quantity = quantities[product.id] ?? 0;
                                return (
                                    <article className="flex flex-col items-center rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4" key={product.id}>
                                        <div className="mb-3 aspect-square w-full overflow-hidden rounded-lg bg-[#ece7de]">
                                            {product.image_path
                                                ? <img alt={product.name} className="h-full w-full rounded object-cover" src={`/storage/${product.image_path}`} />
                                                : <div className="flex h-full flex-col items-center justify-center gap-2 text-[#879281]"><i className="fa-solid fa-utensils text-3xl" /><span className="px-2 text-center text-xs">{product.category}</span></div>}
                                        </div>
                                        <h2 className="mb-1 line-clamp-2 text-center text-sm font-bold text-neutral-900">{product.name}</h2>
                                        <p className="mb-2 text-xs font-semibold text-neutral-700">{money(Number(product.selling_price))}</p>
                                        <p className="mb-2 text-[10px] text-neutral-500">Stok {product.stock_quantity} {product.unit}</p>
                                        <div className="flex items-center space-x-1.5">
                                            <button aria-label={`Kurangi ${product.name}`} className="flex h-7 w-7 items-center justify-center rounded bg-[#dfdfdf] text-xs font-bold text-neutral-700 shadow-sm hover:bg-neutral-300 disabled:opacity-40" disabled={quantity === 0} onClick={() => setQuantity(product, quantity - 1)} type="button">-</button>
                                            <span aria-live="polite" className="min-w-[44px] rounded bg-[#dfdfdf] px-4 py-1 text-center text-xs font-semibold text-neutral-800">{quantity}</span>
                                            <button aria-label={`Tambah ${product.name}`} className="flex h-7 w-7 items-center justify-center rounded bg-[#dfdfdf] text-xs font-bold text-neutral-700 shadow-sm hover:bg-neutral-300 disabled:opacity-40" disabled={quantity >= product.stock_quantity} onClick={() => setQuantity(product, quantity + 1)} type="button">+</button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="mx-auto max-w-2xl rounded-xl border border-dashed border-[#d4cabb] bg-white/70 p-10 text-center">
                            <i className="fa-solid fa-box-open text-3xl text-[#9a9a8f]" />
                            <p className="mt-3 font-semibold text-neutral-800">Belum ada produk dengan stok tersedia</p>
                            <Link className="mt-2 inline-block text-sm font-semibold text-[#557054] hover:underline" href="/inventory/create">Tambahkan produk persediaan</Link>
                        </div>
                    )}
                    <section className="mx-auto mt-8 w-full max-w-2xl" data-purpose="order-notes">
                        <label className="mb-2 block text-sm font-bold text-neutral-900" htmlFor="buyer-note">Catatan Pembeli</label>
                        <textarea className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-neutral-400" id="buyer-note" onChange={(event) => setNotes(event.target.value)} placeholder="Ketik disini" rows={3} value={notes} />
                    </section>
                </div>
            </main>

            <aside className="flex max-h-[85vh] w-full shrink-0 flex-col border-t border-[#e2d8c7] bg-[#f2ebe0] md:max-h-none md:w-[360px] md:border-l md:border-t-0" data-purpose="cart-panel">
                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="flex items-center gap-3 border-b border-[#e2d8c7] px-5 py-4">
                        <i className="fa-solid fa-bag-shopping text-xl text-[#5e7e5d]" />
                        <h2 className="text-xl font-extrabold text-neutral-900">Detail Pemesanan</h2>
                    </div>
                    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                        {cart.map(({ product, quantity }) => (
                            <article className="flex flex-col space-y-2 border-b border-[#e2d8c7]/60 pb-3" key={product.id}>
                                <div className="flex gap-3">
                                    <div className="h-16 w-20 shrink-0 overflow-hidden rounded-md border border-neutral-300 bg-[#e5ded2]">
                                        {product.image_path
                                            ? <img alt="" className="h-full w-full object-cover" src={`/storage/${product.image_path}`} />
                                            : <div className="flex h-full items-center justify-center text-[#879281]"><i className="fa-solid fa-utensils" /></div>}
                                    </div>
                                    <div className="flex-1 text-xs">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-bold text-neutral-900">{product.name}</h3>
                                            <span className="shrink-0 font-bold text-neutral-900">{quantity}x</span>
                                        </div>
                                        <p className="mt-1 text-[10px] leading-tight text-neutral-600">{product.category}</p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <button aria-label={`Kurangi ${product.name}`} className="flex h-6 w-6 items-center justify-center rounded bg-white text-neutral-700 hover:bg-neutral-100" onClick={() => setQuantity(product, quantity - 1)} type="button">-</button>
                                            <button aria-label={`Tambah ${product.name}`} className="flex h-6 w-6 items-center justify-center rounded bg-white text-neutral-700 hover:bg-neutral-100" disabled={quantity >= product.stock_quantity} onClick={() => setQuantity(product, quantity + 1)} type="button">+</button>
                                            <button className="ml-auto text-[10px] font-semibold text-red-700 hover:underline" onClick={() => setQuantity(product, 0)} type="button">Hapus</button>
                                        </div>
                                    </div>
                                </div>
                                <p className="pl-1 text-xs font-semibold text-neutral-900">{money(Number(product.selling_price) * quantity)}</p>
                            </article>
                        ))}
                        {!cart.length && <div className="py-12 text-center text-sm text-neutral-500"><i className="fa-solid fa-basket-shopping text-2xl text-neutral-300" /><p className="mt-3 font-medium">Pilih menu untuk mulai memesan.</p></div>}
                    </div>
                </div>
                <section className="flex flex-col space-y-3 border-t border-[#e2d8c7] bg-[#f2ebe0] px-5 py-4" data-purpose="checkout-summary">
                    <div className="flex items-center justify-between border-b border-neutral-800/30 pb-2 text-sm font-bold text-neutral-900">
                        <span>Total</span><span className="text-base tracking-wide">{money(total)}</span>
                    </div>
                    {discount > 0 && <p className="flex justify-between text-xs text-[#557054]"><span>Potongan promo</span><span>-{money(discount)}</span></p>}
                    <div>
                        <span className="mb-2 block text-xs font-bold text-neutral-900">Metode Pembayaran</span>
                        <div className="grid grid-cols-3 gap-2">
                            {([
                                ['cash', 'Tunai'],
                                ['qris', 'QRIS'],
                                ['debit', 'Debit'],
                            ] as const).map(([method, label]) => (
                                <button aria-pressed={paymentMethod === method} className={`rounded px-2 py-1.5 text-xs font-semibold shadow-sm ${paymentMethod === method ? 'bg-[#658364] text-white' : 'border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'}`} key={method} onClick={() => setPaymentMethod(method)} type="button">{label}</button>
                            ))}
                        </div>
                    </div>
                    <button className="mt-1 w-full rounded-xl bg-[#658364] py-2.5 text-sm font-bold tracking-wide text-white shadow transition hover:bg-[#557054] disabled:cursor-not-allowed disabled:opacity-50" disabled={!cart.length || checkoutBusy} onClick={submitSale} type="button">
                        {checkoutBusy ? 'Menyimpan...' : 'Pesan'}
                    </button>
                    {page.props.errors.payment_method && <p className="text-xs text-red-700" role="alert">{page.props.errors.payment_method}</p>}
                </section>
            </aside>
        </div>
    );
}
