<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Minishlink\WebPush\VAPID;
use Symfony\Component\Process\Process;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('tenants:send-reminders')->everyMinute()->withoutOverlapping();

Artisan::command('webpush:keys', function () {
    $opensslConfig = getenv('OPENSSL_CONF');
    $phpIni = php_ini_loaded_file();
    $bundledOpenSslConfig = $phpIni
        ? dirname($phpIni).DIRECTORY_SEPARATOR.'extras'.DIRECTORY_SEPARATOR.'ssl'.DIRECTORY_SEPARATOR.'openssl.cnf'
        : null;

    if ((! $opensslConfig || ! is_file($opensslConfig))
        && PHP_OS_FAMILY === 'Windows'
        && $bundledOpenSslConfig
        && is_file($bundledOpenSslConfig)) {
        $process = new Process(
            [PHP_BINARY, base_path('artisan'), 'webpush:keys'],
            base_path(),
            ['OPENSSL_CONF' => $bundledOpenSslConfig],
        );
        $process->run();
        $this->output->write($process->getOutput());

        if (! $process->isSuccessful()) {
            $this->error($process->getErrorOutput());

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    $keys = VAPID::createVapidKeys();
    $this->line('VAPID_PUBLIC_KEY='.$keys['publicKey']);
    $this->line('VAPID_PRIVATE_KEY='.$keys['privateKey']);
    $this->line('VAPID_SUBJECT=mailto:admin@example.com');
})->purpose('Generate VAPID keys for tenant browser reminders');
