<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreBankAccountRequest;
use App\Models\BankAccount;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BankAccountController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('settings/bank-accounts', [
            'bankAccounts' => $request->user()->bankAccounts()
                ->latest()
                ->get(['id', 'account_holder', 'account_number', 'bank_name'])
                ->map(fn (BankAccount $account) => [
                    'id' => $account->id,
                    'account_holder' => $account->account_holder,
                    'account_number' => $account->account_number,
                    'bank_name' => $account->bank_name,
                ]),
            'banks' => config('tekumodal.banks'),
        ]);
    }

    public function store(StoreBankAccountRequest $request): RedirectResponse
    {
        $request->user()->bankAccounts()->create($request->normalizedData());

        return to_route('settings.bank-accounts.index')
            ->with('success', 'Rekening bank berhasil disimpan secara terenkripsi.');
    }

    public function destroy(Request $request, BankAccount $bankAccount): RedirectResponse
    {
        abort_unless($bankAccount->user_id === $request->user()->id, 404);

        if ($bankAccount->loanApplications()->exists()) {
            return back()->withErrors([
                'bank_account' => 'Rekening tidak dapat dihapus karena masih digunakan pada pinjaman.',
            ]);
        }

        $bankAccount->delete();

        return to_route('settings.bank-accounts.index')
            ->with('success', 'Rekening bank berhasil dihapus.');
    }
}
