import AppearanceTabs from '@/components/appearance-tabs';
import ManagementLayout from '@/layouts/management-layout';
import SettingsLayout from '@/layouts/settings/layout';

export default function Appearance() {
    return (
        <ManagementLayout title="Pengaturan">
            <SettingsLayout>
                <div className="space-y-5">
                    <div>
                        <h2 className="text-xl font-semibold text-stone-900">Tampilan</h2>
                        <p className="mt-1 text-sm text-stone-500">Atur tampilan aplikasi sesuai preferensi Anda.</p>
                    </div>
                    <AppearanceTabs />
                </div>
            </SettingsLayout>
        </ManagementLayout>
    );
}
