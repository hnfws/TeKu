<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBankAccountRequest extends FormRequest
{
    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'account_holder' => ['required', 'string', 'max:255'],
            'account_number' => ['required', 'string', 'regex:/^[0-9 -]{5,34}$/'],
            'bank_name' => ['required', Rule::in(config('tekumodal.banks'))],
            'branch_name' => ['nullable', 'string', 'max:150'],
            'city' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function normalizedData(): array
    {
        $validated = $this->validated();
        $validated['account_number'] = preg_replace('/[\s-]/', '', $validated['account_number']);

        return $validated;
    }
}
